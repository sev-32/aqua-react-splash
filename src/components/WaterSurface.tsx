import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useThree, ThreeEvent, useFrame } from '@react-three/fiber';
import { waterVertexShader, waterAboveFragmentShader, waterBelowFragmentShader } from '../shaders/waterShaders';

interface WaterSurfaceProps {
  waterTexture: THREE.Texture | undefined;
  causticsTexture: THREE.Texture | undefined;
  tilesTexture: THREE.Texture;
  skyTexture: THREE.CubeTexture;
  eye: THREE.Vector3;
  light: THREE.Vector3;
  sphereCenter: THREE.Vector3;
  sphereRadius: number;
  onDropAdd: (x: number, z: number) => void;
}

export function WaterSurface({
  waterTexture,
  causticsTexture,
  tilesTexture,
  skyTexture,
  eye,
  light,
  sphereCenter,
  sphereRadius,
  onDropAdd,
}: WaterSurfaceProps) {
  const aboveMeshRef = useRef<THREE.Mesh>(null);
  const belowMeshRef = useRef<THREE.Mesh>(null);
  
  // Create high-res plane geometry for water (detail: 200 like original)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2, 2, 200, 200);
    // Rotate to be horizontal
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);
  
  // Above water material (front face)
  const aboveMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterAboveFragmentShader,
      uniforms: {
        uWater: { value: null },
        uTiles: { value: tilesTexture },
        uCaustics: { value: null },
        uSky: { value: skyTexture },
        uEye: { value: new THREE.Vector3() },
        uLight: { value: new THREE.Vector3() },
        uSphereCenter: { value: new THREE.Vector3() },
        uSphereRadius: { value: 0.25 },
      },
      side: THREE.FrontSide,
    });
  }, [tilesTexture, skyTexture]);
  
  // Below water material (back face - underwater view)
  const belowMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterBelowFragmentShader,
      uniforms: {
        uWater: { value: null },
        uTiles: { value: tilesTexture },
        uCaustics: { value: null },
        uSky: { value: skyTexture },
        uEye: { value: new THREE.Vector3() },
        uLight: { value: new THREE.Vector3() },
        uSphereCenter: { value: new THREE.Vector3() },
        uSphereRadius: { value: 0.25 },
      },
      side: THREE.BackSide,
    });
  }, [tilesTexture, skyTexture]);
  
  // Update uniforms every frame
  useFrame(() => {
    const materials = [aboveMaterial, belowMaterial];
    materials.forEach(material => {
      if (waterTexture) material.uniforms.uWater.value = waterTexture;
      if (causticsTexture) material.uniforms.uCaustics.value = causticsTexture;
      material.uniforms.uEye.value.copy(eye);
      material.uniforms.uLight.value.copy(light);
      material.uniforms.uSphereCenter.value.copy(sphereCenter);
      material.uniforms.uSphereRadius.value = sphereRadius;
    });
  });
  
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
    <group>
      {/* Above water view (front faces) */}
      <mesh
        ref={aboveMeshRef}
        geometry={geometry}
        material={aboveMaterial}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
      {/* Below water view (back faces) */}
      <mesh
        ref={belowMeshRef}
        geometry={geometry}
        material={belowMaterial}
      />
    </group>
  );
}
