import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { sphereVertexShader, sphereRenderFragmentShader } from '../shaders/waterShaders';

interface DraggableSphereProps {
  position: THREE.Vector3;
  radius: number;
  waterTexture: THREE.Texture | undefined;
  causticsTexture: THREE.Texture | undefined;
  light: THREE.Vector3;
  onMove: (position: THREE.Vector3) => void;
}

export function DraggableSphere({
  position,
  radius,
  waterTexture,
  causticsTexture,
  light,
  onMove,
}: DraggableSphereProps) {
  const { camera, raycaster } = useThree();
  const hitMeshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());

  const geometry = useMemo(() => new THREE.SphereGeometry(1, 48, 48), []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: sphereVertexShader,
    fragmentShader: sphereRenderFragmentShader,
    uniforms: {
      uWater: { value: null },
      uCaustics: { value: null },
      uLight: { value: new THREE.Vector3() },
      uSphereCenter: { value: new THREE.Vector3() },
      uSphereRadius: { value: radius },
    },
  }), [radius]);

  const hitMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  }), []);

  useFrame(() => {
    if (waterTexture) material.uniforms.uWater.value = waterTexture;
    if (causticsTexture) material.uniforms.uCaustics.value = causticsTexture;
    material.uniforms.uLight.value.copy(light);
    material.uniforms.uSphereCenter.value.copy(position);
    material.uniforms.uSphereRadius.value = radius;

    if (hitMeshRef.current) {
      hitMeshRef.current.position.copy(position);
      hitMeshRef.current.scale.setScalar(radius);
    }
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsDragging(true);

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

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      <mesh geometry={geometry} material={material} />
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
