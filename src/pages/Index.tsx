import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { WaterScene } from '../components/WaterScene';
import { WaterUI } from '../components/WaterUI';

const Index = () => {
  return (
    <div className="h-screen w-screen bg-ink overflow-hidden relative">
      {/* UI Overlay */}
      <WaterUI />
      
      {/* 3D Canvas */}
      <Canvas
        frameloop="always"
        dpr={[1, 2]}
        camera={{
          position: [0, 2, 4],
          fov: 45,
          near: 0.01,
          far: 100,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        className="touch-none"
      >
        <Suspense fallback={null}>
          <WaterScene />
        </Suspense>
        
        {/* Orbit controls for camera */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.1}
          target={[0, 0, 0]}
        />
      </Canvas>
      
      {/* Loading indicator */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 bg-background/80 opacity-0 transition-opacity duration-500" />
      </div>
    </div>
  );
};

export default Index;
