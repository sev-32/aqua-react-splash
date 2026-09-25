import type { AppContext, AppSystem } from '../core/System.js';
import type { CatalogItem } from './ObjectCatalogSystem.js';

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

  init(context: AppContext): void {
    this.context = context;
    this.canvas = context.legacy.renderer.domElement;
    this.target = context.legacy.body.pos.clone();
    this.target.y += 2.2;
    this.installInput();
    this.apply(context);
  }

  update(_dtSeconds: number, context: AppContext): void {
    this.apply(context);
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
    camera.lookAt(this.target);
    camera.updateMatrixWorld?.(true);
  }

  telemetry(): Record<string, unknown> {
    return { yaw: this.yaw, pitch: this.pitch, distance: this.distance, target: this.target?.toArray?.() ?? null };
  }
}
