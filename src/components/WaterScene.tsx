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
import { waterStore, waterCommands } from '../lib/waterStore';
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
  const mpm = useMlsMpm(6000);

  const [initialized, setInitialized] = useState(false);
  const lightDir = useRef(new THREE.Vector3(2.0, 2.0, -1.0).normalize());

  const sphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const oldSphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const sphereVelocity = useRef(new THREE.Vector3());
  const lastSphereY = useRef(sphereCenter.current.y);
  const sphereRadius = 0.25;

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

      // ── Breach detection ────────────────────────────────────────────────
      // Water surface is at y=0. Detect crossings to spawn FX.
      const yPrev = lastSphereY.current;
      const yNow = sphereCenter.current.y;
      const enteredWater = yPrev > 0 && yNow <= 0;
      const exitedWater = yPrev < 0 && yNow >= 0;
      const speed = sphereVelocity.current.length();

      if (enteredWater && speed > 0.5) {
        // Splash IN: crown ring + ripple
        mpm.crown(sphereCenter.current.x, sphereCenter.current.z, speed * intensity);
        waterSim.addDrop(sphereCenter.current.x, sphereCenter.current.z, 0.06, 0.045 * Math.min(2, speed));
        splashCountRef.current += 1;
      } else if (exitedWater && speed > 0.4) {
        // Splash OUT: sheet of trailing droplets + small ripple ring
        mpm.sheet(sphereCenter.current.x, sphereCenter.current.z, 0.0, speed * 0.8 * intensity);
        waterSim.addDrop(sphereCenter.current.x, sphereCenter.current.z, 0.05, -0.018);
        splashCountRef.current += 1;
      }

      // High-velocity wake while submerged: small foam particles trail
      if (yNow < -0.05 && speed > 1.4) {
        // Spawn a tiny bursts of foam every few frames based on speed
        if (Math.random() < Math.min(0.7, (speed - 1.4) * 0.25)) {
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
      mpm.step(dt, probe);

      // ── Re-couple settled particles → height-field as tiny ripples ──────
      mpm.drainSettleEvents((x, z, strength) => {
        // Clamp into pool bounds
        if (Math.abs(x) <= 1 && Math.abs(z) <= 1) {
          waterSim.addDrop(x, z, 0.025, strength);
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

      {/* MLS-MPM splash particles — instanced billboards */}
      <SplashParticles solver={mpm.solver} light={lightDir.current} />
    </group>
  );
}
