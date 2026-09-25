import type { AppContext, AppSystem } from '../core/System.js';
import type { CatalogItem } from './ObjectCatalogSystem.js';

export type SailingCameraMode = 'follow' | 'chase' | 'crew';
const SAILING_CAMERA_MODES: readonly SailingCameraMode[] = ['follow', 'chase', 'crew'];

/** Optional sailing bindings supplied by main (kept free of system imports). */
export interface SailingCameraBindings {
  /** Water surface height at (x, z) (m). */
  waterHeight(x: number, z: number): number;
  /** Crew member worth watching (a swimmer, or the helm), world position. */
  crewFocus(): { x: number; y: number; z: number } | null;
}

export class CameraControllerSystem implements AppSystem {
  readonly id = 'inspection.camera';
  readonly phase = 'preRender' as const;
  enabled = true;
  yaw = 2.35;
  pitch = 0.24;
  distance = 9.5;
  target: any = null;
  private dragging = false;
  private button = 0;
  private lastX = 0;
  private lastY = 0;
  private canvas: HTMLCanvasElement | null = null;
  private context: AppContext | null = null;
  private sailingBindings: SailingCameraBindings | null = null;
  private sailingActive = false;
  /** Chase mode: user orbit offset relative to the boat's stern (rad). */
  private chaseYawOffset = 0.35;
  private lastCamMode = -1;
  private smoothedHeading = 0;
  private waterClamps = 0;

  bindSailing(bindings: SailingCameraBindings): this {
    this.sailingBindings = bindings;
    return this;
  }

  get sailingMode(): SailingCameraMode {
    const index = this.context?.legacy.master?.input?.state?.camMode ?? 0;
    return SAILING_CAMERA_MODES[((index % 3) + 3) % 3]!;
  }

  init(context: AppContext): void {
    this.context = context;
    this.canvas = context.legacy.renderer.domElement;
    this.target = context.legacy.body.pos.clone();
    this.target.y += 2.2;
    this.installInput();
    this.apply(context);
  }

  update(dtSeconds: number, context: AppContext): void {
    const sailing = context.state.get().mode === 'sailing';
    if (sailing !== this.sailingActive) {
      this.sailingActive = sailing;
      if (sailing) {
        const body = context.legacy.body;
        this.target.set(body.pos.x, body.pos.y + 1.1, body.pos.z);
        this.distance = 10.5;
        this.pitch = 0.2;
      }
    }
    if (sailing) this.follow(Math.min(0.1, Math.max(0, dtSeconds)), context);
    this.apply(context);
  }

  /** Sailing: keep the boat (or a swimmer) framed while it travels. */
  private follow(dt: number, context: AppContext): void {
    const master = context.legacy.master;
    const body = master.body;
    const mode = this.sailingMode;
    const camMode = master.input?.state?.camMode ?? 0;
    const q = body.quat;
    // Bow direction (design +Z) projected on the water plane.
    const fx = 2 * (q.x * q.z + q.w * q.y), fz = 1 - 2 * (q.x * q.x + q.y * q.y);
    const heading = Math.atan2(fx, fz);
    if (camMode !== this.lastCamMode) {
      this.lastCamMode = camMode;
      this.smoothedHeading = heading;
      if (mode === 'chase') this.chaseYawOffset = 0.35;
    }
    let dh = heading - this.smoothedHeading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    this.smoothedHeading += dh * Math.min(1, dt * 1.6);
    let focus = { x: body.pos.x, y: body.pos.y + 1.1, z: body.pos.z };
    if (mode === 'crew') {
      const crew = this.sailingBindings?.crewFocus();
      if (crew) focus = { x: crew.x, y: crew.y + 0.3, z: crew.z };
    }
    // Rigid horizontal follow (no lag drift at speed); smoothed height so the
    // view does not pump with every wave.
    const kxz = mode === 'crew' ? Math.min(1, dt * 4) : 1;
    this.target.x += (focus.x - this.target.x) * kxz;
    this.target.z += (focus.z - this.target.z) * kxz;
    this.target.y += (focus.y - this.target.y) * Math.min(1, dt * 1.8);
    if (mode === 'chase') this.yaw = this.smoothedHeading + Math.PI + this.chaseYawOffset;
  }

