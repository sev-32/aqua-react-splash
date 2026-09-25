import type { OceanEngine } from './OceanEngine';
import { BodiesModule } from '../modules/bodiesModule';
import { InteractionModule } from '../modules/interactionModule';
import { registerAction, oceanActions } from './actions';

export interface StandardModules {
  bodies: BodiesModule;
  interaction: InteractionModule;
}

/**
 * Installs the optional subsystems in tier order. Until the scheduler module is
 * installed, bodies request their own interaction tiles (direct JIT policy).
 */
export function installStandardModules(engine: OceanEngine): StandardModules {
  const bodies = engine.addModule(new BodiesModule(engine)) as BodiesModule;
  const interaction = engine.addModule(new InteractionModule(engine, bodies)) as InteractionModule;

  const directTiles = {
    name: 'tile-policy',
    update(e: OceanEngine) {
      if (!e.settings.interaction.tilesEnabled) return;
      for (const b of bodies.bodies) {
        const speed = Math.hypot(b.vel[0], b.vel[1], b.vel[2]);
        const nearWater = Math.abs(b.pos[1]) < 12;
        if (nearWater && (speed > 0.3 || b.age < 3)) interaction.requestTile([b.pos[0], b.pos[2]], `body:${b.label}`, b.id);
      }
      for (const t of interaction.tiles.tiles) {
        if (!t.retiring && !t.followIds.length && e.time - t.lastActive > 14) interaction.tiles.retire(t);
      }
    },
  };
  engine.addModule(directTiles);

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
  engine.onPick = (world) => { if (world) oceanActions.click(engine, world); };
  (window as unknown as { __THALASSA_MODULES__: StandardModules }).__THALASSA_MODULES__ = { bodies, interaction };
  return { bodies, interaction };
}
