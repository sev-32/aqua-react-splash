import { describe, expect, it } from 'vitest';
import { CausalTransferLedger } from '../sim/causalLedger';
import { DEFAULT_MPM, OceanMpm, FLAG_ALIVE } from '../sim/oceanMpm';

const empty = { emitted: 0, settled: 0, lost: 0, airborne: 0 };
const flat = { heightAt: () => 0 };

describe('Causal water-transfer accounting', () => {
  it('closes the particle stock and independently closes its routed returns', () => {
    const ledger = new CausalTransferLedger();
    ledger.route('tiles', { volume: 0.25, volumeVelocity: [0.5, -1, 0], volumeSpeedSquared: 5 });
    ledger.route('shore', { volume: 0.35, volumeVelocity: [0, -0.7, 0.35], volumeSpeedSquared: 2.8 });
    ledger.route('ocean', { volume: 0.15, volumeVelocity: [0, -0.3, 0], volumeSpeedSquared: 0.6 });
    const a = ledger.audit({ emitted: 1.2, settled: 0.75, lost: 0.05, airborne: 0.4 });
    expect(a.solverVolumeResidual).toBeCloseTo(0, 12);
    expect(a.unroutedVolume).toBeCloseTo(0, 12);
    expect(a.tiles + a.shore + a.oceanBoundary).toBeCloseTo(0.75, 12);
    expect(a.oceanBoundary).toBeCloseTo(0.15, 12);
    expect(a.returnedImpulse[0]).toBeCloseTo(500, 9);
    expect(a.returnedImpulse[1]).toBeCloseTo(-2000, 9);
    expect(a.returnedImpulse[2]).toBeCloseTo(350, 9);
    expect(a.returnedKineticEnergy).toBeCloseTo(4200, 9);
  });

  it('flags missing surface deposits even when solver mass still closes', () => {
    const ledger = new CausalTransferLedger();
    ledger.route('tiles', { volume: 0.2, volumeVelocity: [0, -0.5, 0], volumeSpeedSquared: 0.5 });
    const a = ledger.audit({ emitted: 1, settled: 0.5, lost: 0, airborne: 0.5 });
    expect(a.solverVolumeResidual).toBeCloseTo(0, 12);
    expect(a.unroutedVolume).toBeCloseTo(0.3, 12);
  });

  it('keeps the open boundary explicit: it is not a T0 heightfield deposit', () => {
    const ledger = new CausalTransferLedger();
    ledger.route('ocean', { volume: 2, volumeVelocity: [1, 0, 0], volumeSpeedSquared: 0.5 });
    const a = ledger.audit({ emitted: 2, settled: 2, lost: 0, airborne: 0 });
    expect(a.oceanBoundary).toBe(2);
    expect(a.tiles).toBe(0);
    expect(a.shore).toBe(0);
  });

  it('resets to the solver cumulative-counter baseline without hiding future leaks', () => {
    const ledger = new CausalTransferLedger();
    ledger.route('tiles', { volume: 3, volumeVelocity: [0, 0, 0], volumeSpeedSquared: 0 });
    ledger.reset({ emitted: 12, settled: 9, lost: 3, airborne: 0 });
    expect(ledger.audit({ emitted: 12, settled: 9, lost: 3, airborne: 0 }).solverVolumeResidual).toBe(0);
    expect(ledger.audit({ emitted: 13, settled: 9, lost: 3, airborne: 0.6 }).solverVolumeResidual).toBeCloseTo(0.4);
    expect(ledger.audit({ emitted: 13, settled: 9, lost: 3, airborne: 0.6 }).unroutedVolume).toBe(0);
  });

  it('rejects malformed transfers rather than representing them as accounted-for water', () => {
    const ledger = new CausalTransferLedger();
    expect(ledger.route('shore', { volume: 1, volumeVelocity: [NaN, 0, 0], volumeSpeedSquared: 2 })).toBe(false);
    const a = ledger.audit({ emitted: 1, settled: 1, lost: 0, airborne: 0 });
    expect(a.invalidTransfers).toBe(1);
    expect(a.unroutedVolume).toBe(1);
  });
});

describe('Particle-capacity overwrite regression', () => {
  it('delivers every overwritten particle volume to the return event stream', () => {
    const mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: 24, maxVolumes: 1 });
    const release = (V: number) =>
      mpm.emitRelease({ x: 0, z: 0, y: 1.6, volume: V, vx: 2, vy: 2, vz: -1 }, 'sheet', 0.5, 0, 24);
    release(1.25);
    expect(mpm.stats.emitted).toBeCloseTo(1.25, 12);
    expect(mpm.stats.settled).toBe(0);
    release(0.75); // forces 24 overwrites BEFORE step()
    expect(mpm.stats.settled).toBeCloseTo(1.25, 12);
    mpm.step(1 / 60, flat, [], 1 / 60);
    const deposited = mpm.settleEvents.reduce((s, e) => s + e.volume, 0);
    expect(deposited).toBeCloseTo(mpm.stats.settled, 9);
    expect(mpm.settleEvents.every((e) => Number.isFinite(e.vx + e.vy + e.vz))).toBe(true);
    expect(mpm.stats.emitted - mpm.stats.settled - mpm.stats.lost - mpm.stats.airborne).toBeCloseTo(0, 9);
  });

  it('does not replay already delivered overwrite settlements in the next frame', () => {
    const mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: 24, maxVolumes: 1 });
    mpm.emitRelease({ x: 0, z: 0, y: 3, volume: 1, vx: 0, vy: 3, vz: 0 }, 'impact', 0.5, 0, 24);
    mpm.emitRelease({ x: 0, z: 0, y: 3, volume: 1, vx: 0, vy: 3, vz: 0 }, 'impact', 0.5, 0, 24);
    mpm.step(1 / 60, flat, [], 1 / 60);
    const first = mpm.settleEvents.reduce((s, e) => s + e.volume, 0);
    expect(first).toBeCloseTo(1, 9);
    mpm.step(1 / 60, flat, [], 2 / 60);
    const second = mpm.settleEvents.reduce((s, e) => s + e.volume, 0);
    expect(second).toBeLessThan(0.01); // new physical re-entries only
  });

  it('clears carried settlement events and live-water stats on scene reset', () => {
    const mpm = new OceanMpm({ ...DEFAULT_MPM, capacity: 24, maxVolumes: 1 });
    mpm.emitRelease({ x: 0, z: 0, y: 3, volume: 1, vx: 0, vy: 3, vz: 0 }, 'impact', 0.5, 0, 24);
    mpm.emitRelease({ x: 0, z: 0, y: 3, volume: 1, vx: 0, vy: 3, vz: 0 }, 'impact', 0.5, 0, 24);
    mpm.reset();
    mpm.step(1 / 60, flat, [], 1 / 60);
    expect(mpm.settleEvents).toHaveLength(0);
    expect(mpm.stats.airborne).toBe(0);
    expect(mpm.stats.alive).toBe(0);
    expect(mpm.particles.flags.some((f) => (f & FLAG_ALIVE) !== 0)).toBe(false);
  });
});
