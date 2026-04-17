import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import {
  waterVertexShader,
  waterAboveFragmentShader,
  waterBelowFragmentShader,
} from '../shaders/waterShaders';

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

const buildUniforms = (tiles: THREE.Texture, sky: THREE.CubeTexture) => ({
  water: { value: null as THREE.Texture | null },
  tiles: { value: tiles },
  causticTex: { value: null as THREE.Texture | null },
  sky: { value: sky },
  eye: { value: new THREE.Vector3() },
  light: { value: new THREE.Vector3() },
  sphereCenter: { value: new THREE.Vector3() },
  sphereRadius: { value: 0.25 },
});

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
  // Plane geometry on XY in [-1,1] — the vertex shader swizzles to XZ.
  const geometry = useMemo(() => new THREE.PlaneGeometry(2, 2, 256, 256), []);

  // Hit plane: real horizontal plane at y=0 spanning [-1,1]² for raycasting.
  const hitGeometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 2, 1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const aboveMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterAboveFragmentShader,
    uniforms: buildUniforms(tilesTexture, skyTexture),
    side: THREE.DoubleSide,
  }), [tilesTexture, skyTexture]);

  const belowMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterBelowFragmentShader,
    uniforms: buildUniforms(tilesTexture, skyTexture),
    side: THREE.DoubleSide,
  }), [tilesTexture, skyTexture]);

  const hitMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), []);

  useFrame(() => {
    [aboveMaterial, belowMaterial].forEach((m) => {
      if (waterTexture) m.uniforms.water.value = waterTexture;
      if (causticsTexture) m.uniforms.causticTex.value = causticsTexture;
      m.uniforms.eye.value.copy(eye);
      m.uniforms.light.value.copy(light);
      m.uniforms.sphereCenter.value.copy(sphereCenter);
      m.uniforms.sphereRadius.value = sphereRadius;
    });
  });

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onDropAdd(e.point.x, e.point.z);
  };
  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.buttons > 0) {
      e.stopPropagation();
      onDropAdd(e.point.x, e.point.z);
    }
  };

  return (
    <group>
      <mesh geometry={geometry} material={aboveMaterial} raycast={ignoreRaycast} renderOrder={2} frustumCulled={false} />
      <mesh geometry={geometry} material={belowMaterial} raycast={ignoreRaycast} renderOrder={1} frustumCulled={false} />
      <mesh
        geometry={hitGeometry}
        material={hitMaterial}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      />
    </group>
  );
}
