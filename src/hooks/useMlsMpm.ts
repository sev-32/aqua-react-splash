/**
 * useMlsMpm — owns the MLS-MPM solver lifecycle, runs the per-frame step,
 * exposes spawn helpers + the live particle buffer for the renderer, and
 * forwards settle events back into the height field as small ripple drops.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  MlsMpmSolver,
  SphereProbe,
  vec3ToProbe,
  POOL_RIM_Y,
} from '../lib/mlsmpm';

export interface MpmHandle {
  solver: MlsMpmSolver;
  /** Run one physics step. */
  step: (dt: number, sphere?: SphereProbe) => void;
  /** Convenience: spawn helpers. */
  crown: (cx: number, cz: number, impactSpeed: number) => void;
  sheet: (cx: number, cz: number, yStart: number, upSpeed: number) => void;
  impact: (cx: number, cz: number, energy?: number) => void;
  /** Drain settle events; calls onSettle(x,z,strength) for each. */
  drainSettleEvents: (onSettle: (x: number, z: number, strength: number) => void) => void;
  /** Live count of alive particles, for telemetry. */
  liveCount: () => number;
  /** Probe builder mirroring solver expectations. */
  buildProbe: (pos: THREE.Vector3, vel: THREE.Vector3, radius: number) => SphereProbe;
}

export function useMlsMpm(maxParticles = 6000): MpmHandle {
  const solver = useMemo(() => new MlsMpmSolver(maxParticles), [maxParticles]);
  const handleRef = useRef<MpmHandle>(null!);

  if (!handleRef.current) {
    handleRef.current = {
      solver,
      step: (dt, sphere) => solver.step(dt, sphere),
      crown: (cx, cz, impactSpeed) => solver.spawnCrown(cx, cz, impactSpeed),
      sheet: (cx, cz, yStart, upSpeed) => solver.spawnSheet(cx, cz, yStart, upSpeed),
      impact: (cx, cz, energy = 1.0) => solver.spawnImpact(cx, cz, energy),
      drainSettleEvents: (onSettle) => {
        for (const e of solver.settleEvents) {
          // Map vertical impact velocity to a small ripple strength.
          // Negative vy = downward = bigger splash.
          const speed = Math.min(6, Math.abs(e.vy));
          const strength = Math.min(0.025, 0.0015 * speed) * Math.sign(e.vy || -1) * -1;
          onSettle(e.x, e.z, strength);
        }
        solver.settleEvents.length = 0;
      },
      liveCount: () => {
        const f = solver.particles.flags;
        let n = 0;
        for (let i = 0; i < solver.particles.count; i++) if (f[i] & 1) n++;
        return n;
      },
      buildProbe: vec3ToProbe,
    };
  }

  useEffect(() => () => {
    // GC handled by JS — Float32Array + objects.
  }, []);

  return handleRef.current;
}

export { POOL_RIM_Y };
