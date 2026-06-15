import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MarchingCubes } from 'three-stdlib';
import { splashWaterFragmentShader, splashWaterVertexShader } from '../shaders/waterShaders';
import { MpmConnectivityGraph } from '../lib/mpmConnectivity';
import { waterStore } from '../lib/waterStore';
import {
  MlsMpmSolver,
  FLAG_ALIVE,
  FLAG_FOAM,
  MPM_DOMAIN_XZ_MIN,
  MPM_DOMAIN_XZ_MAX,
  MPM_DOMAIN_Y_MIN,
  MPM_DOMAIN_Y_MAX,
} from '../lib/mlsmpm';

interface SplashParticlesProps {
  solver: MlsMpmSolver;
  light: THREE.Vector3;
  waterTexture: THREE.Texture | undefined;
  causticsTexture: THREE.Texture | undefined;
  tilesTexture: THREE.Texture;
  skyTexture: THREE.CubeTexture;
  eye: THREE.Vector3;
  sphereCenter: THREE.Vector3;
  sphereRadius: number;
}

const DOMAIN_XZ_SIZE = MPM_DOMAIN_XZ_MAX - MPM_DOMAIN_XZ_MIN;
const DOMAIN_Y_SIZE = MPM_DOMAIN_Y_MAX - MPM_DOMAIN_Y_MIN;
const DOMAIN_CENTER_Y = (MPM_DOMAIN_Y_MIN + MPM_DOMAIN_Y_MAX) * 0.5;
const MAX_SURFACE_SAMPLES = 900;

const clamp01 = (v: number) => Math.max(0.001, Math.min(0.999, v));
const toMarchX = (x: number) => clamp01((x - MPM_DOMAIN_XZ_MIN) / DOMAIN_XZ_SIZE);
const toMarchY = (y: number) => clamp01((y - MPM_DOMAIN_Y_MIN) / DOMAIN_Y_SIZE);
const toMarchZ = (z: number) => clamp01((z - MPM_DOMAIN_XZ_MIN) / DOMAIN_XZ_SIZE);

