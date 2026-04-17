import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { sphereVertexShader, sphereRenderFragmentShader } from '../shaders/waterShaders';

interface DraggableSphereProps {
  position: THREE.Vector3;
  radius: number;
  waterTexture: THREE.Texture | undefined;
  causticsTexture: THREE.Texture | undefined;
  tilesTexture: THREE.Texture;
  light: THREE.Vector3;
  onMove: (position: THREE.Vector3) => void;
}

export function DraggableSphere({
  position,
  radius,
  waterTexture,
  causticsTexture,
  tilesTexture,
  light,
  onMove,
}: DraggableSphereProps) {
  const { camera, raycaster } = useThree();
  const hitMeshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());

  // Unit sphere — vertex shader scales/positions in world space.
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 64, 64), []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: sphereVertexShader,
    fragmentShader: sphereRenderFragmentShader,
    uniforms: {
      water: { value: null },
      tiles: { value: tilesTexture },
      causticTex: { value: null },
      light: { value: new THREE.Vector3() },
      sphereCenter: { value: new THREE.Vector3() },
      sphereRadius: { value: radius },
      sphereCenterU: { value: new THREE.Vector3() },
      sphereRadiusU: { value: radius },
    },
  }), [radius, tilesTexture]);

  const hitMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), []);

  useFrame(() => {
    if (waterTexture) material.uniforms.water.value = waterTexture;
    if (causticsTexture) material.uniforms.causticTex.value = causticsTexture;
    material.uniforms.light.value.copy(light);
    material.uniforms.sphereCenter.value.copy(position);
    material.uniforms.sphereCenterU.value.copy(position);
    material.uniforms.sphereRadius.value = radius;
    material.uniforms.sphereRadiusU.value = radius;

    if (hitMeshRef.current) {
      hitMeshRef.current.position.copy(position);
      hitMeshRef.current.scale.setScalar(radius);
    }
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsDragging(true);
    (event.target as Element).setPointerCapture?.(event.pointerId);

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    dragPlane.current.setFromNormalAndCoplanarPoint(cameraDirection.negate(), position);

    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersection);
    dragOffset.current.subVectors(position, intersection);
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;

    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane.current, intersection)) {
      const newPosition = intersection.add(dragOffset.current);
      newPosition.x = Math.max(radius - 1, Math.min(1 - radius, newPosition.x));
      newPosition.y = Math.max(radius - 1, Math.min(1, newPosition.y));
      newPosition.z = Math.max(radius - 1, Math.min(1 - radius, newPosition.z));
      onMove(newPosition);
    }
  };

  const handlePointerUp = () => setIsDragging(false);

  return (
    <>
      <mesh geometry={geometry} material={material} raycast={() => null} />
      <mesh
        ref={hitMeshRef}
        geometry={geometry}
        material={hitMaterial}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </>
  );
}
