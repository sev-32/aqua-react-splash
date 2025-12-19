import { useRef, useState, useEffect } from 'react';
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
  
  // Simple material with underwater tint effect
  const material = useRef(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.5, 0.5, 0.5),
      metalness: 0.1,
      roughness: 0.3,
      envMapIntensity: 0.5,
    })
  );
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(position);
      
      // Check if underwater and tint
      if (waterTexture && position.y < 0.1) {
        material.current.color.setRGB(0.4, 0.5, 0.55);
      } else {
        material.current.color.setRGB(0.5, 0.5, 0.5);
      }
    }
  });
  
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setIsDragging(true);
    
    // Create a drag plane perpendicular to the camera
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    dragPlane.current.setFromNormalAndCoplanarPoint(cameraDirection.negate(), position);
    
    // Calculate offset from click point to sphere center
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane.current, intersection);
    dragOffset.current.subVectors(position, intersection);
  };
  
  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    
    const intersection = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(dragPlane.current, intersection)) {
      const newPosition = intersection.add(dragOffset.current);
      
      // Clamp to pool bounds
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
      {/* Ambient light for sphere */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[light.x * 5, light.y * 5, light.z * 5]} 
        intensity={0.8} 
        color="#8fd8ff"
      />
      
      <mesh
        ref={meshRef}
        position={position.toArray()}
        material={material.current}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <sphereGeometry args={[radius, 32, 32]} />
      </mesh>
    </>
  );
}
