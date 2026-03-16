import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
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

const ignoreRaycast = () => null;

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

  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2, 200, 200), []);
  const hitGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2, 2, 1, 1);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

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
      side: THREE.BackSide,
    });
  }, [tilesTexture, skyTexture]);

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
      side: THREE.FrontSide,
    });
  }, [tilesTexture, skyTexture]);

  const hitMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), []);

  useFrame(() => {
    const materials = [aboveMaterial, belowMaterial];
    materials.forEach((material) => {
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
    onDropAdd(event.point.x, event.point.z);
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (event.buttons > 0) {
      event.stopPropagation();
      onDropAdd(event.point.x, event.point.z);
    }
  };

  return (
    <group>
      <mesh ref={aboveMeshRef} geometry={geometry} material={aboveMaterial} raycast={ignoreRaycast} />
      <mesh ref={belowMeshRef} geometry={geometry} material={belowMaterial} raycast={ignoreRaycast} />
      <mesh
        geometry={hitGeometry}
        material={hitMaterial}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
    </group>
  );
}
