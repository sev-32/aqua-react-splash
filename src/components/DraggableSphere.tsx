import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';

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
  const meshRef = useRef<THREE.Mesh>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPlane = useRef(new THREE.Plane());
  const dragOffset = useRef(new THREE.Vector3());
  
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 32, 32), [radius]);
  
  // Simple material for the sphere
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.1,
    roughness: 0.4,
  }), []);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(position);
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
      <ambientLight intensity={0.5} />
      <directionalLight position={[light.x * 5, light.y * 5, light.z * 5]} intensity={0.8} />
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </>
  );
}
