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

export function PoolEnvironment({
  waterTexture,
  causticsTexture,
  tilesTexture,
  light,
  sphereCenter,
  sphereRadius,
}: PoolEnvironmentProps) {
  // Pool cube material with proper Y transform
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
      side: THREE.BackSide,
    });
  }, [tilesTexture]);
  
  // Update uniforms every frame
  useFrame(() => {
    if (waterTexture) material.uniforms.uWater.value = waterTexture;
    if (causticsTexture) material.uniforms.uCaustics.value = causticsTexture;
    material.uniforms.uLight.value.copy(light);
    material.uniforms.uSphereCenter.value.copy(sphereCenter);
    material.uniforms.uSphereRadius.value = sphereRadius;
  });
  
  // Create pool box geometry - CRITICAL: Remove top face like original
  // Original: this.cubeMesh.triangles.splice(4, 2) removes the top face
  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(2, 2, 2);
    
    // BoxGeometry face order: right, left, top, bottom, front, back
    // Each face has 2 triangles = 6 indices
    // Top face is indices 12-17 (faces 4-5 in original indexing)
    // We need to remove the top face triangles
    const indices = geo.getIndex();
    if (indices) {
      const newIndices: number[] = [];
      const array = indices.array;
      for (let i = 0; i < array.length; i += 6) {
        const faceIndex = i / 6;
        // Skip top face (face index 2 in Three.js BoxGeometry)
        if (faceIndex !== 2) {
          for (let j = 0; j < 6; j++) {
            newIndices.push(array[i + j]);
          }
        }
      }
      geo.setIndex(newIndices);
    }
    
    return geo;
  }, []);
  
  return (
    <mesh
      geometry={geometry}
      material={material}
    />
  );
}
