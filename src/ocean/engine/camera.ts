/**
 * Free-flight camera with double-precision world position and camera-relative
 * matrices (the GPU never sees large world coordinates).
 */
import { perspective, viewFromBasis, mul4, invert4, frustumPlanes, type Vec3, type Mat4 } from '../math/mat4';
import { clamp } from '../math/scalar';

export interface CameraPose {
  position: Vec3;
  yawDeg: number;   // 0 = +x, 90 = +z
  pitchDeg: number; // + looks up
  fovDeg: number;
}

export class Camera {
  position: Vec3 = [0, 6, 0];
  yaw = 0;
  pitch = -8;
  fov = 55;
  near = 0.2;
  far = 300000;
  aspect = 16 / 9;

  view!: Mat4;
  proj!: Mat4;
  viewProj!: Mat4;
  invViewProj!: Mat4;
  planes!: Float64Array;

  get forward(): Vec3 {
    const y = (this.yaw * Math.PI) / 180, p = (this.pitch * Math.PI) / 180;
    return [Math.cos(p) * Math.cos(y), Math.sin(p), Math.cos(p) * Math.sin(y)];
  }
  get right(): Vec3 {
    const y = (this.yaw * Math.PI) / 180;
    return [-Math.sin(y), 0, Math.cos(y)];
  }

  setPose(p: Partial<CameraPose>) {
    if (p.position) this.position = [...p.position] as Vec3;
    if (p.yawDeg !== undefined) this.yaw = p.yawDeg;
    if (p.pitchDeg !== undefined) this.pitch = p.pitchDeg;
    if (p.fovDeg !== undefined) this.fov = p.fovDeg;
  }

  pose(): CameraPose {
    return { position: [...this.position] as Vec3, yawDeg: this.yaw, pitchDeg: this.pitch, fovDeg: this.fov };
  }

  update(aspect: number) {
    this.aspect = aspect;
    this.pitch = clamp(this.pitch, -89, 89);
    // Near plane scales gently with altitude so depth precision follows the view.
    const alt = Math.abs(this.position[1]);
    this.near = clamp(alt * 0.02, 0.05, 5);
    // Far plane reaches the planet's horizon (and the limb from orbit).
    const horizon = Math.sqrt(2 * 6.36e6 * alt + alt * alt);
    this.far = Math.max(300000, horizon * 1.3 + 20000);
    this.view = viewFromBasis(this.forward);
    this.proj = perspective((this.fov * Math.PI) / 180, aspect, this.near, this.far);
    this.viewProj = mul4(this.proj, this.view);
    this.invViewProj = invert4(this.viewProj);
    this.planes = frustumPlanes(this.viewProj);
  }
}

/** Mouse/keyboard controller: drag to look, WASD/QE to fly, wheel for speed, shift to boost. */
export class FlyController {
  private keys = new Set<string>();
  private dragging = false;
  private last = [0, 0];
  speed = 8;
  enabled = true;
  private disposers: (() => void)[] = [];

  constructor(private el: HTMLElement, private cam: Camera, private onPick?: (ndcX: number, ndcY: number, e: MouseEvent) => void) {
    const on = <K extends keyof HTMLElementEventMap>(t: EventTarget, type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
      t.addEventListener(type, fn, opts);
      this.disposers.push(() => t.removeEventListener(type, fn, opts));
    };
    let downAt = [0, 0], downTime = 0;
    on(el, 'pointerdown', (e: PointerEvent) => {
      if (!this.enabled) return;
      this.dragging = true;
      this.last = [e.clientX, e.clientY];
      downAt = [e.clientX, e.clientY];
      downTime = performance.now();
      el.setPointerCapture(e.pointerId);
    });
    on(el, 'pointerup', (e: PointerEvent) => {
      this.dragging = false;
      const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
      if (moved < 5 && performance.now() - downTime < 400 && this.onPick) {
        const r = el.getBoundingClientRect();
        this.onPick(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2, e);
      }
    });
    on(el, 'pointermove', (e: PointerEvent) => {
      if (!this.dragging || !this.enabled) return;
      const dx = e.clientX - this.last[0], dy = e.clientY - this.last[1];
      this.last = [e.clientX, e.clientY];
      this.cam.yaw += dx * 0.18;
      this.cam.pitch -= dy * 0.18;
    });
    on(el, 'wheel', (e: WheelEvent) => {
      if (!this.enabled) return;
      e.preventDefault();
      const f = Math.exp(-e.deltaY * 0.0012);
      this.cam.position[1] = Math.max(0.3, this.cam.position[1] * f + (this.cam.position[1] < 0 ? 0 : 0));
    }, { passive: false });
    on(window, 'keydown', (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      this.keys.add(e.key.toLowerCase());
    });
    on(window, 'keyup', (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase()));
    on(window, 'blur', () => this.keys.clear());
  }

  update(dt: number) {
    if (!this.enabled) return;
    const k = this.keys;
    const f = this.cam.forward, r = this.cam.right;
    const flat: Vec3 = [f[0], 0, f[2]];
    const fl = Math.hypot(flat[0], flat[2]) || 1;
    const boost = k.has('shift') ? 5 : 1;
    const alt = Math.max(1, Math.abs(this.cam.position[1]));
    const v = this.speed * boost * (0.6 + alt * 0.12) * dt;
    const move = (d: Vec3, s: number) => {
      this.cam.position[0] += d[0] * s;
      this.cam.position[1] += d[1] * s;
      this.cam.position[2] += d[2] * s;
    };
    if (k.has('w')) move([flat[0] / fl, 0, flat[2] / fl], v);
    if (k.has('s')) move([flat[0] / fl, 0, flat[2] / fl], -v);
    if (k.has('d')) move(r, v);
    if (k.has('a')) move(r, -v);
    if (k.has('e') || k.has(' ')) move([0, 1, 0], v);
    if (k.has('q')) move([0, 1, 0], -v);
  }

  dispose() {
    this.disposers.forEach((d) => d());
  }
}
