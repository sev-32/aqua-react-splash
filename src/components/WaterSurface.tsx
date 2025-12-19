import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { waterVertexShader, waterFragmentShader } from '../shaders/waterShaders';

interface WaterSurfaceProps {
  waterTexture: THREE.Texture | undefined;
  causticsTexture: THREE.Texture | undefined;
  eye: THREE.Vector3;
  light: THREE.Vector3;
  sphereCenter: THREE.Vector3;
  sphereRadius: number;
  onDropAdd: (x: number, z: number) => void;
}

export function WaterSurface({
  waterTexture,
  causticsTexture,
  eye,
  light,
  sphereCenter,
  sphereRadius,
  onDropAdd,
}: WaterSurfaceProps) {
  const { raycaster, camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Create high-res plane geometry for water
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(2, 2, 200, 200);
  }, []);
  
  // Create procedural tile texture
  const tileTexture = useMemo(() => {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = (i * size + j) * 4;
        // Create tiled pattern
        const tileSize = 32;
        const isEdge = (i % tileSize < 2) || (j % tileSize < 2);
        const baseColor = isEdge ? 100 : 180;
        const variation = Math.random() * 30;
        
        data[idx] = baseColor + variation * 0.4;     // R - cyan tint
        data[idx + 1] = baseColor + variation * 0.7; // G
        data[idx + 2] = baseColor + variation;       // B - more blue
        data[idx + 3] = 255;
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);
  
  // Create cubemap for sky reflections
  const skyTexture = useMemo(() => {
    const size = 128;
    const createFace = (color1: THREE.Color, color2: THREE.Color, isTop: boolean = false) => {
      const data = new Uint8Array(size * size * 4);
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const idx = (i * size + j) * 4;
          const t = isTop ? 1 : i / size;
          const color = color1.clone().lerp(color2, t);
          data[idx] = Math.floor(color.r * 255);
          data[idx + 1] = Math.floor(color.g * 255);
          data[idx + 2] = Math.floor(color.b * 255);
          data[idx + 3] = 255;
        }
      }
      const texture = new THREE.DataTexture(data, size, size);
      texture.needsUpdate = true;
      return texture;
    };
    
    const skyColor = new THREE.Color(0.3, 0.5, 0.8);
    const horizonColor = new THREE.Color(0.6, 0.7, 0.9);
    const groundColor = new THREE.Color(0.1, 0.1, 0.15);
    
    return new THREE.CubeTexture([
      createFace(horizonColor, skyColor).image,
      createFace(horizonColor, skyColor).image,
      createFace(skyColor, skyColor, true).image,
      createFace(groundColor, groundColor).image,
      createFace(horizonColor, skyColor).image,
      createFace(horizonColor, skyColor).image,
    ]);
  }, []);
  
  // Water material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uWater: { value: null },
        uTiles: { value: tileTexture },
        uCaustics: { value: null },
        uSky: { value: skyTexture },
        uEye: { value: new THREE.Vector3() },
        uLight: { value: new THREE.Vector3() },
        uSphereCenter: { value: new THREE.Vector3() },
        uSphereRadius: { value: 0.25 },
      },
      side: THREE.DoubleSide,
      transparent: false,
    });
  }, [tileTexture, skyTexture]);
  
  // Update uniforms
  useMemo(() => {
    if (waterTexture) material.uniforms.uWater.value = waterTexture;
    if (causticsTexture) material.uniforms.uCaustics.value = causticsTexture;
    material.uniforms.uEye.value.copy(eye);
    material.uniforms.uLight.value.copy(light);
    material.uniforms.uSphereCenter.value.copy(sphereCenter);
    material.uniforms.uSphereRadius.value = sphereRadius;
  }, [waterTexture, causticsTexture, eye, light, sphereCenter, sphereRadius, material]);
  
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.point) {
      onDropAdd(event.point.x, event.point.z);
    }
  };
  
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (event.buttons > 0 && event.point) {
      onDropAdd(event.point.x, event.point.z);
    }
  };
  
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
    />
  );
}
