/**
 * SplashParticles — instanced renderer for MLS-MPM particles.
 *
 * Each particle is a camera-facing quad (billboard) with a soft circular
 * fragment splat. Color is derived from the existing height-field water
 * palette (deep cyan, fresnel-brightened with sun direction) plus a
 * white foam highlight for FLAG_FOAM particles. Foam particles use
 * additive blending; bulk water uses normal alpha for proper depth.
 *
 * Per-frame, we update three InstancedBufferAttributes from the SoA
 * particle storage: aOffset (position), aSize, aAlpha.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MlsMpmSolver, FLAG_ALIVE, FLAG_FOAM } from '../lib/mlsmpm';

interface SplashParticlesProps {
  solver: MlsMpmSolver;
  light: THREE.Vector3;
}

const MAX_RENDER_PARTICLES = 9000;

const vert = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec3 aVelocity;
  attribute float aSize;
  attribute float aAlpha;
  attribute float aFoam;

  varying float vAlpha;
  varying float vFoam;
  varying float vSpeed;
  varying vec2 vUv;

  void main() {
    vUv = uv * 2.0 - 1.0;
    vAlpha = aAlpha;
    vFoam = aFoam;
    vSpeed = length(aVelocity);

    // Camera-facing anisotropic splat: velocity stretches water into sheets/streaks.
    vec4 mvCenter = modelViewMatrix * vec4(aOffset, 1.0);
    vec2 vel = (modelViewMatrix * vec4(aVelocity, 0.0)).xy;
    vec2 tangent = length(vel) > 0.0001 ? normalize(vel) : vec2(1.0, 0.0);
    vec2 bitangent = vec2(-tangent.y, tangent.x);
    float major = aSize * mix(2.7, 4.6, clamp(vSpeed * 0.12, 0.0, 1.0));
    float minor = aSize * mix(0.68, 1.05, aFoam);
    mvCenter.xy += tangent * position.x * major + bitangent * position.y * minor;
    gl_Position = projectionMatrix * mvCenter;
  }
`;

const frag = /* glsl */ `
  precision highp float;
  uniform vec3 uLight;
  uniform vec3 uWaterDeep;
  uniform vec3 uWaterShallow;
  uniform vec3 uFoamColor;

  varying float vAlpha;
  varying float vFoam;
  varying vec2 vUv;

  void main() {
    float r2 = dot(vUv, vUv);
    if (r2 > 1.0) discard;
    // Soft falloff: bright core, smooth edge
    float core = exp(-r2 * 3.0);
    float edge = smoothstep(1.0, 0.6, r2);

    // Approximate normal of a sphere splat for fake lighting
    vec3 n = vec3(vUv.x, vUv.y, sqrt(max(0.0, 1.0 - r2)));
    float lambert = clamp(dot(n, normalize(uLight)) * 0.5 + 0.5, 0.0, 1.0);

    // Water tint: shallow at edges, deep at core, lit by sun
    vec3 waterColor = mix(uWaterDeep, uWaterShallow, edge);
    vec3 lit = waterColor * (0.45 + 0.85 * lambert);

    // Foam: white core, additive feel
    vec3 foamCol = uFoamColor * (0.55 + 0.6 * lambert);
    vec3 col = mix(lit, foamCol, vFoam);

    // Fake fresnel rim for glassy droplets (non-foam)
    float rim = pow(1.0 - n.z, 3.0);
    col += (1.0 - vFoam) * vec3(0.6, 0.85, 1.0) * rim * 0.35;

    float a = vAlpha * (core * 0.85 + edge * 0.4);
    a = mix(a, vAlpha * (core * 1.1 + edge * 0.6), vFoam); // foam reads brighter
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

export function SplashParticles({ solver, light }: SplashParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);

  // Geometry: a unit quad in XY centered at origin
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    return g;
  }, []);

  // Per-instance attribute arrays
  const buffers = useMemo(() => {
    const offsets = new Float32Array(MAX_RENDER_PARTICLES * 3);
    const sizes = new Float32Array(MAX_RENDER_PARTICLES);
    const alphas = new Float32Array(MAX_RENDER_PARTICLES);
    const foam = new Float32Array(MAX_RENDER_PARTICLES);
    const aOffset = new THREE.InstancedBufferAttribute(offsets, 3).setUsage(THREE.DynamicDrawUsage);
    const aSize = new THREE.InstancedBufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage);
    const aAlpha = new THREE.InstancedBufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage);
    const aFoam = new THREE.InstancedBufferAttribute(foam, 1).setUsage(THREE.DynamicDrawUsage);
    return { offsets, sizes, alphas, foam, aOffset, aSize, aAlpha, aFoam };
  }, []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uLight: { value: new THREE.Vector3() },
      uWaterDeep: { value: new THREE.Color(0.05, 0.20, 0.32) },
      uWaterShallow: { value: new THREE.Color(0.32, 0.78, 0.95) },
      uFoamColor: { value: new THREE.Color(0.95, 0.97, 1.0) },
    },
  }), []);

  // Build instanced geometry once — attach attributes
  const instancedGeometry = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    g.index = geometry.index;
    g.attributes.position = geometry.attributes.position;
    g.attributes.uv = geometry.attributes.uv;
    g.attributes.normal = geometry.attributes.normal;
    g.setAttribute('aOffset', buffers.aOffset);
    g.setAttribute('aSize', buffers.aSize);
    g.setAttribute('aAlpha', buffers.aAlpha);
    g.setAttribute('aFoam', buffers.aFoam);
    g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5);
    return g;
  }, [geometry, buffers]);

  useEffect(() => () => {
    geometry.dispose();
    instancedGeometry.dispose();
    material.dispose();
  }, [geometry, instancedGeometry, material]);

  useFrame(() => {
    material.uniforms.uLight.value.copy(light);

    const P = solver.particles;
    const { offsets, sizes, alphas, foam } = buffers;
    let n = 0;
    const cap = Math.min(P.count, MAX_RENDER_PARTICLES);

    for (let i = 0; i < cap; i++) {
      const fl = P.flags[i];
      if (!(fl & FLAG_ALIVE)) continue;

      const o = n * 3;
      offsets[o] = P.px[i];
      offsets[o + 1] = P.py[i];
      offsets[o + 2] = P.pz[i];

      // Size scales with velocity (motion blur feel) + base size
      const vx = P.vx[i], vy = P.vy[i], vz = P.vz[i];
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      const isFoam = (fl & FLAG_FOAM) ? 1.0 : 0.0;
      const base = isFoam ? 0.040 : 0.028;
      sizes[n] = base + Math.min(0.045, speed * 0.0085);

      // Fade in over first 60ms, fade out in last 25% of life
      const life = P.life[i];
      const fadeIn = Math.min(1, life / 0.06);
      const fadeOut = Math.min(1, Math.max(0, (4.5 - life) / (4.5 * 0.25)));
      alphas[n] = 0.85 * fadeIn * fadeOut;
      foam[n] = isFoam;
      n++;
    }

    buffers.aOffset.needsUpdate = true;
    buffers.aSize.needsUpdate = true;
    buffers.aAlpha.needsUpdate = true;
    buffers.aFoam.needsUpdate = true;
    instancedGeometry.instanceCount = n;
  });

  return (
    <mesh geometry={instancedGeometry as unknown as THREE.BufferGeometry} material={material} frustumCulled={false} renderOrder={5} />
  );
}