export function SplashParticles({
  solver,
  light,
  waterTexture,
  causticsTexture,
  tilesTexture,
  skyTexture,
  eye,
  sphereCenter,
  sphereRadius,
}: SplashParticlesProps) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: splashWaterVertexShader,
    fragmentShader: splashWaterFragmentShader,
    uniforms: {
      water: { value: null as THREE.Texture | null },
      tiles: { value: tilesTexture },
      causticTex: { value: null as THREE.Texture | null },
      sky: { value: skyTexture },
      eye: { value: new THREE.Vector3() },
      light: { value: new THREE.Vector3() },
      sphereCenter: { value: new THREE.Vector3() },
      sphereRadius: { value: sphereRadius },
      uReflectionStrength: { value: 1.0 },
      uRefractionStrength: { value: 1.0 },
      uColorMix: { value: 1.0 },
    },
    side: THREE.DoubleSide,
    depthWrite: true,
  }), [tilesTexture, skyTexture, sphereRadius]);

  const surface = useMemo(() => {
    const mesh = new MarchingCubes(34, material, false, false, 70000);
    mesh.isolation = 80;
    mesh.position.set(0, DOMAIN_CENTER_Y, 0);
    mesh.scale.set(DOMAIN_XZ_SIZE * 0.5, DOMAIN_Y_SIZE * 0.5, DOMAIN_XZ_SIZE * 0.5);
    mesh.frustumCulled = false;
    mesh.renderOrder = 4;
    mesh.visible = false;
    return mesh;
  }, [material]);

  const scratch = useRef({
    ids: new Int32Array(MAX_SURFACE_SAMPLES),
    connectivity: new MpmConnectivityGraph(),
  });

  useEffect(() => () => {
    surface.geometry.dispose();
    material.dispose();
  }, [surface, material]);

  useFrame(() => {
    const P = solver.particles;
    const S = scratch.current;
    const buckets = S.hash;
    buckets.clear();
    surface.reset();

    let samples = 0;
    let bridges = 0;
    let foamSamples = 0;
    for (let i = 0; i < P.count && samples < MAX_SURFACE_SAMPLES; i++) {
      const fl = P.flags[i];
      if (!(fl & FLAG_ALIVE)) continue;
      if (P.py[i] < -0.08 || P.py[i] > MPM_DOMAIN_Y_MAX - 0.03) continue;

      const wx = P.px[i];
      const wy = P.py[i];
      const wz = P.pz[i];
      const nx = clamp01((wx - MPM_DOMAIN_XZ_MIN) / DOMAIN_XZ_SIZE);
      const ny = clamp01((wy - MPM_DOMAIN_Y_MIN) / DOMAIN_Y_SIZE);
      const nz = clamp01((wz - MPM_DOMAIN_XZ_MIN) / DOMAIN_XZ_SIZE);
      const speed = Math.hypot(P.vx[i], P.vy[i], P.vz[i]);
      const densityBoost = Math.min(0.16, Math.max(0, (P.density[i] - 1.5) * 0.035));
      const isFoam = (fl & FLAG_FOAM) !== 0;
      const strength = 0.36 + densityBoost + Math.min(0.12, speed * 0.018) + (isFoam ? 0.04 : 0);
      surface.addBall(nx, ny, nz, strength, 13.5, isFoam ? FOAM_COLOR : WATER_COLOR);

      const sx = samples;
      S.x[sx] = wx;
      S.y[sx] = wy;
      S.z[sx] = wz;
      samples++;
      if (isFoam) foamSamples++;

      const hx = Math.floor(wx / HASH_CELL);
      const hy = Math.floor(wy / HASH_CELL);
      const hz = Math.floor(wz / HASH_CELL);
      for (let ox = -1; ox <= 1 && bridges < MAX_BRIDGES; ox++) {
        for (let oy = -1; oy <= 1 && bridges < MAX_BRIDGES; oy++) {
          for (let oz = -1; oz <= 1 && bridges < MAX_BRIDGES; oz++) {
            const bucket = buckets.get(`${hx + ox},${hy + oy},${hz + oz}`);
            if (!bucket) continue;
            for (let b = 0; b < bucket.length && bridges < MAX_BRIDGES; b++) {
              const j = bucket[b];
              const dx = wx - S.x[j];
              const dy = wy - S.y[j];
              const dz = wz - S.z[j];
              const d = Math.hypot(dx, dy, dz);
              if (d <= 1e-5 || d > BRIDGE_RADIUS) continue;
              const mx = clamp01(((wx + S.x[j]) * 0.5 - MPM_DOMAIN_XZ_MIN) / DOMAIN_XZ_SIZE);
              const my = clamp01(((wy + S.y[j]) * 0.5 - MPM_DOMAIN_Y_MIN) / DOMAIN_Y_SIZE);
              const mz = clamp01(((wz + S.z[j]) * 0.5 - MPM_DOMAIN_XZ_MIN) / DOMAIN_XZ_SIZE);
              surface.addBall(mx, my, mz, 0.16 * (1 - d / BRIDGE_RADIUS) + 0.08, 18, WATER_COLOR);
              bridges++;
            }
          }
        }
      }

      const key = `${hx},${hy},${hz}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(sx);
      else buckets.set(key, [sx]);
    }

    const lightAmount = Math.max(0.05, light.y * 0.08);
    material.emissive.setRGB(0.0, 0.025 + lightAmount, 0.045 + lightAmount);
    material.color.copy(WATER_COLOR).lerp(FOAM_COLOR, Math.min(0.32, foamSamples / Math.max(1, samples) * 0.45));
    surface.visible = samples > 0;
    if (samples > 0) surface.update();
  });

  return <primitive object={surface} />;
}