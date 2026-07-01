import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useWaterSimulation } from '../hooks/useWaterSimulation';
import { useCaustics } from '../hooks/useCaustics';
import { useMlsMpm } from '../hooks/useMlsMpm';
import { WaterSurface } from './WaterSurface';
import { PoolEnvironment } from './PoolEnvironment';
import { DraggableSphere } from './DraggableSphere';
import { SplashParticles } from './SplashParticles';
import { waterStore, waterCommands, useWaterStore } from '../lib/waterStore';
import { generateProceduralSky, generateTilesTexture } from '../lib/proceduralAssets';

/**
 * WaterScene — orchestrates the hybrid sim.
 *
 * Layers:
 *   1. Height-field GPU sim (existing) — calm pool surface, ripples, refraction.
 *   2. MLS-MPM CPU particle sim (new) — splashes that spawn on impact events
 *      and settle back into the height field as small ripple drops.
 *   3. Sphere two-way coupling — sphere displaces height-field volume AND
 *      pushes particles. On water-line crossings, it spawns crown/sheet
 *      droplets and stamps a strong ripple.
 */
export function WaterScene() {
  const { camera, gl, scene } = useThree();
  const waterSim = useWaterSimulation();
  const caustics = useCaustics();
  const mpm = useMlsMpm(9000);

  const [initialized, setInitialized] = useState(false);
  const lightDir = useRef(new THREE.Vector3(2.0, 2.0, -1.0).normalize());

  const sphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const oldSphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const sphereVelocity = useRef(new THREE.Vector3());
  const lastSphereY = useRef(sphereCenter.current.y);
  const sphereRadius = useWaterStore((s) => s.sphereRadius);
  const poolScale = useWaterStore((s) => s.poolScale);

  const rippleCountRef = useRef(0);
  const splashCountRef = useRef(0);
  const fpsAccum = useRef({ frames: 0, last: performance.now() });
  const lastFrameTime = useRef(performance.now());

  // Procedural assets — no external files.
  const tilesTexture = useMemo(() => generateTilesTexture(512), []);
  const skyTexture = useMemo(() => generateProceduralSky(gl, 512), [gl]);

  // Set the procedural sky as the scene background
  useEffect(() => {
    scene.background = skyTexture;
    return () => { scene.background = null; };
  }, [scene, skyTexture]);

  const seedDrops = (count = 20) => {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      waterSim.addDrop(x, y, 0.03, (i & 1) ? 0.01 : -0.01);
    }
    rippleCountRef.current += count;
    waterStore.set({ rippleCount: rippleCountRef.current });
  };

  useEffect(() => {
    if (!initialized) {
      seedDrops(20);
      const p = sphereCenter.current;
      waterStore.set({ spherePos: [p.x, p.y, p.z] });
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  useEffect(() => {
    const off = waterCommands.on((cmd) => {
      const intensity = waterStore.get().splashIntensity;
      if (cmd === 'reset') {
        rippleCountRef.current = 0;
        splashCountRef.current = 0;
        waterStore.set({ rippleCount: 0, splashEvents: 0 });
        // Kill all live particles
        const P = mpm.solver.particles;
        for (let i = 0; i < P.count; i++) P.kill(i);
        for (let i = 0; i < 8; i++) {
          waterSim.addDrop(Math.random() * 2 - 1, Math.random() * 2 - 1, 0.04, 0.005);
        }
      } else if (cmd === 'storm') {
        seedDrops(40);
        // Storm also spawns scattered splashes
        for (let i = 0; i < 6; i++) {
          const x = (Math.random() * 2 - 1) * 0.85;
          const z = (Math.random() * 2 - 1) * 0.85;
          mpm.impact(x, z, 1.6 * intensity);
          waterSim.addDrop(x, z, 0.04, 0.025);
        }
        splashCountRef.current += 6;
        waterStore.set({ splashEvents: splashCountRef.current });
      } else if (cmd === 'single-drop' || cmd === 'splash') {
        const x = Math.random() * 1.6 - 0.8;
        const z = Math.random() * 1.6 - 0.8;
        waterSim.addDrop(x, z, 0.04, 0.022);
        mpm.impact(x, z, (cmd === 'splash' ? 2.2 : 1.2) * intensity);
        rippleCountRef.current += 1;
        splashCountRef.current += 1;
        waterStore.set({ rippleCount: rippleCountRef.current, splashEvents: splashCountRef.current });
      }
    });
    return () => { off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    if (!initialized) return;

    const state = waterStore.get();
    const intensity = state.splashIntensity;

    // ── Time step ─────────────────────────────────────────────────────────
    const now = performance.now();
    const dt = Math.min(0.033, (now - lastFrameTime.current) / 1000);
    lastFrameTime.current = now;

    // ── Light direction from azimuth + elevation ──────────────────────────
    const az = (state.lightAngle * Math.PI) / 180;
    const el = (state.lightElevation * Math.PI) / 180;
    lightDir.current.set(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    ).normalize();

    if (!state.paused) {
      // ── Sphere velocity (finite difference) ─────────────────────────────
      sphereVelocity.current.subVectors(sphereCenter.current, oldSphereCenter.current).divideScalar(Math.max(dt, 1e-4));

      // ── Breach detection (radius-aware) ─────────────────────────────────
      // Submerged depth = how far the sphere bottom is below y=0 (clamped to diameter).
      const yPrev = lastSphereY.current;
      const yNow = sphereCenter.current.y;
      const subPrev = Math.max(0, Math.min(2 * sphereRadius, sphereRadius - yPrev));
      const subNow  = Math.max(0, Math.min(2 * sphereRadius, sphereRadius - yNow));
      const dSub = subNow - subPrev;             // >0 entering, <0 exiting
      const speed = sphereVelocity.current.length();
      const downSpeed = -sphereVelocity.current.y;
      const upSpeed = sphereVelocity.current.y;

      // Entry: bottom plunges further into water this frame
      if (dSub > 0.005 && downSpeed > 0.4) {
        const energy = downSpeed * (0.5 + subNow / sphereRadius);
        mpm.crown(sphereCenter.current.x, sphereCenter.current.z, energy * intensity);
        mpm.breach(
          sphereCenter.current.x, sphereCenter.current.y, sphereCenter.current.z, sphereRadius,
          sphereVelocity.current.x, sphereVelocity.current.y, sphereVelocity.current.z, intensity,
        );
        waterSim.addDrop(sphereCenter.current.x, sphereCenter.current.z, 0.075, 0.055 * Math.min(2.4, downSpeed));
        splashCountRef.current += 1;
      }
      // Exit: bottom rises out, sheet of water trailing up
      if (dSub < -0.005 && upSpeed > 0.35 && subPrev > 0.02) {
        mpm.sheet(sphereCenter.current.x, sphereCenter.current.z, Math.max(-0.02, yNow - sphereRadius * 0.3), upSpeed * 0.9 * intensity);
        mpm.breach(
          sphereCenter.current.x, sphereCenter.current.y, sphereCenter.current.z, sphereRadius,
          sphereVelocity.current.x, sphereVelocity.current.y, sphereVelocity.current.z, intensity * 0.85,
        );
        waterSim.addDrop(sphereCenter.current.x, sphereCenter.current.z, 0.055, -0.022);
        splashCountRef.current += 1;
      }

      // High-velocity wake while submerged: MLS-MPM foam shed from the waterline
      if (subNow > sphereRadius * 0.28 && speed > 0.75) {
        mpm.breach(
          sphereCenter.current.x, sphereCenter.current.y, sphereCenter.current.z, sphereRadius,
          sphereVelocity.current.x, sphereVelocity.current.y, sphereVelocity.current.z, intensity * 0.35,
        );
      }

      // High-velocity wake while submerged: small foam particles trail
      if (subNow > sphereRadius * 0.4 && speed > 1.2) {
        if (Math.random() < Math.min(0.7, (speed - 1.0) * 0.3)) {
          const back = sphereVelocity.current.clone().normalize().multiplyScalar(-sphereRadius * 0.9);
          mpm.solver.particles.spawn(
            sphereCenter.current.x + back.x + (Math.random() - 0.5) * 0.05,
            Math.min(-0.01, sphereCenter.current.y + 0.05),
            sphereCenter.current.z + back.z + (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.4,
            0.4 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.4,
            true,
          );
        }
      }

      lastSphereY.current = yNow;

      // ── Height-field sphere displacement (existing) ─────────────────────
      waterSim.moveSphere(oldSphereCenter.current, sphereCenter.current, sphereRadius);
      oldSphereCenter.current.copy(sphereCenter.current);

      waterSim.stepSimulation();
      waterSim.stepSimulation();
      waterSim.updateNormals();

      const waterTexture = waterSim.getTexture();
      if (waterTexture) {
        caustics.updateCaustics(waterTexture, lightDir.current, sphereCenter.current, sphereRadius);
      }

      // ── MLS-MPM particle step with sphere coupling ──────────────────────
      const probe = mpm.buildProbe(sphereCenter.current, sphereVelocity.current, sphereRadius);
      mpm.step(dt * Math.max(0.01, state.splashSpeed), probe, { heightAt: waterSim.sampleHeight });

      // ── Re-couple settled particles → height-field as tiny ripples ──────
      mpm.drainSettleEvents((x, z, strength) => {
        // Clamp into pool bounds
        if (Math.abs(x) <= 1 && Math.abs(z) <= 1) {
          waterSim.addDrop(x, z, 0.034, strength);
          rippleCountRef.current += 1;
        }
      });
    }

    // ── Telemetry ─────────────────────────────────────────────────────────
    fpsAccum.current.frames++;
    const dtMs = now - fpsAccum.current.last;
    if (dtMs >= 500) {
      const fps = (fpsAccum.current.frames * 1000) / dtMs;
      waterStore.set({
        fps,
        particleCount: mpm.liveCount(),
        splashEvents: splashCountRef.current,
      });
      fpsAccum.current.frames = 0;
      fpsAccum.current.last = now;
    }
  });

  const handleDropAdd = (x: number, z: number) => {
    waterSim.addDrop(x, z, 0.03, 0.012);
    // User-initiated taps spawn small splash bursts too
    const intensity = waterStore.get().splashIntensity;
    mpm.impact(x, z, 1.0 * intensity, 14);
    rippleCountRef.current += 1;
    splashCountRef.current += 1;
    waterStore.set({
      rippleCount: rippleCountRef.current,
      splashEvents: splashCountRef.current,
    });
  };

  const handleSphereMove = (position: THREE.Vector3) => {
    sphereCenter.current.copy(position);
    waterStore.set({ spherePos: [position.x, position.y, position.z] });
  };

  const waterTexture = waterSim.getTexture();
  const causticsTexture = caustics.getTexture();

  return (
    <group>
      <PoolEnvironment
        waterTexture={waterTexture}
        causticsTexture={causticsTexture}
        tilesTexture={tilesTexture}
        light={lightDir.current}
        sphereCenter={sphereCenter.current}
        sphereRadius={sphereRadius}
      />

      <WaterSurface
        waterTexture={waterTexture}
        causticsTexture={causticsTexture}
        tilesTexture={tilesTexture}
        skyTexture={skyTexture}
        eye={camera.position}
        light={lightDir.current}
        sphereCenter={sphereCenter.current}
        sphereRadius={sphereRadius}
        onDropAdd={handleDropAdd}
      />

      <DraggableSphere
        position={sphereCenter.current}
        radius={sphereRadius}
        waterTexture={waterTexture}
        causticsTexture={causticsTexture}
        tilesTexture={tilesTexture}
        light={lightDir.current}
        onMove={handleSphereMove}
      />

      {/* MLS-MPM splash fluid — implicit connected droplet surface */}
      <SplashParticles
        solver={mpm.solver}
        light={lightDir.current}
        waterTexture={waterTexture}
        causticsTexture={causticsTexture}
        tilesTexture={tilesTexture}
        skyTexture={skyTexture}
        eye={camera.position}
        sphereCenter={sphereCenter.current}
        sphereRadius={sphereRadius}
      />
    </group>
  );
}
