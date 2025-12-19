import { useMemo } from 'react';
import * as THREE from 'three';
import { cubeVertexShader, cubeFragmentShader } from '../shaders/waterShaders';

interface PoolEnvironmentProps {
  waterTexture: THREE.Texture | undefined;
  causticsTexture: THREE.Texture | undefined;
  light: THREE.Vector3;
  sphereCenter: THREE.Vector3;
  sphereRadius: number;
}

export function PoolEnvironment({
  waterTexture,
  causticsTexture,
  light,
  sphereCenter,
  sphereRadius,
}: PoolEnvironmentProps) {
  // Create procedural tile texture
  const tileTexture = useMemo(() => {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = (i * size + j) * 4;
        const tileSize = 32;
        const isEdge = (i % tileSize < 2) || (j % tileSize < 2);
        const baseColor = isEdge ? 80 : 160;
        const variation = Math.random() * 20;
        
        data[idx] = baseColor * 0.6 + variation;     // R
        data[idx + 1] = baseColor * 0.8 + variation; // G
        data[idx + 2] = baseColor + variation;       // B
        data[idx + 3] = 255;
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);
  
  // Pool cube material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: cubeVertexShader,
      fragmentShader: cubeFragmentShader,
      uniforms: {
        uWater: { value: null },
        uTiles: { value: tileTexture },
        uCaustics: { value: null },
        uLight: { value: new THREE.Vector3() },
        uSphereCenter: { value: new THREE.Vector3() },
        uSphereRadius: { value: 0.25 },
      },
      side: THREE.BackSide,
    });
  }, [tileTexture]);
  
  // Update uniforms
  useMemo(() => {
    if (waterTexture) material.uniforms.uWater.value = waterTexture;
    if (causticsTexture) material.uniforms.uCaustics.value = causticsTexture;
    material.uniforms.uLight.value.copy(light);
    material.uniforms.uSphereCenter.value.copy(sphereCenter);
    material.uniforms.uSphereRadius.value = sphereRadius;
  }, [waterTexture, causticsTexture, light, sphereCenter, sphereRadius, material]);
  
  // Create pool box geometry (inverted cube)
  const geometry = useMemo(() => {
    return new THREE.BoxGeometry(2, 2, 2);
  }, []);
  
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, -0.5, 0]}
    />
  );
}
