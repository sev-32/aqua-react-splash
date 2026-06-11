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
  const meshRef = useRef<THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>>(null!);

  const { geometry, positions, velocities, densities, foam } = useMemo(() => {
    const maxInstances = solver.particles.capacity;
    const geom = new THREE.InstancedBufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(18), 3));
    geom.setAttribute('corner', new THREE.BufferAttribute(new Float32Array([
      0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
      0.5, 0.5, -0.5, -0.5, -0.5, 0.5,
    ]), 2));

    const pos = new Float32Array(maxInstances * 3);
    const vel = new Float32Array(maxInstances * 3);
    const den = new Float32Array(maxInstances);
    const foamAttr = new Float32Array(maxInstances);
    geom.setAttribute('aPosition', new THREE.InstancedBufferAttribute(pos, 3));
    geom.setAttribute('aVelocity', new THREE.InstancedBufferAttribute(vel, 3));
    geom.setAttribute('aDensity', new THREE.InstancedBufferAttribute(den, 1));
    geom.setAttribute('aFoam', new THREE.InstancedBufferAttribute(foamAttr, 1));
    geom.instanceCount = 0;
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.1, 0), 2.2);
    return { geometry: geom, positions: pos, velocities: vel, densities: den, foam: foamAttr };
  }, [solver]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: fluidVertexShader,
    fragmentShader: fluidFragmentShader,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uFluidColor: { value: WATER_COLOR },
      uFoamColor: { value: FOAM_COLOR },
      uLight: { value: new THREE.Vector3() },
      uMinParticleSize: { value: 0.045 },
      uSphereSize: { value: 0.11 },
      uExposureScaleMin: { value: 0.7 },
      uExposureScaleMax: { value: 2.2 },
      uExposureScaleDensity: { value: 0.5 },
      uElongationEnabled: { value: 0.0 },
      uElongationMax: { value: 1.0 },
      uElongationSpeedFactor: { value: 0.0 },
      uParticleAlpha: { value: 0.98 },
    },
  }), []);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(() => {
    const P = solver.particles;
    let emitted = 0;
    const maxInstances = P.capacity;
    for (let i = 0; i < P.count && emitted < maxInstances; i++) {
      const fl = P.flags[i];
      if (!(fl & FLAG_ALIVE)) continue;
      const p3 = emitted * 3;
      positions[p3] = P.px[i];
      positions[p3 + 1] = P.py[i];
      positions[p3 + 2] = P.pz[i];
      velocities[p3] = P.vx[i];
      velocities[p3 + 1] = P.vy[i];
      velocities[p3 + 2] = P.vz[i];
      densities[emitted] = Math.max(0.1, P.density[i]);
      foam[emitted] = fl & FLAG_FOAM ? 1 : 0;
      emitted++;
    }

    geometry.instanceCount = emitted;
    geometry.attributes.aPosition.needsUpdate = true;
    geometry.attributes.aVelocity.needsUpdate = true;
    geometry.attributes.aDensity.needsUpdate = true;
    geometry.attributes.aFoam.needsUpdate = true;
    material.uniforms.uLight.value.copy(light);
    if (meshRef.current) meshRef.current.visible = emitted > 0;
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}