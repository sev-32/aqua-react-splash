/**
 * T4 causal transfer audit.
 *
 * Each accepted return has one destination. Mass is accounted in m³;
 * momentum in kg·m/s and kinetic energy in J (water density = 1000 kg/m³).
 * This is a boundary/transfer audit, NOT proof that T0/T2/T3 conserve
 * momentum or energy: their source operators currently accept primarily
 * displaced height, foam and phase, not the full 3-vector impulse.
 *
 * In particular, a return booked to 'ocean' leaves the finite simulation:
 * it is an explicitly measured open-boundary reservoir, NOT an injection
 * into the T0 spectral solution.
 */

export type ReturnReservoir = 'tiles' | 'shore' | 'ocean';

export interface ParticleBudget {
  emitted: number;  // cumulative m³ transferred into T4
  settled: number;  // cumulative m³ retired by settling
  lost: number;     // cumulative m³ discarded by exceptional/reset paths
  airborne: number; // current live m³ (despite the historic property name)
}

export interface RoutedWater {
  volume: number;
  /** Σ(V·vx), Σ(V·vy), Σ(V·vz) in m4/s, before density scaling. */
  volumeVelocity: readonly [number, number, number];
  /** Σ(V·|velocity|²), used to avoid averaging away kinetic energy. */
  volumeSpeedSquared: number;
}

export interface CausalAudit {
  emitted: number;
  settled: number;
  lost: number;
  live: number;
  routed: number;
  tiles: number;
  shore: number;
  /** Open-boundary water, not dynamically deposited into the spectral sea. */
  oceanBoundary: number;
  /** Nonzero means the particle solver's stock/flow identity failed. */
  solverVolumeResidual: number;
  /** Nonzero means retired particles were not assigned to a reservoir. */
  unroutedVolume: number;
  /** Returned particle impulse; not necessarily injected into receiving solver. */
  returnedImpulse: readonly [number, number, number];
  returnedKineticEnergy: number;
  invalidTransfers: number;
}

export class CausalTransferLedger {
  private baseline: ParticleBudget = { emitted: 0, settled: 0, lost: 0, airborne: 0 };
  private routedVolume = 0;
  private byReservoir: Record<ReturnReservoir, number> = { tiles: 0, shore: 0, ocean: 0 };
  private impulse: [number, number, number] = [0, 0, 0];
  private kineticEnergy = 0;
  private invalidTransfers = 0;

  /** Start a new lab experiment AFTER the MLS-MPM reset. */
  reset(stats: ParticleBudget) {
    this.baseline = { ...stats };
    this.routedVolume = 0;
    this.byReservoir = { tiles: 0, shore: 0, ocean: 0 };
    this.impulse = [0, 0, 0];
    this.kineticEnergy = 0;
    this.invalidTransfers = 0;
  }

  /** Record exactly one accepted return, after a tile/shore sink acknowledges it. */
  route(to: ReturnReservoir, flow: RoutedWater, density = 1000): boolean {
    const { volume, volumeVelocity: v, volumeSpeedSquared: v2 } = flow;
    if (!(volume > 0) || !Number.isFinite(volume) ||
        !v.every(Number.isFinite) || !Number.isFinite(v2) || v2 < 0 ||
        !(density > 0) || !Number.isFinite(density)) {
      this.invalidTransfers++;
      return false;
    }
    this.routedVolume += volume;
    this.byReservoir[to] += volume;
    for (let i = 0; i < 3; i++) this.impulse[i] += density * v[i];
    this.kineticEnergy += 0.5 * density * v2;
    return true;
  }

  audit(stats: ParticleBudget): CausalAudit {
    const emitted = stats.emitted - this.baseline.emitted;
    const settled = stats.settled - this.baseline.settled;
    const lost = stats.lost - this.baseline.lost;
    const live = stats.airborne;
    return {
      emitted, settled, lost, live,
      routed: this.routedVolume,
      tiles: this.byReservoir.tiles,
      shore: this.byReservoir.shore,
      oceanBoundary: this.byReservoir.ocean,
      solverVolumeResidual: emitted - settled - lost - live,
      unroutedVolume: settled - this.routedVolume,
      returnedImpulse: [...this.impulse],
      returnedKineticEnergy: this.kineticEnergy,
      invalidTransfers: this.invalidTransfers,
    };
  }
}
