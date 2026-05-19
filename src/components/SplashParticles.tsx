import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MlsMpmSolver, FLAG_ALIVE, FLAG_FOAM } from '../lib/mlsmpm';

interface SplashParticlesProps {
  solver: MlsMpmSolver;
  light: THREE.Vector3;
}

const WATER_COLOR = new THREE.Color(0.045, 0.34, 0.58);
const FOAM_COLOR = new THREE.Color(0.92, 0.98, 1.0);

const fluidVertexShader = /* glsl */ `
  attribute vec2 corner;
  attribute vec3 aPosition;
  attribute vec3 aVelocity;
  attribute float aDensity;
  attribute float aFoam;

  uniform float uMinParticleSize;
  uniform float uSphereSize;
  uniform float uExposureScaleMin;
  uniform float uExposureScaleMax;
  uniform float uExposureScaleDensity;
  uniform float uElongationEnabled;
  uniform float uElongationMax;
  uniform float uElongationSpeedFactor;

  varying vec2 vUv;
  varying float vFoam;
  varying float vSpeed;

  void main() {
    float exposureScale = clamp(aDensity * uExposureScaleDensity, uExposureScaleMin, uExposureScaleMax);
    float size = max(uMinParticleSize, uSphereSize * exposureScale);

    vec3 velocityView = (modelViewMatrix * vec4(aVelocity, 0.0)).xyz;
    float speed = length(aVelocity);
    vec2 axis = normalize(velocityView.xy + vec2(0.001));
    float stretchFactor = 1.0 + min(uElongationMax - 1.0, speed * uElongationSpeedFactor);
    vec2 localPos = corner * size;
    float along = dot(localPos, axis);
    vec2 perp = localPos - along * axis;
    vec2 stretched = mix(localPos, perp + axis * (along * stretchFactor), uElongationEnabled);

    vec3 viewPosition = (modelViewMatrix * vec4(aPosition, 1.0)).xyz;
    gl_Position = projectionMatrix * vec4(viewPosition + vec3(stretched, 0.0), 1.0);
    vUv = corner + 0.5;
    vFoam = aFoam;
    vSpeed = speed;
  }
`;

const fluidFragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uFluidColor;
  uniform vec3 uFoamColor;
  uniform vec3 uLight;
  uniform float uParticleAlpha;

  varying vec2 vUv;
  varying float vFoam;
  varying float vSpeed;

  void main() {
    vec2 normalxy = vUv * 2.0 - 1.0;
    float r2 = dot(normalxy, normalxy);
    if (r2 > 1.0) discard;

    float thickness = sqrt(1.0 - r2);
    vec3 normal = normalize(vec3(normalxy, thickness));
    vec3 lightDir = normalize(vec3(uLight.x, max(0.08, uLight.y), abs(uLight.z) + 0.35));
    float diffuse = max(0.0, dot(normal, lightDir));
    float fresnel = pow(1.0 - thickness, 2.2);
    float foam = clamp(vFoam + fresnel * 0.45 + vSpeed * 0.025, 0.0, 1.0);
    vec3 color = mix(uFluidColor, uFoamColor, foam);
    color += vec3(0.18, 0.24, 0.28) * diffuse * thickness;

    float alpha = uParticleAlpha * thickness * (0.72 + 0.38 * diffuse);
    gl_FragColor = vec4(color, alpha);
  }
`;

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