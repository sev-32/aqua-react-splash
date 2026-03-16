import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { cubeVertexShader, cubeFragmentShader } from '../shaders/waterShaders';

interface PoolEnvironmentProps {
  waterTexture: THREE.Texture | undefined;
  causticsTexture: THREE.Texture | undefined;
  tilesTexture: THREE.Texture;
  light: THREE.Vector3;
  sphereCenter: THREE.Vector3;
  sphereRadius: number;
}

function createOpenPoolGeometry() {
  const positions = new Float32Array([
    // bottom (original cube y = 1.0)
    -1, 1, -1,  1, 1, -1,  1, 1, 1,
    -1, 1, -1,  1, 1, 1,  -1, 1, 1,
    // left wall
    -1, -1, -1, -1, 1, -1, -1, 1, 1,
    -1, -1, -1, -1, 1, 1, -1, -1, 1,
    // right wall
     1, -1, 1,  1, 1, 1,  1, 1, -1,
     1, -1, 1,  1, 1, -1,  1, -1, -1,
    // back wall
    -1, -1, -1,  1, -1, -1,  1, 1, -1,
    -1, -1, -1,  1, 1, -1, -1, 1, -1,
    // front wall
     1, -1, 1, -1, -1, 1, -1, 1, 1,
     1, -1, 1, -1, 1, 1,  1, 1, 1,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function PoolEnvironment({
  waterTexture,
  causticsTexture,
  tilesTexture,
  light,
  sphereCenter,
  sphereRadius,
}: PoolEnvironmentProps) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: cubeVertexShader,
      fragmentShader: cubeFragmentShader,
      uniforms: {
        uWater: { value: null },
        uTiles: { value: tilesTexture },
        uCaustics: { value: null },
        uLight: { value: new THREE.Vector3() },
        uSphereCenter: { value: new THREE.Vector3() },
        uSphereRadius: { value: 0.25 },
        uPoolHeight: { value: 1.0 },
      },
      side: THREE.DoubleSide,
    });
  }, [tilesTexture]);

  useFrame(() => {
    if (waterTexture) material.uniforms.uWater.value = waterTexture;
    if (causticsTexture) material.uniforms.uCaustics.value = causticsTexture;
    material.uniforms.uLight.value.copy(light);
    material.uniforms.uSphereCenter.value.copy(sphereCenter);
    material.uniforms.uSphereRadius.value = sphereRadius;
  });

  const geometry = useMemo(() => createOpenPoolGeometry(), []);

  return <mesh geometry={geometry} material={material} />;
}
