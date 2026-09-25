/**
 * World module: procedural terrain (GPU-baked), terrain rendering, and the
 * height binding the water shader uses for T1 depth-limited shoaling.
 */
import type { EngineModule, OceanEngine, EngineTelemetry } from '../engine/OceanEngine';
import { World } from '../world/World';
import { TerrainRenderer } from '../render/terrainRender';
import type { ShoreModule } from './shoreModule';
import type { QualityName } from '../engine/settings';

const TERRAIN_QUALITY: Record<QualityName, { coarseN: number; fineN: number; patch: number; leaf: number }> = {
  capture: { coarseN: 512, fineN: 2048, patch: 32, leaf: 16 },
  low: { coarseN: 512, fineN: 1024, patch: 16, leaf: 16 },
  medium: { coarseN: 1024, fineN: 2048, patch: 32, leaf: 16 },
  high: { coarseN: 1024, fineN: 2048, patch: 32, leaf: 12 },
  ultra: { coarseN: 2048, fineN: 4096, patch: 48, leaf: 12 },
};

export class WorldModule implements EngineModule {
  name = 'world';
  readonly world: World;
  readonly terrain: TerrainRenderer;
  shore: ShoreModule | null = null;

  constructor(engine: OceanEngine) {
    const q = TERRAIN_QUALITY[engine.quality];
    this.world = new World(engine.gl, undefined, { coarseN: q.coarseN, fineN: q.fineN });
    this.terrain = new TerrainRenderer(engine.gl, this.world, {
      leafSize: q.leaf, patchQuads: q.patch, levels: 11, rangeK: 2.4, coverage: 9000, morphFraction: 0.32,
    });
    const w = this.world;
    engine.terrainBinding = {
      fine: w.fine.texture, fineRect: [w.fine.min[0], w.fine.min[1], w.fine.size],
      coarse: w.coarse.texture, coarseRect: [w.coarse.min[0], w.coarse.min[1], w.coarse.size],
    };
  }

  drawOpaque(engine: OceanEngine) {
    const s = engine.settings;
    const shore = this.shore?.field;
    return this.terrain.draw({
      viewProj: engine.camera.viewProj, planes: engine.camera.planes, cam: engine.camera.position,
      env: engine.sky.texture, envLevels: engine.sky.levels, sunDir: engine.sky.sunDir, sunE: engine.sky.sunRadiance,
      skyE: engine.skyE, fogDensity: s.optics.fogDensity, absorb: s.optics.absorb, time: engine.time,
      earthRadius: s.earthCurvature ? 6.371e6 : 0,
      shore: shore && shore.fade > 0 ? { rect: [shore.origin[0], shore.origin[1], shore.size], extra: shore.out.textures[2], surf: shore.out.textures[0] } : null,
      cloud: engine.cloudShadow,
    }, engine.ocean);
  }

  telemetry(t: EngineTelemetry) {
    (t as EngineTelemetry & { terrainTriangles: number }).terrainTriangles = this.terrain.triangles;
  }

  dispose() {
    this.terrain.dispose();
    this.world.dispose();
  }
}
