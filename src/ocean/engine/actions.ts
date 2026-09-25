import type { OceanEngine } from './OceanEngine';
import type { Vec3 } from '../math/mat4';

/**
 * UI → engine actions. Modules register handlers by name so the panel never
 * needs to know which subsystems are installed.
 */
type Handler = (engine: OceanEngine, arg?: unknown) => void;
const handlers = new Map<string, Handler>();

export const registerAction = (name: string, fn: Handler) => handlers.set(name, fn);
const run = (name: string, engine: OceanEngine, arg?: unknown) => handlers.get(name)?.(engine, arg);

export const oceanActions = {
  clickMode: 'rock' as 'rock' | 'boat' | 'buoy' | 'ripple',
  spawnBoat: (e: OceanEngine, at?: Vec3) => run('spawnBoat', e, at),
  dropRock: (e: OceanEngine, at?: Vec3) => run('dropRock', e, at),
  spawnBuoys: (e: OceanEngine, at?: Vec3) => run('spawnBuoys', e, at),
  ripple: (e: OceanEngine, at?: Vec3) => run('ripple', e, at),
  clearBodies: (e: OceanEngine) => run('clearBodies', e),
  goToShore: (e: OceanEngine, view?: 'surf' | 'beach' | 'aerial') => run('goToShore', e, view),
  frameBody: (e: OceanEngine, arg?: unknown) => run('frameBody', e, arg),
  /** Interaction lab (glassy shelf + the pool's sphere): 'drop' | 'tow' | 'bob' | 'plunge' | 'rock'. */
  lab: (e: OceanEngine, arg?: unknown) => run('lab', e, arg),
  /** Dispatch a click on the sea according to the current click mode. */
  click(e: OceanEngine, at: Vec3) {
    if (this.clickMode === 'rock') this.dropRock(e, at);
    else if (this.clickMode === 'boat') this.spawnBoat(e, at);
    else if (this.clickMode === 'buoy') this.spawnBuoys(e, at);
    else this.ripple(e, at);
  },
};
