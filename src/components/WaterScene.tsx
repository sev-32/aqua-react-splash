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

  const sphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const oldSphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const sphereRadius = 0.25;

  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);
  const cubeTextureLoader = useMemo(() => new THREE.CubeTextureLoader(), []);

  const tilesTexture = useMemo(() => {
    const texture = textureLoader.load('/textures/tiles.jpg');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, [textureLoader]);

  const skyTexture = useMemo(() => {
    const texture = cubeTextureLoader.load([
      '/textures/xpos.jpg',
      '/textures/xneg.jpg',
      '/textures/ypos.jpg',
      '/textures/ypos.jpg',
      '/textures/zpos.jpg',
      '/textures/zneg.jpg',
    ]);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [cubeTextureLoader]);

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
