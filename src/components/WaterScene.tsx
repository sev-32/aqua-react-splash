import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useWaterSimulation } from '../hooks/useWaterSimulation';
import { useCaustics } from '../hooks/useCaustics';
import { WaterSurface } from './WaterSurface';
import { PoolEnvironment } from './PoolEnvironment';
import { DraggableSphere } from './DraggableSphere';

export function WaterScene() {
  const { camera } = useThree();
  const waterSim = useWaterSimulation();
  const caustics = useCaustics();
  
  const [initialized, setInitialized] = useState(false);
  const lightDir = useRef(new THREE.Vector3(0.5, 0.5, -0.25).normalize());
  
  // Sphere state - position it partially submerged
  const sphereCenter = useRef(new THREE.Vector3(-0.3, -0.1, 0.2));
  const oldSphereCenter = useRef(new THREE.Vector3(-0.3, -0.1, 0.2));
  const sphereRadius = 0.25;
  
  // Initialize with some random drops
  useEffect(() => {
    if (!initialized) {
      // Add initial random ripples
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * 2 - 1;
        const y = Math.random() * 2 - 1;
        waterSim.addDrop(x, y, 0.03, (i & 1) ? 0.01 : -0.01);
      }
      setInitialized(true);
    }
  }, [initialized, waterSim]);
  
  // Run simulation each frame
  useFrame(() => {
    if (!initialized) return;
    
    // Displace water around sphere
    waterSim.moveSphere(oldSphereCenter.current, sphereCenter.current, sphereRadius);
    oldSphereCenter.current.copy(sphereCenter.current);
    
    // Step simulation twice for stability
    waterSim.stepSimulation();
    waterSim.stepSimulation();
    waterSim.updateNormals();
    
    // Update caustics
    const waterTexture = waterSim.getTexture();
    if (waterTexture) {
      caustics.updateCaustics(waterTexture, lightDir.current, sphereCenter.current, sphereRadius);
    }
  });
  
  const handleDropAdd = (x: number, z: number) => {
    waterSim.addDrop(x, z, 0.03, 0.02);
  };
  
  const handleSphereMove = (position: THREE.Vector3) => {
    sphereCenter.current.copy(position);
  };
  
  const waterTexture = waterSim.getTexture();
  const causticsTexture = caustics.getTexture();
  const eye = camera.position;
  
  return (
    <group>
      {/* Pool walls and floor */}
      <PoolEnvironment
        waterTexture={waterTexture}
        causticsTexture={causticsTexture}
        light={lightDir.current}
        sphereCenter={sphereCenter.current}
        sphereRadius={sphereRadius}
      />
      
      {/* Water surface */}
      <WaterSurface
        waterTexture={waterTexture}
        causticsTexture={causticsTexture}
        eye={eye}
        light={lightDir.current}
        sphereCenter={sphereCenter.current}
        sphereRadius={sphereRadius}
        onDropAdd={handleDropAdd}
      />
      
      {/* Draggable sphere */}
      <DraggableSphere
        position={sphereCenter.current}
        radius={sphereRadius}
        waterTexture={waterTexture}
        causticsTexture={causticsTexture}
        light={lightDir.current}
        onMove={handleSphereMove}
      />
    </group>
  );
}
