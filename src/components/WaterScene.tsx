import { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useWaterSimulation } from '../hooks/useWaterSimulation';
import { useCaustics } from '../hooks/useCaustics';
import { WaterSurface } from './WaterSurface';
import { PoolEnvironment } from './PoolEnvironment';
import { DraggableSphere } from './DraggableSphere';
import { waterStore, waterCommands } from '../lib/waterStore';

export function WaterScene() {
  const { camera } = useThree();
  const waterSim = useWaterSimulation();
  const caustics = useCaustics();

  const [initialized, setInitialized] = useState(false);
  const lightDir = useRef(new THREE.Vector3(2.0, 2.0, -1.0).normalize());

  const sphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const oldSphereCenter = useRef(new THREE.Vector3(-0.4, -0.75, 0.2));
  const sphereRadius = 0.25;

  const rippleCountRef = useRef(0);
  const fpsAccum = useRef({ frames: 0, last: performance.now() });

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

  const seedDrops = (count = 20) => {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      waterSim.addDrop(x, y, 0.03, (i & 1) ? 0.01 : -0.01);
    }
    rippleCountRef.current += count;
    waterStore.set({ rippleCount: rippleCountRef.current });
  };

  useEffect(() => {
    if (!initialized) {
      seedDrops(20);
      setInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // Command bus subscriptions
  useEffect(() => {
    return waterCommands.on((cmd) => {
      if (cmd === 'reset') {
        rippleCountRef.current = 0;
        waterStore.set({ rippleCount: 0 });
        // Calm + reseed gentle drops
        for (let i = 0; i < 8; i++) {
          waterSim.addDrop(Math.random() * 2 - 1, Math.random() * 2 - 1, 0.04, 0.005);
        }
      } else if (cmd === 'storm') {
        seedDrops(40);
      } else if (cmd === 'single-drop') {
        waterSim.addDrop(Math.random() * 1.6 - 0.8, Math.random() * 1.6 - 0.8, 0.04, 0.02);
        rippleCountRef.current += 1;
        waterStore.set({ rippleCount: rippleCountRef.current });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    if (!initialized) return;

    const state = waterStore.get();

    // Update light direction from store (azimuth/elevation in degrees)
    const az = (state.lightAngle * Math.PI) / 180;
    const el = (state.lightElevation * Math.PI) / 180;
    lightDir.current.set(
      Math.cos(el) * Math.cos(az),
      Math.sin(el),
      Math.cos(el) * Math.sin(az),
    ).normalize();

    if (!state.paused) {
      waterSim.moveSphere(oldSphereCenter.current, sphereCenter.current, sphereRadius);
      oldSphereCenter.current.copy(sphereCenter.current);

      waterSim.stepSimulation();
      waterSim.stepSimulation();
      waterSim.updateNormals();

      const waterTexture = waterSim.getTexture();
      if (waterTexture) {
        caustics.updateCaustics(waterTexture, lightDir.current, sphereCenter.current, sphereRadius);
      }
    }

    // FPS measurement
    fpsAccum.current.frames++;
    const now = performance.now();
    const dt = now - fpsAccum.current.last;
    if (dt >= 500) {
      const fps = (fpsAccum.current.frames * 1000) / dt;
      waterStore.set({ fps });
      fpsAccum.current.frames = 0;
      fpsAccum.current.last = now;
    }
  });

  const handleDropAdd = (x: number, z: number) => {
    waterSim.addDrop(x, z, 0.03, 0.01);
    rippleCountRef.current += 1;
    waterStore.set({ rippleCount: rippleCountRef.current });
  };

  const handleSphereMove = (position: THREE.Vector3) => {
    sphereCenter.current.copy(position);
    waterStore.set({ spherePos: [position.x, position.y, position.z] });
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
