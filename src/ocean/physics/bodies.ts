/**
 * Rigid bodies floating on the combined water surface.
 *
 * Buoyancy uses vertical columns over the body footprint — the same model as
 * the GPU capacity-field source — so the water a hull pushes aside and the
 * force it feels come from one geometry. Drag is taken relative to the water's
 * orbital velocity (spectral mirror), which is what makes a hull surge, heave,
 * pitch and roll with the sea instead of merely bobbing.
 */
import {
  quatMul, quatNormalize, quatRotate, quatConj, quatFromAxisAngle, type Quat, type Vec3,
} from '../math/mat4';
import { G, clamp } from '../math/scalar';
import {
  hullBottomLocal, hullDeckLocal, hullHalfBeam, shapeVolume, shapeHalfExtents, type BodyShape,
} from './hull';

export const RHO_WATER = 1025;

export interface WaterSample {
  height: number;
  vx: number; vy: number; vz: number;
  normal: [number, number, number];
}

export interface WaterQuery {
  sample(x: number, z: number): WaterSample;
}

export interface Column {
  local: Vec3;      // (u, 0, w) column centre in body frame
  area: number;     // m²
  bottom: number;   // local y of hull skin
  top: number;      // local y of deck / top
}

export interface Autopilot {
  mode: 'circle' | 'line' | 'none';
  center: [number, number];
  radius: number;
  speed: number;    // target m/s
  clockwise: boolean;
}

/**
 * Kinematic script — the pool's hand-driven sphere: the body follows a prescribed
 * path and the water reacts (capacity source, splash), with no buoyancy feedback.
 *   tow    constant speed through the surface (bow wave, Kelvin wake)
 *   bob    vertical oscillation at the waterline (ring waves)
 *   plunge rest → pushed under → held → yanked out (crown, sheet and drain on exit)
 */
export interface BodyScript {
  kind: 'tow' | 'bob' | 'plunge';
  origin: Vec3;
  dir: [number, number];
  speed: number;
  amp: number;
  period: number;
}

const ease = (x: number) => { const t = Math.min(Math.max(x, 0), 1); return t * t * (3 - 2 * t); };

/** Scripted position and velocity at body age t (velocity by central difference). */
export function scriptPose(s: BodyScript, t: number): { pos: Vec3; vel: Vec3 } {
  const at = (u: number): Vec3 => {
    const o = s.origin;
    if (s.kind === 'tow') return [o[0] + s.dir[0] * s.speed * u, o[1], o[2] + s.dir[1] * s.speed * u];
    if (s.kind === 'bob') return [o[0], o[1] + s.amp * Math.sin((2 * Math.PI * u) / s.period), o[2]];
    // plunge: 1 s at rest, down over 0.3·P, hold 0.3·P, pulled out over 0.3·P to well above
    // the surface (a hand's pull: ~5 m/s at the waterline for the lab's 2.5 s period)
    const P = s.period;
    let y = o[1];
    if (u > 1) y -= s.amp * ease((u - 1) / (0.3 * P));
    const out = 1 + 0.6 * P;
    if (u > out) y += (s.amp * 2.4) * ease((u - out) / (0.3 * P));
    return [o[0], y, o[2]];
  };
  const e = 1 / 240;
  const a = at(t - e), b = at(t + e);
  return { pos: at(t), vel: [(b[0] - a[0]) / (2 * e), (b[1] - a[1]) / (2 * e), (b[2] - a[2]) / (2 * e)] };
}

export interface Body {
  id: number;
  label: string;
  shape: BodyShape;
  density: number;
  mass: number;
  inertia: Vec3;     // principal moments (local)
  pos: Vec3;
  vel: Vec3;
  rot: Quat;
  angVel: Vec3;      // world
  columns: Column[];
  autopilot: Autopilot | null;
  thrust: number;    // N (current)
  rudder: number;    // rad
  age: number;
  /** Last-frame submerged volume and relative speed at the waterline (for splash emitters). */
  submerged: number;
  immersion: number; // 0..1
  entrySpeed: number;
  color: Vec3;
  alive: boolean;
  fixed: boolean;
  /** Kinematic script (null = free rigid body). */
  script: BodyScript | null;
}

let nextId = 1;

