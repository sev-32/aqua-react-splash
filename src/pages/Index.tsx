import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { WaterScene } from '../components/WaterScene';
import { WaterUI } from '../components/WaterUI';

const Index = () => {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-ink">
      <Canvas
        camera={{ position: [0.35, 1.15, 2.45], fov: 45, near: 0.01, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        className="absolute inset-0 h-full w-full"
      >
        <WaterScene />
        <OrbitControls
          target={[0, -0.12, 0]}
          enableDamping
          dampingFactor={0.08}
          rotateSpeed={0.55}
          zoomSpeed={0.65}
          panSpeed={0.35}
          minDistance={1.25}
          maxDistance={5}
          mouseButtons={{
            LEFT: undefined,
            MIDDLE: undefined,
            RIGHT: 0,
          }}
        />
      </Canvas>
      <WaterUI />
    </main>
  );
};

export default Index;