  focus(item: CatalogItem): void {
    let combined: any = null;
    for (const root of item.objects) {
      root?.updateWorldMatrix?.(true, true);
      root?.traverse?.((object: any) => {
        if (!object?.isMesh || !object.geometry) return;
        object.geometry.computeBoundingBox?.();
        const box = object.geometry.boundingBox?.clone?.();
        if (!box) return;
        object.updateWorldMatrix?.(true, false);
        box.applyMatrix4?.(object.matrixWorld);
        if (!combined) combined = box;
        else combined.union?.(box);
      });
      if (root?.isMesh && !root.traverse) {
        root.geometry?.computeBoundingBox?.();
        const box = root.geometry?.boundingBox?.clone?.();
        if (box) {
          root.updateWorldMatrix?.(true, false);
          box.applyMatrix4?.(root.matrixWorld);
          if (!combined) combined = box;
          else combined.union?.(box);
        }
      }
    }
    if (!combined) return;
    combined.getCenter(this.target);
    const size = this.target.clone();
    combined.getSize(size);
    const radius = Math.max(0.12, size.length() * 0.5);
    this.distance = Math.min(30, Math.max(0.6, radius * 2.8));
    this.context?.requestRender(`focus ${item.id}`);
  }

  setView(view: 'port' | 'starboard' | 'bow' | 'stern' | 'top' | 'rig'): void {
    const map: Record<string, [number, number]> = {
      port: [Math.PI / 2, 0.12], starboard: [-Math.PI / 2, 0.12],
      bow: [Math.PI, 0.1], stern: [0, 0.1], top: [0, 1.47], rig: [2.45, 0.24],
    };
    const pair = map[view] ?? map.rig!;
    this.yaw = pair[0]; this.pitch = pair[1];
    this.context?.requestRender(`view ${view}`);
  }

  private installInput(): void {
    if (!this.canvas) return;
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    this.canvas.addEventListener('pointerdown', (event) => {
      if ((event.target as HTMLElement).closest?.('.foundry-ui')) return;
      this.dragging = true; this.button = event.button; this.lastX = event.clientX; this.lastY = event.clientY;
      this.canvas?.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener('pointermove', (event) => {
      if (!this.dragging) return;
      const dx = event.clientX - this.lastX, dy = event.clientY - this.lastY;
      this.lastX = event.clientX; this.lastY = event.clientY;
      if (this.button === 0) {
        this.yaw -= dx * 0.006;
        if (this.sailingActive && this.sailingMode === 'chase') this.chaseYawOffset -= dx * 0.006;
        this.pitch = Math.max(-0.2, Math.min(1.48, this.pitch + dy * 0.005));
      } else {
        const camera = this.context?.legacy.camera;
        if (camera) {
          const right = this.target.clone().set(1, 0, 0).applyQuaternion(camera.quaternion);
          const up = this.target.clone().set(0, 1, 0).applyQuaternion(camera.quaternion);
          this.target.addScaledVector(right, -dx * this.distance * 0.0008).addScaledVector(up, dy * this.distance * 0.0008);
        }
      }
      this.context?.requestRender('camera pointer');
    });
    const finish = (event: PointerEvent) => { this.dragging = false; this.canvas?.releasePointerCapture?.(event.pointerId); };
    this.canvas.addEventListener('pointerup', finish);
    this.canvas.addEventListener('pointercancel', finish);
    this.canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      this.distance = Math.max(0.35, Math.min(45, this.distance * Math.exp(event.deltaY * 0.001)));
      this.context?.requestRender('camera wheel');
    }, { passive: false });
  }

  private apply(context: AppContext): void {
    if (!this.target) return;
    const camera = context.legacy.camera;
    const horizontal = Math.cos(this.pitch) * this.distance;
    camera.position.set(
      this.target.x + Math.sin(this.yaw) * horizontal,
      this.target.y + Math.sin(this.pitch) * this.distance,
      this.target.z + Math.cos(this.yaw) * horizontal,
    );
    if (this.sailingActive && this.sailingBindings) {
      // Never let the lens dip under the (moving) sea surface.
      const surface = this.sailingBindings.waterHeight(camera.position.x, camera.position.z);
      const minY = surface + 0.3 + camera.near * 2;
      if (camera.position.y < minY) { camera.position.y = minY; this.waterClamps++; }
    }
    camera.lookAt(this.target);
    camera.updateMatrixWorld?.(true);
  }

  telemetry(): Record<string, unknown> {
    return {
      yaw: this.yaw, pitch: this.pitch, distance: this.distance, target: this.target?.toArray?.() ?? null,
      sailing: this.sailingActive ? { mode: this.sailingMode, chaseYawOffset: this.chaseYawOffset, waterClamps: this.waterClamps } : null,
    };
  }
}