function buildColumns(shape: BodyShape): Column[] {
  const cols: Column[] = [];
  if (shape.kind === 'sphere') {
    const r = shape.radius ?? 1;
    const n = 5;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const u = -r + ((i + 0.5) * 2 * r) / n, w = -r + ((j + 0.5) * 2 * r) / n;
        const q = r * r - u * u - w * w;
        if (q <= 0) continue;
        const h = Math.sqrt(q);
        cols.push({ local: [u, 0, w], area: ((2 * r) / n) ** 2, bottom: -h, top: h });
      }
    return cols;
  }
  if (shape.kind === 'box') {
    const h = shape.half ?? [1, 1, 1];
    const nu = 4, nw = 3;
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nw; j++)
        cols.push({
          local: [-h[0] + ((i + 0.5) * 2 * h[0]) / nu, 0, -h[2] + ((j + 0.5) * 2 * h[2]) / nw],
          area: ((2 * h[0]) / nu) * ((2 * h[2]) / nw), bottom: -h[1], top: h[1],
        });
    return cols;
  }
  const L = shape.length ?? 8;
  const nu = 9, nw = 4;
  for (let i = 0; i < nu; i++) {
    const u = -L / 2 + ((i + 0.5) * L) / nu;
    const s = u / (L / 2);
    const hb = hullHalfBeam(shape, s);
    for (let j = 0; j < nw; j++) {
      const w = -hb + ((j + 0.5) * 2 * hb) / nw;
      const yb = hullBottomLocal(shape, u, w);
      if (yb === null) continue;
      cols.push({ local: [u, 0, w], area: (L / nu) * ((2 * hb) / nw), bottom: yb, top: hullDeckLocal(shape, s) });
    }
  }
  return cols;
}

export function createBody(opts: {
  label: string; shape: BodyShape; density: number; pos: Vec3; yawDeg?: number; vel?: Vec3; color?: Vec3; fixed?: boolean;
}): Body {
  const vol = shapeVolume(opts.shape);
  const mass = vol * opts.density;
  const he = shapeHalfExtents(opts.shape);
  // Solid-box inertia about principal axes (hulls ~ lighter at the ends: 0.8 factor).
  const k = opts.shape.kind === 'hull' ? 0.8 : opts.shape.kind === 'sphere' ? 1.2 : 1;
  const inertia: Vec3 = [
    (k * mass * (4 * he[1] * he[1] + 4 * he[2] * he[2])) / 12,
    (k * mass * (4 * he[0] * he[0] + 4 * he[2] * he[2])) / 12,
    (k * mass * (4 * he[0] * he[0] + 4 * he[1] * he[1])) / 12,
  ];
  return {
    id: nextId++,
    label: opts.label,
    shape: opts.shape,
    density: opts.density,
    mass,
    inertia,
    pos: [...opts.pos] as Vec3,
    vel: opts.vel ? ([...opts.vel] as Vec3) : [0, 0, 0],
    rot: quatFromAxisAngle([0, 1, 0], (-(opts.yawDeg ?? 0) * Math.PI) / 180),
    angVel: [0, 0, 0],
    columns: buildColumns(opts.shape),
    autopilot: null,
    thrust: 0,
    rudder: 0,
    age: 0,
    submerged: 0,
    immersion: 0,
    entrySpeed: 0,
    color: opts.color ?? [0.8, 0.8, 0.8],
    alive: true,
    fixed: !!opts.fixed,
    script: null,
  };
}

