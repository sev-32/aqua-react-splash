/**
 * Bodies module: rigid-body physics on the composite water surface, spawners
 * (boats, rocks, buoys) and rendering.
 */
import type { EngineModule, OceanEngine, EngineTelemetry } from '../engine/OceanEngine';
import { createBody, stepBody, scriptPose, type Body, type BodyScript } from '../physics/bodies';
import { BodiesRenderer } from '../render/bodiesRender';
import type { Vec3 } from '../math/mat4';

export class BodiesModule implements EngineModule {
  name = 'bodies';
  bodies: Body[] = [];
  private renderer: BodiesRenderer;
  private acc = 0;
  readonly step = 1 / 120;
  /** Bodies that entered the water hard this frame (for splash/impact emitters). */
  entries: { body: Body; speed: number; at: Vec3 }[] = [];
  private prevImmersion = new Map<number, number>();

  constructor(private engine: OceanEngine) {
    this.renderer = new BodiesRenderer(engine.gl);
  }

  add(b: Body) {
    this.bodies.push(b);
    return b;
  }

  /** Point on the sea `dist` metres ahead of the camera. */
  ahead(dist: number, side = 0): Vec3 {
    const c = this.engine.camera;
    const f = c.forward, r = c.right;
    const fl = Math.hypot(f[0], f[2]) || 1;
    return [c.position[0] + (f[0] / fl) * dist + r[0] * side, 0, c.position[2] + (f[2] / fl) * dist + r[2] * side];
  }

  spawnBoat(at?: Vec3) {
    const p = at ?? this.ahead(45, 10);
    const yaw = Math.atan2(this.engine.camera.right[2], this.engine.camera.right[0]) * (180 / Math.PI);
    const b = createBody({
      label: 'boat', density: 330, pos: [p[0], 0.2, p[2]], yawDeg: yaw,
      shape: { kind: 'hull', length: 9, beam: 2.8, draft: 0.9, freeboard: 1.0 }, color: [0.9, 0.9, 0.88],
    });
    b.autopilot = { mode: 'circle', center: [p[0] - Math.sin((yaw * Math.PI) / 180) * 40, p[2] + Math.cos((yaw * Math.PI) / 180) * 40], radius: 40, speed: 7.5, clockwise: false };
    return this.add(b);
  }

  dropRock(at?: Vec3) {
    const p = at ?? this.ahead(28);
    return this.add(createBody({
      label: 'rock', density: 2600, pos: [p[0], 14, p[2]], vel: [0, -4, 0],
      shape: { kind: 'sphere', radius: 1.1 }, color: [0.25, 0.24, 0.22],
    }));
  }

  spawnBuoys(at?: Vec3) {
    const p = at ?? this.ahead(22);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      this.add(createBody({
        label: 'buoy', density: 260, pos: [p[0] + Math.cos(a) * 6, 0.5, p[2] + Math.sin(a) * 6],
        shape: { kind: 'sphere', radius: 0.55 }, color: [0.85, 0.2, 0.1],
      }));
    }
  }

  /** The pool's sphere, at `at` (sea-level y), optionally driven by a script. */
  spawnSphere(at: Vec3, radius = 0.6, script: Omit<BodyScript, 'origin'> | null = null, density = 700) {
    const b = createBody({ label: 'sphere', density, pos: [...at] as Vec3, shape: { kind: 'sphere', radius }, color: [0.86, 0.84, 0.8] });
    if (script) b.script = { ...script, origin: [...at] as Vec3 };
    return this.add(b);
  }

  clear() {
    this.bodies.length = 0;
  }

  update(engine: OceanEngine, _time: number, dt: number) {
    this.entries.length = 0;
    this.acc = Math.min(this.acc + dt, this.step * 12);
    while (this.acc >= this.step) {
      for (const b of this.bodies) {
        if (!b.alive) continue;
        stepBody(b, engine.water, this.step);           // (immersion stats; integration overridden below if scripted)
        if (b.script) {
          const k = scriptPose(b.script, b.age);
          b.pos = k.pos; b.vel = k.vel; b.angVel = [0, 0, 0];
        }
      }
      this.acc -= this.step;
    }
    for (const b of this.bodies) {
      const prev = this.prevImmersion.get(b.id) ?? 0;
      if (prev < 0.05 && b.immersion >= 0.05 && b.vel[1] < -2) {
        this.entries.push({ body: b, speed: -b.vel[1], at: [...b.pos] as Vec3 });
      }
      this.prevImmersion.set(b.id, b.immersion);
      // Sunk rocks leave the simulation (their splash and ring waves live on in the fields).
      if (b.label === 'rock' && b.pos[1] < -14) b.alive = false;
      if (Math.hypot(b.pos[0] - engine.camera.position[0], b.pos[2] - engine.camera.position[2]) > 3000) b.alive = false;
    }
    this.bodies = this.bodies.filter((b) => b.alive);
  }

  drawOpaque(engine: OceanEngine) {
    if (!this.bodies.length) return false;
    const s = engine.settings;
    this.renderer.draw(this.bodies, {
      viewProj: engine.camera.viewProj, cam: engine.camera.position, env: engine.sky.texture, envLevels: engine.sky.levels,
      sunDir: engine.sky.sunDir, sunE: engine.sky.sunRadiance, skyE: engine.skyE, absorb: s.optics.absorb,
      fogDensity: s.optics.fogDensity*(1 + 5*s.weather.precipitation), waterAt: (x, z) => engine.sampleWater(x, z).height,
      cloud: engine.cloudShadow,
    });
    return true;
  }

  telemetry(t: EngineTelemetry) {
    (t as EngineTelemetry & { bodies: number }).bodies = this.bodies.length;
  }

  dispose() {
    this.renderer.dispose();
  }
}
