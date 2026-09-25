export interface LegacyRuntimeHandles {
  master: any;
  renderer: any;
  scene: any;
  camera: any;
  body: any;
  simulation: any;
  rigV16: any;
  ropeV16: any;
  sailOpticsV17: any;
  spreaderV17: any;
  standingRigCollisionV17: any;
}

export class LegacyRuntimeAdapter {
  private handles: LegacyRuntimeHandles | null = null;
  private initialized = false;
  private anchorPosition: any = null;
  private anchorQuaternion: any = null;
  private dynamicRequested = false;
  private sailing = false;
  private simulationSteps = 0;
  private legacyFrameAuthorityFrozen = false;
  private compatibilityBootstrapFrames = 0;

  async init(timeoutMs = 20_000): Promise<void> {
    if (this.initialized) return;
    const start = performance.now();
    while (!window.LASER2_CREW_RIGGING_MASTER_V2 || !window.__sim || !window.LASER2_RIGGING_V16) {
      if (performance.now() - start > timeoutMs) throw new Error('Legacy boat runtime did not initialize');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const master = window.LASER2_CREW_RIGGING_MASTER_V2;
    this.handles = {
      master,
      renderer: master.renderer,
      scene: master.scene,
      camera: master.camera,
      body: master.body,
      simulation: window.__sim,
      rigV16: window.LASER2_RIGGING_V16,
      ropeV16: window.LASER2_ROPE_HARDWARE_V16,
      sailOpticsV17: window.LASER2_SAIL_OPTICS_V17,
      spreaderV17: window.LASER2_SPREADER_RIG_V17_2,
      standingRigCollisionV17: window.LASER2_STANDING_RIG_COLLISION_V17_3,
    };
    this.configureCompatibilityBoundary();
    await this.bootstrapCompatibilityGeometry();
    this.freezeLegacyFrameAuthority();
    this.initialized = true;
  }

  private configureCompatibilityBoundary(): void {
    const { master, simulation, body, renderer } = this.requireHandles();
    window.__camLock = true;
    simulation.pause(true);
    if (master.input?.state) master.input.state.paused = true;
    this.anchorPosition = body.pos.clone();
    this.anchorQuaternion = body.quat.clone();
    body.kinematic = true;
    body.vel?.set?.(0, 0, 0);
    body.omega?.set?.(0, 0, 0);
    body.force?.set?.(0, 0, 0);
    body.torque?.set?.(0, 0, 0);

    renderer.setPixelRatio?.(Math.min(devicePixelRatio || 1, 1));
    renderer.setSize?.(innerWidth, innerHeight, false);

    if (master.water) {
      for (const object of [master.water.meshNear, master.water.meshFar, master.water.skyMesh]) {
        if (object) object.visible = false;
      }
      master.water.height = () => -1000;
      master.water.velocity = (_x: number, _z: number, out: any) => out?.set?.(0, 0, 0);
      master.water.update = () => {};
      master.water.setSea = () => {};
    }
    if (master.hydro) master.hydro.hook = () => {};

    for (const element of document.querySelectorAll<HTMLElement>('.hud-root, .laser2-lab')) {
      element.style.display = 'none';
    }
  }

  private async bootstrapCompatibilityGeometry(timeoutMs = 30_000): Promise<void> {
    // One paused source callback is required to write the initial dynamic mast,
    // sail, rope, and crew geometry buffers. Rendering is explicitly suppressed
    // during this compatibility-only bootstrap so the vendor loop cannot own or
    // benchmark a GPU frame before Foundry quality/lighting systems initialize.
    const renderer = this.renderer;
    const originalRender = renderer.render.bind(renderer);
    renderer.render = () => undefined;
    try {
      const pulse = window.__LASER2_PULSE_RAF?.(1) ?? false;
      if (!pulse) return;
      const start = performance.now();
      const populated = (): boolean => {
        const attribute = this.master.rig?.group?.children?.[0]?.geometry?.attributes?.position;
        const array = attribute?.array as ArrayLike<number> | undefined;
        if (!array) return false;
        const limit = Math.min(array.length, 96);
        for (let i = 0; i < limit; i++) if (Math.abs(Number(array[i])) > 1e-7) return true;
        return false;
      };
      while (!populated()) {
        if (performance.now() - start > timeoutMs) throw new Error('Legacy dynamic geometry bootstrap did not complete');
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      this.compatibilityBootstrapFrames = 1;
    } finally {
      renderer.render = originalRender;
    }
  }

  get master(): any { return this.requireHandles().master; }
  get renderer(): any { return this.requireHandles().renderer; }
  get scene(): any { return this.requireHandles().scene; }
  get camera(): any { return this.requireHandles().camera; }
  get body(): any { return this.requireHandles().body; }
  get simulation(): any { return this.requireHandles().simulation; }
  get rigV16(): any { return this.requireHandles().rigV16; }
  get ropeV16(): any { return this.requireHandles().ropeV16; }
  get sailOpticsV17(): any { return this.requireHandles().sailOpticsV17; }
  get spreaderV17(): any { return this.requireHandles().spreaderV17; }
  get standingRigCollisionV17(): any { return this.requireHandles().standingRigCollisionV17; }
  get gl(): WebGLRenderingContext | WebGL2RenderingContext | null { return this.renderer?.getContext?.() ?? null; }

  freezeLegacyFrameAuthority(): void {
    window.__LASER2_SET_RAF_DYNAMIC?.(false);
    this.simulation.pause(true);
    if (this.master.input?.state) this.master.input.state.paused = true;
    this.legacyFrameAuthorityFrozen = true;
  }

  setDynamic(enabled: boolean): void {
    this.dynamicRequested = !!enabled;
    // Foundry owns cadence and physics stepping. The legacy loop remains frozen.
    this.freezeLegacyFrameAuthority();
    this.body.kinematic = !this.sailing;
    if (!enabled) this.enforceAnchor();
  }

  /**
   * Sailing releases the kinematic anchor: the hull becomes a free rigid body
   * driven by the native ocean/hydrodynamics authorities. Leaving sailing
   * restores the legacy start snapshot before re-anchoring, so the rig never
   * snaps across the distance the boat has sailed.
   */
  setSailing(enabled: boolean): void {
    const next = !!enabled;
    if (next === this.sailing) return;
    this.sailing = next;
    const body = this.body;
    if (next) {
      body.kinematic = false;
      body.vel?.set?.(0, 0, 0);
      body.omega?.set?.(0, 0, 0);
    } else {
      this.simulation.reset?.();
      body.kinematic = true;
      this.enforceAnchor();
    }
  }

  get isSailing(): boolean { return this.sailing; }

  step(steps = 1): void {
    const count = Math.max(1, Math.floor(steps));
    const { simulation, body } = this.requireHandles();
    simulation.pause(true);
    if (this.master.input?.state) this.master.input.state.paused = true;
    body.kinematic = !this.sailing;
    simulation.stepN?.(count);
    this.simulationSteps += count;
    this.enforceAnchor();
  }

  stepDynamicFrame(): void {
    if (!this.dynamicRequested) return;
    this.step(1);
  }

  enforceAnchor(): void {
    if (this.sailing || !this.anchorPosition || !this.anchorQuaternion) return;
    const body = this.body;
    body.pos.copy(this.anchorPosition);
    body.prevPos?.copy?.(this.anchorPosition);
    body.quat.copy(this.anchorQuaternion);
    body.prevQuat?.copy?.(this.anchorQuaternion);
    body.vel?.set?.(0, 0, 0);
    body.omega?.set?.(0, 0, 0);
    body.force?.set?.(0, 0, 0);
    body.torque?.set?.(0, 0, 0);
  }

  setLegacyHudVisible(visible: boolean): void {
    for (const element of document.querySelectorAll<HTMLElement>('.hud-root, .laser2-lab')) {
      element.style.display = visible ? '' : 'none';
    }
  }

  frameAuthorityTelemetry(): Record<string, unknown> {
    return {
      frozen: this.legacyFrameAuthorityFrozen,
      dynamicRequested: this.dynamicRequested,
      sailing: this.sailing,
      simulationSteps: this.simulationSteps,
      compatibilityBootstrapFrames: this.compatibilityBootstrapFrames,
      gateMode: window.__LASER2_RAF_GATE?.mode ?? null,
      gateQueuedCallbacks: window.__LASER2_RAF_GATE?.queued ?? null,
      gatePulseBudget: window.__LASER2_RAF_GATE?.pulseBudget ?? null,
    };
  }

  inventory(): Record<string, unknown> {
    let objects = 0, meshes = 0, lights = 0, materials = 0;
    const materialIds = new Set<number>();
    this.scene.traverse((object: any) => {
      objects++;
      if (object.isMesh) meshes++;
      if (object.isLight) lights++;
      const source = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      for (const material of source) {
        if (typeof material?.id === 'number' && !materialIds.has(material.id)) {
          materialIds.add(material.id); materials++;
        }
      }
    });
    return {
      objects, meshes, lights, materials,
      rig: !!this.rigV16,
      ropes: !!this.ropeV16,
      sailOptics: this.sailOpticsV17?.VERSION ?? null,
      waterPresent: !!this.master.water,
      waterActive: false,
      frameAuthority: this.frameAuthorityTelemetry(),
    };
  }

  private requireHandles(): LegacyRuntimeHandles {
    if (!this.handles) throw new Error('Legacy runtime adapter not initialized');
    return this.handles;
  }
}