/** World heading (radians, 0 = +x) of a body's bow. */
export function bodyHeading(b: Body): number {
  const f = quatRotate(b.rot, [1, 0, 0]);
  return Math.atan2(f[2], f[0]);
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Volume of `b` below a reference sea level (the undisturbed T0 surface, not the tile the
 * body is disturbing) and the radius `a` of its waterplane (√(A/π) for non-spheres). A
 * sphere is exact (spherical cap); other shapes integrate their columns.
 */
export function displacedBelow(b: Body, level: (x: number, z: number) => number): { volume: number; a: number } {
  const s = b.shape;
  if (s.kind === 'sphere') {
    const R = s.radius ?? 1;
    const h = b.pos[1] - level(b.pos[0], b.pos[2]);
    const d = clamp(R - h, 0, 2 * R);
    return { volume: (Math.PI * d * d * (3 * R - d)) / 3, a: Math.abs(h) < R ? Math.sqrt(R * R - h * h) : 0 };
  }
  const up = quatRotate(b.rot, [0, 1, 0]);
  let volume = 0, plane = 0;
  for (const c of b.columns) {
    const r = quatRotate(b.rot, c.local);
    const yb = b.pos[1] + r[1] + c.bottom * up[1];
    const yt = b.pos[1] + r[1] + c.top * up[1];
    const y0 = level(b.pos[0] + r[0], b.pos[2] + r[2]);
    const h = clamp(y0 - yb, 0, yt - yb);
    volume += h * c.area * Math.max(up[1], 0.2);
    if (h > 0 && h < yt - yb) plane += c.area;
  }
  return { volume, a: Math.sqrt(plane / Math.PI) };
}

/**
 * Froude-limited entry jet: of the displacement flux Q a body drives through a waterplane of
 * radius a at relative speed U, gravity waves of that scale carry away at most c = √(g·a);
 * the excess Q·(1 − c/U) is thrown off as the splash (m³/s).
 */
export function entryJetFlux(Q: number, U: number, a: number): number {
  const c = Math.sqrt(G * Math.max(a, 0));
  return Q > 0 && a > 1e-3 && U > c ? Q * (1 - c / U) : 0;
}

export interface StepStats {
  submergedVolume: number;
  waterlineSpeed: number;
}

/** Advance one body by dt against the water query. */
export function stepBody(b: Body, water: WaterQuery, dt: number): StepStats {
  b.age += dt;
  if (b.fixed) return { submergedVolume: 0, waterlineSpeed: 0 };
  const F: Vec3 = [0, -G * b.mass, 0];
  const T: Vec3 = [0, 0, 0];
  let subVol = 0, relSpeedAcc = 0, relW = 0;
  const colDrag = b.shape.kind === 'hull' ? 1 : b.shape.kind === 'sphere' ? 0.5 : 0.8;
  const up = quatRotate(b.rot, [0, 1, 0]);
  const fwd = quatRotate(b.rot, [1, 0, 0]);
  const side = quatRotate(b.rot, [0, 0, 1]);
  for (const c of b.columns) {
    const r = quatRotate(b.rot, c.local);
    const px = b.pos[0] + r[0], pz = b.pos[2] + r[2];
    const ws = water.sample(px, pz);
    // Column span along world vertical (tilted by the body's up vector).
    const yb = b.pos[1] + r[1] + c.bottom * up[1];
    const yt = b.pos[1] + r[1] + c.top * up[1];
    const h = clamp(ws.height - yb, 0, yt - yb);
    if (h <= 0) continue;
    const vol = h * c.area * Math.max(up[1], 0.2);
    subVol += vol;
    // Buoyancy acts at the centroid of the wet part of the column.
    const cy = yb + h * 0.5;
    const lever: Vec3 = [r[0], cy - b.pos[1], r[2]];
    const fb: Vec3 = [0, RHO_WATER * G * vol, 0];
    // Velocity of the column point relative to the water particles.
    const pv = cross(b.angVel, lever);
    const rel: Vec3 = [b.vel[0] + pv[0] - ws.vx, b.vel[1] + pv[1] - ws.vy, b.vel[2] + pv[2] - ws.vz];
    // Anisotropic quadratic drag: slippery fore-aft, keel-like sideways, strong heave damping.
    const rf = rel[0] * fwd[0] + rel[1] * fwd[1] + rel[2] * fwd[2];
    const rs = rel[0] * side[0] + rel[1] * side[1] + rel[2] * side[2];
    const ru = rel[0] * up[0] + rel[1] * up[1] + rel[2] * up[2];
    const wet = h / Math.max(yt - yb, 1e-3);
    const A = c.area;
    const cf = 0.012 * colDrag, cs = 0.55 * colDrag, cu = 0.9;
    const df = -0.5 * RHO_WATER * cf * A * Math.abs(rf) * rf * wet;
    const ds = -0.5 * RHO_WATER * cs * A * Math.abs(rs) * rs * wet * 0.4;
    const du = -0.5 * RHO_WATER * cu * A * Math.abs(ru) * ru * wet - 350 * A * ru * wet; // + linear radiation damping
    const fd: Vec3 = [
      fwd[0] * df + side[0] * ds + up[0] * du,
      fwd[1] * df + side[1] * ds + up[1] * du,
      fwd[2] * df + side[2] * ds + up[2] * du,
    ];
    const f: Vec3 = [fb[0] + fd[0], fb[1] + fd[1], fb[2] + fd[2]];
    F[0] += f[0]; F[1] += f[1]; F[2] += f[2];
    const t = cross(lever, f);
    T[0] += t[0]; T[1] += t[1]; T[2] += t[2];
    relSpeedAcc += Math.hypot(rel[0], rel[2]) * wet;
    relW += wet;
  }

  // Propulsion + rudder (hulls with an autopilot).
  if (b.shape.kind === 'hull' && b.autopilot && b.autopilot.mode !== 'none') {
    const ap = b.autopilot;
    const L = b.shape.length ?? 8;
    const speed = b.vel[0] * fwd[0] + b.vel[2] * fwd[2];
    let desired = bodyHeading(b);
    if (ap.mode === 'circle') {
      const dx = b.pos[0] - ap.center[0], dz = b.pos[2] - ap.center[1];
      const ang = Math.atan2(dz, dx);
      const dist = Math.hypot(dx, dz);
      const tangent = ang + (ap.clockwise ? -Math.PI / 2 : Math.PI / 2);
      const correction = clamp((dist - ap.radius) / ap.radius, -0.6, 0.6) * (ap.clockwise ? -1 : 1);
      desired = tangent + correction * 1.2;
    }
    let err = desired - bodyHeading(b);
    err = Math.atan2(Math.sin(err), Math.cos(err));
    b.rudder = clamp(err * 1.4 - b.angVel[1] * 0.6, -0.6, 0.6);
    const sternSub = b.immersion > 0.05 ? 1 : 0;
    b.thrust = clamp((ap.speed - speed) * b.mass * 0.9 + b.mass * 0.25, 0, b.mass * 2.2) * sternSub;
    // Thrust at the stern, rudder side-force proportional to speed through water.
    const stern: Vec3 = [-fwd[0] * L * 0.45, -0.4, -fwd[2] * L * 0.45];
    const ft: Vec3 = [fwd[0] * b.thrust, 0, fwd[2] * b.thrust];
    const side = -Math.sin(b.rudder) * Math.max(speed, 0.5) * b.mass * 0.35 * sternSub;
    const sv = quatRotate(b.rot, [0, 0, 1]);
    const fr: Vec3 = [sv[0] * side, 0, sv[2] * side];
    F[0] += ft[0] + fr[0]; F[2] += ft[2] + fr[2];
    const t1 = cross(stern, ft), t2 = cross(stern, fr);
    T[0] += t1[0] + t2[0]; T[1] += t1[1] + t2[1]; T[2] += t1[2] + t2[2];
  }

  // Integrate (semi-implicit Euler).
  b.vel[0] += (F[0] / b.mass) * dt;
  b.vel[1] += (F[1] / b.mass) * dt;
  b.vel[2] += (F[2] / b.mass) * dt;
  b.pos[0] += b.vel[0] * dt;
  b.pos[1] += b.vel[1] * dt;
  b.pos[2] += b.vel[2] * dt;
  // Angular: τ in body frame → α = I⁻¹(τ − ω×Iω).
  const inv = quatConj(b.rot);
  const tl = quatRotate(inv, T);
  const wl = quatRotate(inv, b.angVel);
  const Iw: Vec3 = [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]];
  const gyro = cross(wl, Iw);
  const al: Vec3 = [(tl[0] - gyro[0]) / b.inertia[0], (tl[1] - gyro[1]) / b.inertia[1], (tl[2] - gyro[2]) / b.inertia[2]];
  const aw = quatRotate(b.rot, al);
  b.angVel[0] += aw[0] * dt;
  b.angVel[1] += aw[1] * dt;
  b.angVel[2] += aw[2] * dt;
  // Mild angular damping in air.
  const damp = Math.exp(-0.05 * dt);
  b.angVel = [b.angVel[0] * damp, b.angVel[1] * damp, b.angVel[2] * damp];
  const wq: Quat = [b.angVel[0] * 0.5 * dt, b.angVel[1] * 0.5 * dt, b.angVel[2] * 0.5 * dt, 0];
  const dq = quatMul(wq, b.rot);
  b.rot = quatNormalize([b.rot[0] + dq[0], b.rot[1] + dq[1], b.rot[2] + dq[2], b.rot[3] + dq[3]]);

  const full = shapeVolume(b.shape);
  b.submerged = subVol;
  b.immersion = clamp(subVol / Math.max(full, 1e-6), 0, 1);
  return { submergedVolume: subVol, waterlineSpeed: relW > 0 ? relSpeedAcc / relW : 0 };
}
