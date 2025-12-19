import { useRef, useEffect, useState, useMemo } from 'react';
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
  const lightDir = useRef(new THREE.Vector3(2.0, 2.0, -1.0).normalize());
  
  // Sphere state
  const sphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const oldSphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const sphereRadius = 0.25;
  
  // Create procedural tile texture
  const tilesTexture = useMemo(() => {
    const size = 256;
    const data = new Uint8Array(size * size * 4);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = (i * size + j) * 4;
        const tileSize = 32;
        const isEdge = (i % tileSize) < 2 || (j % tileSize) < 2;
        
        const baseR = isEdge ? 60 : 150;
        const baseG = isEdge ? 80 : 180;
        const baseB = isEdge ? 100 : 200;
        const variation = (Math.random() - 0.5) * 20;
        
        data[idx] = Math.min(255, Math.max(0, baseR + variation));
        data[idx + 1] = Math.min(255, Math.max(0, baseG + variation));
        data[idx + 2] = Math.min(255, Math.max(0, baseB + variation));
        data[idx + 3] = 255;
      }
    }
    
    const texture = new THREE.DataTexture(data, size, size);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);
  
  // Simple cubemap for sky
  const skyTexture = useMemo(() => {
    const loader = new THREE.CubeTextureLoader();
    // Create a simple procedural sky using canvas
    const size = 64;
    const canvases: HTMLCanvasElement[] = [];
    
    for (let i = 0; i < 6; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, size);
      if (i === 2) { // top
        gradient.addColorStop(0, '#6699cc');
        gradient.addColorStop(1, '#6699cc');
      } else if (i === 3) { // bottom  
        gradient.addColorStop(0, '#334455');
        gradient.addColorStop(1, '#334455');
      } else { // sides
        gradient.addColorStop(0, '#6699cc');
        gradient.addColorStop(1, '#aabbcc');
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      canvases.push(canvas);
    }
    
    const cubeTexture = new THREE.CubeTexture(canvases);
    cubeTexture.needsUpdate = true;
    return cubeTexture;
  }, []);
  
  // Initialize with random drops
  useEffect(() => {
    if (!initialized) {
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
    
    waterSim.moveSphere(oldSphereCenter.current, sphereCenter.current, sphereRadius);
    oldSphereCenter.current.copy(sphereCenter.current);
    
    waterSim.stepSimulation();
    waterSim.stepSimulation();
    waterSim.updateNormals();
    
    const waterTexture = waterSim.getTexture();
    if (waterTexture) {
      caustics.updateCaustics(waterTexture, lightDir.current, sphereCenter.current, sphereRadius);
    }
  });
  
  const handleDropAdd = (x: number, z: number) => {
    waterSim.addDrop(x, z, 0.03, 0.01);
  };
  
  const handleSphereMove = (position: THREE.Vector3) => {
    sphereCenter.current.copy(position);
  };
  
  const waterTexture = waterSim.getTexture();
  const causticsTexture = caustics.getTexture();
  
  return (
    <group>
      <PoolEnvironment
        waterTexture={waterTexture}
        causticsTexture={causticsTexture}
        tilesTexture={tilesTexture}
        light={lightDir.current}
        sphereCenter={sphereCenter.current}
        sphereRadius={sphereRadius}
      />
      
      <WaterSurface
        waterTexture={waterTexture}
        causticsTexture={causticsTexture}
        tilesTexture={tilesTexture}
        skyTexture={skyTexture}
        eye={camera.position}
        light={lightDir.current}
        sphereCenter={sphereCenter.current}
        sphereRadius={sphereRadius}
        onDropAdd={handleDropAdd}
      />
      
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
