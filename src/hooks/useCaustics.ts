import { useMemo, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import {
  causticsVertexShader,
  causticsFragmentShader,
} from '../shaders/waterShaders';

const CAUSTICS_SIZE = 1024;

export function useCaustics() {
  const { gl } = useThree();
  
  const causticsTarget = useRef<THREE.WebGLRenderTarget>(null!);
  const causticsMaterial = useRef<THREE.ShaderMaterial>(null!);
  const causticsScene = useMemo(() => new THREE.Scene(), []);
  const causticsCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  
  const causticsGeometry = useMemo(() => new THREE.PlaneGeometry(2, 2, 200, 200), []);
  
  useMemo(() => {
    causticsTarget.current = new THREE.WebGLRenderTarget(CAUSTICS_SIZE, CAUSTICS_SIZE, {
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: false,
    });
    
    causticsMaterial.current = new THREE.ShaderMaterial({
      vertexShader: causticsVertexShader,
      fragmentShader: causticsFragmentShader,
      uniforms: {
        uWater: { value: null },
        uLight: { value: new THREE.Vector3(0.5, 0.5, -0.25).normalize() },
        uSphereCenter: { value: new THREE.Vector3() },
        uSphereRadius: { value: 0.25 },
      },
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    
    const causticsMesh = new THREE.Mesh(causticsGeometry, causticsMaterial.current);
    causticsScene.add(causticsMesh);
  }, [causticsGeometry, causticsScene]);
  
  const updateCaustics = useCallback((
    waterTexture: THREE.Texture,
    light: THREE.Vector3,
    sphereCenter: THREE.Vector3,
    sphereRadius: number
  ) => {
    if (!causticsMaterial.current || !causticsTarget.current) return;
    
    causticsMaterial.current.uniforms.uWater.value = waterTexture;
    causticsMaterial.current.uniforms.uLight.value.copy(light);
    causticsMaterial.current.uniforms.uSphereCenter.value.copy(sphereCenter);
    causticsMaterial.current.uniforms.uSphereRadius.value = sphereRadius;
    
    gl.setRenderTarget(causticsTarget.current);
    gl.clear();
    gl.render(causticsScene, causticsCamera);
    gl.setRenderTarget(null);
  }, [gl, causticsScene, causticsCamera]);
  
  const getTexture = useCallback(() => {
    return causticsTarget.current?.texture;
  }, []);
  
  return {
    updateCaustics,
    getTexture,
  };
}
