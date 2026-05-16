import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { MlsMpmSolver, FLAG_ALIVE, FLAG_FOAM } from '../lib/mlsmpm';

interface SplashParticlesProps {
  solver: MlsMpmSolver;
  light: THREE.Vector3;
}

type MarchingFluid = MarchingCubes & {
  reset: () => void;
  update: () => void;
  addBall: (x: number, y: number, z: number, strength: number, subtract: number, color?: THREE.Color) => void;
  isolation: number;
};

const DOMAIN_MIN = new THREE.Vector3(-1.16, -0.98, -1.16);
const DOMAIN_SIZE = new THREE.Vector3(2.32, 2.42, 2.32);
const WATER_COLOR = new THREE.Color(0.03, 0.34, 0.62);
const FOAM_COLOR = new THREE.Color(0.92, 0.97, 1.0);

export function SplashParticles({ solver, light }: SplashParticlesProps) {
  const fluidRef = useRef<MarchingFluid>(null!);

  const material = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: WATER_COLOR,
    roughness: 0.02,
    metalness: 0,
    transmission: 0.7,
    thickness: 0.24,
    ior: 1.333,
    transparent: true,
    opacity: 0.78,
    vertexColors: true,
    side: THREE.DoubleSide,
  }), []);

  const fluid = useMemo(() => {
    const mc = new MarchingCubes(34, material, false, true, 18000) as MarchingFluid;
    mc.isolation = 58;
    mc.scale.copy(DOMAIN_SIZE);
    mc.position.copy(DOMAIN_MIN).addScaledVector(DOMAIN_SIZE, 0.5);
    mc.frustumCulled = false;
    mc.renderOrder = 4;
    return mc;
  }, [material]);

  useEffect(() => () => {
    fluid.geometry.dispose();
    material.dispose();
  }, [fluid, material]);

  useFrame(() => {
    const P = solver.particles;
    fluid.reset();

    let emitted = 0;
    const stride = Math.max(1, Math.ceil(P.count / 2600));
    for (let i = 0; i < P.count; i += stride) {
      const fl = P.flags[i];
      if (!(fl & FLAG_ALIVE)) continue;

      const x = (P.px[i] - DOMAIN_MIN.x) / DOMAIN_SIZE.x;
      const y = (P.py[i] - DOMAIN_MIN.y) / DOMAIN_SIZE.y;
      const z = (P.pz[i] - DOMAIN_MIN.z) / DOMAIN_SIZE.z;
      if (x <= 0.02 || x >= 0.98 || y <= 0.02 || y >= 0.98 || z <= 0.02 || z >= 0.98) continue;

      const speed = Math.hypot(P.vx[i], P.vy[i], P.vz[i]);
      const density = Math.max(0.45, Math.min(2.2, P.density[i]));
      const isFoam = !!(fl & FLAG_FOAM);
      const strength = (isFoam ? 0.115 : 0.15) * (0.85 + density * 0.18) * (stride > 1 ? stride * 0.55 : 1);
      const subtract = isFoam ? 16 : 13.5 + Math.min(2.5, speed * 0.28);
      fluid.addBall(x, y, z, strength, subtract, isFoam ? FOAM_COLOR : WATER_COLOR);
      emitted++;
      if (emitted > 3200) break;
    }

    fluid.visible = emitted > 0;
    if (emitted > 0) fluid.update();
    material.envMapIntensity = 0.8 + Math.max(0, light.y) * 0.35;
  });

  return <primitive ref={fluidRef} object={fluid} />;
}