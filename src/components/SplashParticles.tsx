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
  FLAG_MELTING,
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
    const mesh = new MarchingCubes(44, material, false, false, 70000);
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
    const params = waterStore.get().mpmParams;
    surface.reset();
    surface.isolation = params.metaballIsolation;

    let samples = 0;
    for (let i = 0; i < P.count && samples < MAX_SURFACE_SAMPLES; i++) {
      const fl = P.flags[i];
      if (!(fl & FLAG_ALIVE)) continue;
      if (P.py[i] < -0.08 || P.py[i] > MPM_DOMAIN_Y_MAX - 0.03) continue;

      S.ids[samples] = i;
      samples++;
    }

    S.connectivity.update(S.ids, samples, P.px, P.py, P.pz, params, 1 / 60);

    for (let n = 0; n < samples; n++) {
      const i = S.ids[n];
      const fl = P.flags[i];
      const speed = Math.hypot(P.vx[i], P.vy[i], P.vz[i]);
      const densityBoost = Math.min(0.16, Math.max(0, (P.density[i] - 1.5) * 0.035));
      const isFoam = (fl & FLAG_FOAM) !== 0;
      const strength = (0.16 + densityBoost * 0.55 + Math.min(0.055, speed * 0.008) + (isFoam ? 0.018 : 0)) * params.particleSize;
      const subtract = Math.max(12, 28 / Math.max(0.2, params.particleSize));
      surface.addBall(toMarchX(P.px[i]), toMarchY(P.py[i]), toMarchZ(P.pz[i]), strength, subtract);
    }

    for (const c of S.connectivity.connections.values()) {
      const stretch = Math.max(0, Math.min(1, (c.distance - params.formRadius) / Math.max(1e-5, params.breakRadius - params.formRadius)));
      const samplesAlong = Math.max(1, Math.round(params.tendrilSamples * (1 + stretch)));
      for (let s = 1; s <= samplesAlong; s++) {
        const t = s / (samplesAlong + 1);
        const waist = Math.pow(Math.sin(Math.PI * t), params.tendrilThinPower);
        const strength = (0.025 + 0.065 * c.strength) * waist * params.particleSize;
        const subtract = 30 + 18 * stretch;
        surface.addBall(
          toMarchX(P.px[c.a] + (P.px[c.b] - P.px[c.a]) * t),
          toMarchY(P.py[c.a] + (P.py[c.b] - P.py[c.a]) * t),
          toMarchZ(P.pz[c.a] + (P.pz[c.b] - P.pz[c.a]) * t),
          strength,
          subtract,
        );
      }
    }

    if (waterTexture) material.uniforms.water.value = waterTexture;
    if (causticsTexture) material.uniforms.causticTex.value = causticsTexture;
    material.uniforms.eye.value.copy(eye);
    material.uniforms.light.value.copy(light);
    material.uniforms.sphereCenter.value.copy(sphereCenter);
    material.uniforms.sphereRadius.value = sphereRadius;
    material.uniforms.uReflectionStrength.value = params.reflectionStrength;
    material.uniforms.uRefractionStrength.value = params.refractionStrength;
    material.uniforms.uColorMix.value = params.colorMix;

    surface.visible = samples > 0;
    if (samples > 0) surface.update();
  });

  return <primitive object={surface} />;
}