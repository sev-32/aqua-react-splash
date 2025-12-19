import { useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import {
  simulationVertexShader,
  dropFragmentShader,
  updateFragmentShader,
  normalFragmentShader,
  sphereDisplacementFragmentShader,
} from '../shaders/waterShaders';

const TEXTURE_SIZE = 256;

export function useWaterSimulation() {
  const { gl } = useThree();
  
  // Ping-pong textures for simulation
  const textureA = useRef<THREE.WebGLRenderTarget>(null!);
  const textureB = useRef<THREE.WebGLRenderTarget>(null!);
  
  // Shader materials
  const dropMaterial = useRef<THREE.ShaderMaterial>(null!);
  const updateMaterial = useRef<THREE.ShaderMaterial>(null!);
  const normalMaterial = useRef<THREE.ShaderMaterial>(null!);
  const sphereMaterial = useRef<THREE.ShaderMaterial>(null!);
  
  // Full screen quad for simulation passes
  const simulationScene = useMemo(() => new THREE.Scene(), []);
  const simulationCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const quadGeometry = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  
  // Initialize textures and materials
  useMemo(() => {
    const options: THREE.RenderTargetOptions = {
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: false,
    };
    
    textureA.current = new THREE.WebGLRenderTarget(TEXTURE_SIZE, TEXTURE_SIZE, options);
    textureB.current = new THREE.WebGLRenderTarget(TEXTURE_SIZE, TEXTURE_SIZE, options);
    
    // Initialize with zeros
    const data = new Float32Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
    const initialTexture = new THREE.DataTexture(
      data,
      TEXTURE_SIZE,
      TEXTURE_SIZE,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    initialTexture.needsUpdate = true;
    
    // Drop shader material
    dropMaterial.current = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: dropFragmentShader,
      uniforms: {
        uTexture: { value: initialTexture },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uRadius: { value: 0.03 },
        uStrength: { value: 0.01 },
      },
    });
    
    // Update shader material
    updateMaterial.current = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: updateFragmentShader,
      uniforms: {
        uTexture: { value: initialTexture },
        uDelta: { value: new THREE.Vector2(1 / TEXTURE_SIZE, 1 / TEXTURE_SIZE) },
      },
    });
    
    // Normal shader material
    normalMaterial.current = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: normalFragmentShader,
      uniforms: {
        uTexture: { value: initialTexture },
        uDelta: { value: new THREE.Vector2(1 / TEXTURE_SIZE, 1 / TEXTURE_SIZE) },
      },
    });
    
    // Sphere displacement shader material
    sphereMaterial.current = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: sphereDisplacementFragmentShader,
      uniforms: {
        uTexture: { value: initialTexture },
        uOldCenter: { value: new THREE.Vector3() },
        uNewCenter: { value: new THREE.Vector3() },
        uRadius: { value: 0.25 },
      },
    });
  }, []);
  
  // Render a pass to texture
  const renderPass = useCallback((material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget) => {
    const quad = new THREE.Mesh(quadGeometry, material);
    simulationScene.children = [];
    simulationScene.add(quad);
    gl.setRenderTarget(target);
    gl.render(simulationScene, simulationCamera);
    gl.setRenderTarget(null);
  }, [gl, quadGeometry, simulationScene, simulationCamera]);
  
  // Swap textures
  const swapTextures = useCallback(() => {
    const temp = textureA.current;
    textureA.current = textureB.current;
    textureB.current = temp;
  }, []);
  
  // Add a drop to the water
  const addDrop = useCallback((x: number, y: number, radius: number = 0.03, strength: number = 0.01) => {
    dropMaterial.current.uniforms.uTexture.value = textureA.current.texture;
    dropMaterial.current.uniforms.uCenter.value.set(x * 0.5 + 0.5, y * 0.5 + 0.5);
    dropMaterial.current.uniforms.uRadius.value = radius;
    dropMaterial.current.uniforms.uStrength.value = strength;
    renderPass(dropMaterial.current, textureB.current);
    swapTextures();
  }, [renderPass, swapTextures]);
  
  // Move sphere to displace water
  const moveSphere = useCallback((oldCenter: THREE.Vector3, newCenter: THREE.Vector3, radius: number) => {
    sphereMaterial.current.uniforms.uTexture.value = textureA.current.texture;
    sphereMaterial.current.uniforms.uOldCenter.value.copy(oldCenter);
    sphereMaterial.current.uniforms.uNewCenter.value.copy(newCenter);
    sphereMaterial.current.uniforms.uRadius.value = radius;
    renderPass(sphereMaterial.current, textureB.current);
    swapTextures();
  }, [renderPass, swapTextures]);
  
  // Step the simulation forward
  const stepSimulation = useCallback(() => {
    updateMaterial.current.uniforms.uTexture.value = textureA.current.texture;
    renderPass(updateMaterial.current, textureB.current);
    swapTextures();
  }, [renderPass, swapTextures]);
  
  // Update normals
  const updateNormals = useCallback(() => {
    normalMaterial.current.uniforms.uTexture.value = textureA.current.texture;
    renderPass(normalMaterial.current, textureB.current);
    swapTextures();
  }, [renderPass, swapTextures]);
  
  // Get current water texture
  const getTexture = useCallback(() => {
    return textureA.current?.texture;
  }, []);
  
  return {
    addDrop,
    moveSphere,
    stepSimulation,
    updateNormals,
    getTexture,
    textureA,
    textureB,
  };
}
