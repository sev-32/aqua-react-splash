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
  MpmSurfaceSampler,
  vec3ToProbe,
  POOL_RIM_Y,
} from '../lib/mlsmpm';
import { waterStore } from '../lib/waterStore';

export interface MpmHandle {
  solver: MlsMpmSolver;
  /** Run one physics step. */
  step: (dt: number, sphere?: SphereProbe, surface?: MpmSurfaceSampler) => void;
  /** Convenience: spawn helpers. */
  crown: (cx: number, cz: number, impactSpeed: number) => void;
  sheet: (cx: number, cz: number, yStart: number, upSpeed: number) => void;
  impact: (cx: number, cz: number, energy?: number, count?: number) => void;
  breach: (cx: number, cy: number, cz: number, radius: number, vx: number, vy: number, vz: number, intensity?: number) => void;
  /** Drain settle events; calls onSettle(x,z,strength) for each. */
  drainSettleEvents: (onSettle: (x: number, z: number, strength: number) => void) => void;
  /** Live count of alive particles, for telemetry. */
  liveCount: () => number;
  /** Probe builder mirroring solver expectations. */
  buildProbe: (pos: THREE.Vector3, vel: THREE.Vector3, radius: number) => SphereProbe;
}

export function useMlsMpm(maxParticles = 9000): MpmHandle {
  const solver = useMemo(() => new MlsMpmSolver(maxParticles), [maxParticles]);
  const handleRef = useRef<MpmHandle>(null!);

  if (!handleRef.current) {
    handleRef.current = {
      solver,
      step: (dt, sphere, surface) => solver.step(dt, sphere, surface),
      crown: (cx, cz, impactSpeed) => {
        const p = waterStore.get().mpmParams;
        if (impactSpeed < p.spawnThreshold) return;
        solver.spawnCrown(cx, cz, impactSpeed, Math.round(72 * p.spawnCountMultiplier));
      },
      sheet: (cx, cz, yStart, upSpeed) => {
        const p = waterStore.get().mpmParams;
        if (upSpeed < p.spawnThreshold) return;
        solver.spawnSheet(cx, cz, yStart, upSpeed, Math.round(54 * p.spawnCountMultiplier));
      },
      impact: (cx, cz, energy = 1.0, count = 20) => {
        const p = waterStore.get().mpmParams;
        if (energy < p.spawnThreshold) return;
        solver.spawnImpact(cx, cz, energy, Math.round(count * p.spawnCountMultiplier));
      },
      breach: (cx, cy, cz, radius, vx, vy, vz, intensity = 1.0) => {
        const p = waterStore.get().mpmParams;
        if (Math.hypot(vx, vy, vz) * intensity < p.spawnThreshold) return;
        solver.spawnSphereBreach(cx, cy, cz, radius, vx, vy, vz, intensity * p.spawnCountMultiplier);
      },
      drainSettleEvents: (onSettle) => {
        for (const e of solver.settleEvents) {
          // Map vertical impact velocity to a small ripple strength.
          // Negative vy = downward = bigger splash.
          const p = waterStore.get().mpmParams;
          const speed = Math.min(8, Math.abs(e.vy));
          const strength = Math.min(0.08, 0.0018 * Math.pow(speed, 1.5) * Math.max(0.5, e.weight) * p.splashBackGain) * Math.sign(e.vy || -1) * -1;
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
