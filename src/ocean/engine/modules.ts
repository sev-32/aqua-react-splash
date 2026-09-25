import type { OceanEngine } from './OceanEngine';
import { BodiesModule } from '../modules/bodiesModule';
import { InteractionModule } from '../modules/interactionModule';
import { WorldModule } from '../modules/worldModule';
import { ShoreModule } from '../modules/shoreModule';
import { SplashModule } from '../modules/splashModule';
import { beachPose } from '../world/terrain';
import { registerAction, oceanActions } from './actions';
import { applyWeatherMorph } from '../atmos/weather';
import type { Vec3 } from '../math/mat4';

export interface StandardModules {
  world: WorldModule;
  shore: ShoreModule;
  bodies: BodiesModule;
  interaction: InteractionModule;
  splash: SplashModule;
}

/**
 * Installs the optional subsystems in tier order. Until the scheduler module is
 * installed, bodies request their own interaction tiles (direct JIT policy).
 */
export function installStandardModules(engine: OceanEngine): StandardModules {
  const world = engine.addModule(new WorldModule(engine)) as WorldModule;
  const bodies = engine.addModule(new BodiesModule(engine)) as BodiesModule;
  const interaction = engine.addModule(new InteractionModule(engine, bodies)) as InteractionModule;
  const shore = engine.addModule(new ShoreModule(engine, world)) as ShoreModule;
  interaction.tiles.depthAt = (x, z) => -world.world.sampleProduct('height', x, z);

  const directTiles = {
    name: 'tile-policy',
    update(e: OceanEngine) {
      if (!e.settings.interaction.tilesEnabled) return;
      for (const b of bodies.bodies) {
        const speed = Math.hypot(b.vel[0], b.vel[1], b.vel[2]);
        const nearWater = Math.abs(b.pos[1]) < 12;
        // Small bodies get fine tiles (the pool's resolution); hulls get the wide coarse field their wakes need.
        const small = b.shape.kind !== 'hull' && Math.max(b.shape.radius ?? 0, ...(b.shape.half ?? [0])) < 2.5;
        if (nearWater && (speed > 0.3 || b.age < 3 || b.script)) interaction.requestTile([b.pos[0], b.pos[2]], `body:${b.label}`, b.id, small);
      }
      for (const t of interaction.tiles.tiles) {
        if (!t.retiring && !t.followIds.length && e.time - t.lastActive > 14) interaction.tiles.retire(t);
      }
    },
  };
  engine.addModule(directTiles);
  // After every producer of releases (tiles, shore) in the same frame.
  const splash = engine.addModule(new SplashModule(engine, interaction, shore, bodies)) as SplashModule;

  registerAction('spawnBoat', (_e, at) => bodies.spawnBoat(at as never));
  registerAction('dropRock', (_e, at) => bodies.dropRock(at as never));
  registerAction('spawnBuoys', (_e, at) => bodies.spawnBuoys(at as never));
  registerAction('clearBodies', () => bodies.clear());
  registerAction('ripple', (e, at) => {
    const p = (at as [number, number, number]) ?? bodies.ahead(20);
    interaction.tiles.addImpact(p[0], p[2], 1.4, -0.9, 0.6, 0, e.time);
  });
  registerAction('frameBody', (e, arg) => {
    const opts = (arg ?? {}) as { index?: number; distance?: number; height?: number; side?: number };
    const hulls = bodies.bodies.filter((b) => b.shape.kind === 'hull');
    const b = hulls[opts.index ?? 0] ?? bodies.bodies[opts.index ?? 0];
    if (!b) return;
    const v = Math.hypot(b.vel[0], b.vel[2]) > 0.5 ? [b.vel[0], b.vel[2]] : [1, 0];
    const l = Math.hypot(v[0], v[1]);
    const dir = [v[0] / l, v[1] / l];
    const dist = opts.distance ?? 34, h = opts.height ?? 16, side = opts.side ?? 0.55;
    // Behind and to the side, looking down at the hull so bow wave, wake arms and trail read together.
    const px = b.pos[0] - dir[0] * dist + -dir[1] * dist * side, pz = b.pos[2] - dir[1] * dist + dir[0] * dist * side;
    const dx = b.pos[0] + dir[0] * 6 - px, dz = b.pos[2] + dir[1] * 6 - pz;
    e.camera.setPose({
      position: [px, h, pz],
      yawDeg: (Math.atan2(dz, dx) * 180) / Math.PI,
      pitchDeg: (-Math.atan2(h, Math.hypot(dx, dz)) * 180) / Math.PI,
    });
  });
  registerAction('goToShore', (e, arg) => {
    if (e.settings.shore.enabled) shore.promote();
    const { shore: s } = beachPose(world.world.params);
    const view = (arg as string) ?? 'surf';
    if (view === 'beach') {
      e.camera.setPose({ position: [s[0] + 18, 3.2, s[1] - 10], yawDeg: 172, pitchDeg: -6, fovDeg: 60 });
    } else if (view === 'aerial') {
      e.camera.setPose({ position: [s[0] - 60, 70, s[1] - 170], yawDeg: 62, pitchDeg: -26, fovDeg: 55 });
    } else {
      e.camera.setPose({ position: [s[0] - 150, 7, s[1] - 55], yawDeg: 12, pitchDeg: -6, fovDeg: 58 });
    }
  });
  /**
   * Interaction lab: the pool's experiment on the open sea. Glassy calm, clear sky, a
   * sand shelf ~5 m deep (clear water shows the wake and splash from above and below),
   * one sphere driven like the pool's: dropped, towed, bobbed or plunged and yanked out.
   */
  registerAction('lab', (e, arg) => {
    const opts = (typeof arg === 'string' ? { scene: arg } : (arg ?? {})) as { scene?: string; depth?: number; bearingDeg?: number; radius?: number };
    const scene = opts.scene ?? 'drop';
    const s = e.settings;
    s.weather.coupleSea = false;
    Object.assign(s.weather, applyWeatherMorph(s.weather, 0));
    s.sea.morph = 0;
    s.sea.directionOffsetDeg = 0;
    e.markSeaDirty();
    // Walk seaward from the island until the shelf is `depth` deep.
    const p = world.world.params;
    const br = ((opts.bearingDeg ?? 205) * Math.PI) / 180;
    const want = opts.depth ?? 5;
    let r = p.radius * 0.5, x = p.center[0], z = p.center[1];
    for (; r < p.radius * 4; r += 2) {
      x = p.center[0] + Math.cos(br) * r; z = p.center[1] + Math.sin(br) * r;
      if (-world.world.sampleProduct('height', x, z) >= want) break;
    }
    bodies.clear();
    for (const t of interaction.tiles.tiles) interaction.tiles.retire(t);
    const R = opts.radius ?? 0.6;
    const sunAz = (s.sky.sunAzimuthDeg * Math.PI) / 180;
    // Look roughly toward the sun (forward-scattered light, glints) but off its glare.
    const look = sunAz - 0.5;
    const fwd: [number, number] = [Math.cos(look), Math.sin(look)];
    const side: [number, number] = [-fwd[1], fwd[0]];
    const at: Vec3 = [x, 0, z];
    if (scene === 'tow') {
      const start: Vec3 = [x - side[0] * 9, 0, z - side[1] * 9];
      bodies.spawnSphere(start, R, { kind: 'tow', dir: side, speed: 2.2, amp: 0, period: 1 });
    } else if (scene === 'bob') bodies.spawnSphere(at, R, { kind: 'bob', dir: [1, 0], speed: 0, amp: 0.35, period: 1.4 });
    else if (scene === 'plunge') bodies.spawnSphere(at, R, { kind: 'plunge', dir: [1, 0], speed: 0, amp: 1.0, period: 2.5 });
    else if (scene === 'rock') bodies.dropRock(at);
    else {
      const b = bodies.spawnSphere([x, 3, z], R);
      b.vel = [0, -2, 0];
    }
    interaction.requestTile([x, z], `lab:${scene}`, bodies.bodies[0]?.id, true);
    const dist = 12, h = 3.2;
    e.camera.setPose({
      position: [x - fwd[0] * dist, h, z - fwd[1] * dist],
      yawDeg: (look * 180) / Math.PI, pitchDeg: (-Math.atan2(h, dist) * 180) / Math.PI + 1.5, fovDeg: 55,
    });
  });
  engine.onPick = (w) => { if (w) oceanActions.click(engine, w); };
  const mods = { world, shore, bodies, interaction, splash };
  (window as unknown as { __THALASSA_MODULES__: StandardModules }).__THALASSA_MODULES__ = mods;
  return mods;
}
