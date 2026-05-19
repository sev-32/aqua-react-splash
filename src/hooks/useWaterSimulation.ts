import { useRef, useMemo, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { MpmParticles, FLAG_ALIVE } from '../lib/mlsmpm';
import {
  simulationVertexShader,
  dropFragmentShader,
  updateFragmentShader,
  normalFragmentShader,
  sphereDisplacementFragmentShader,
} from '../shaders/waterShaders';

const TEXTURE_SIZE = 512;
const CPU_SAMPLE_SIZE = 128;
const CPU_SAMPLE_DELTA = 1 / CPU_SAMPLE_SIZE;

export function useWaterSimulation() {
  const { gl } = useThree();

  const targetA = useRef<THREE.WebGLRenderTarget>(null!);
  const targetB = useRef<THREE.WebGLRenderTarget>(null!);

  const dropMaterial = useRef<THREE.ShaderMaterial>(null!);
  const updateMaterial = useRef<THREE.ShaderMaterial>(null!);
  const normalMaterial = useRef<THREE.ShaderMaterial>(null!);
  const sphereMaterial = useRef<THREE.ShaderMaterial>(null!);

  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const quadGeom = useMemo(() => new THREE.PlaneGeometry(2, 2), []);
  const quadMesh = useRef<THREE.Mesh>(null!);
  const cpuHeight = useRef(new Float32Array(CPU_SAMPLE_SIZE * CPU_SAMPLE_SIZE));
  const cpuVelocity = useRef(new Float32Array(CPU_SAMPLE_SIZE * CPU_SAMPLE_SIZE));
  const cpuScratchHeight = useRef(new Float32Array(CPU_SAMPLE_SIZE * CPU_SAMPLE_SIZE));
  const cpuScratchVelocity = useRef(new Float32Array(CPU_SAMPLE_SIZE * CPU_SAMPLE_SIZE));

  // Init targets + materials once
  useMemo(() => {
    // Prefer HalfFloat for cross-platform reliability with linear filtering.
    const supportsFloatLinear = gl.capabilities.isWebGL2;
    const opts: THREE.RenderTargetOptions = {
      type: supportsFloatLinear ? THREE.HalfFloatType : THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    };

    targetA.current = new THREE.WebGLRenderTarget(TEXTURE_SIZE, TEXTURE_SIZE, opts);
    targetB.current = new THREE.WebGLRenderTarget(TEXTURE_SIZE, TEXTURE_SIZE, opts);

    // Initialize both targets to zero by rendering a black material
    const clearMat = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: `
        precision highp float;
        varying vec2 vCoord;
        void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); }
      `,
    });
    const tmpMesh = new THREE.Mesh(quadGeom, clearMat);
    scene.add(tmpMesh);
    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(targetA.current); gl.render(scene, camera);
    gl.setRenderTarget(targetB.current); gl.render(scene, camera);
    gl.setRenderTarget(prevTarget);
    scene.remove(tmpMesh);
    clearMat.dispose();

    dropMaterial.current = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: dropFragmentShader,
      uniforms: {
        tSim: { value: null },
        center: { value: new THREE.Vector2() },
        radius: { value: 0.03 },
        strength: { value: 0.01 },
      },
    });

    updateMaterial.current = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: updateFragmentShader,
      uniforms: {
        tSim: { value: null },
        delta: { value: new THREE.Vector2(1 / TEXTURE_SIZE, 1 / TEXTURE_SIZE) },
      },
    });

    normalMaterial.current = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: normalFragmentShader,
      uniforms: {
        tSim: { value: null },
        delta: { value: new THREE.Vector2(1 / TEXTURE_SIZE, 1 / TEXTURE_SIZE) },
      },
    });

    sphereMaterial.current = new THREE.ShaderMaterial({
      vertexShader: simulationVertexShader,
      fragmentShader: sphereDisplacementFragmentShader,
      uniforms: {
        tSim: { value: null },
        oldCenter: { value: new THREE.Vector3() },
        newCenter: { value: new THREE.Vector3() },
        radius: { value: 0.25 },
      },
    });

    quadMesh.current = new THREE.Mesh(quadGeom, dropMaterial.current);
    scene.add(quadMesh.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    targetA.current?.dispose();
    targetB.current?.dispose();
    dropMaterial.current?.dispose();
    updateMaterial.current?.dispose();
    normalMaterial.current?.dispose();
    sphereMaterial.current?.dispose();
    quadGeom.dispose();
  }, [quadGeom]);

  const renderPass = useCallback((mat: THREE.ShaderMaterial) => {
    quadMesh.current.material = mat;
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(targetB.current);
    gl.render(scene, camera);
    gl.setRenderTarget(prev);
    // swap
    const tmp = targetA.current;
    targetA.current = targetB.current;
    targetB.current = tmp;
  }, [gl, scene, camera]);

  const addCpuDrop = useCallback((x: number, z: number, radius = 0.03, strength = 0.01) => {
    const height = cpuHeight.current;
    const cx = x * 0.5 + 0.5;
    const cz = z * 0.5 + 0.5;
    const r = Math.max(radius, CPU_SAMPLE_DELTA);
    const minX = Math.max(0, Math.floor((cx - r) * CPU_SAMPLE_SIZE));
    const maxX = Math.min(CPU_SAMPLE_SIZE - 1, Math.ceil((cx + r) * CPU_SAMPLE_SIZE));
    const minZ = Math.max(0, Math.floor((cz - r) * CPU_SAMPLE_SIZE));
    const maxZ = Math.min(CPU_SAMPLE_SIZE - 1, Math.ceil((cz + r) * CPU_SAMPLE_SIZE));
    for (let j = minZ; j <= maxZ; j++) {
      const v = (j + 0.5) / CPU_SAMPLE_SIZE;
      for (let i = minX; i <= maxX; i++) {
        const u = (i + 0.5) / CPU_SAMPLE_SIZE;
        let drop = Math.max(0, 1 - Math.hypot(cx - u, cz - v) / r);
        drop = 0.5 - Math.cos(drop * Math.PI) * 0.5;
        height[j * CPU_SAMPLE_SIZE + i] += drop * strength;
      }
    }
  }, []);

  const addDrop = useCallback((x: number, y: number, radius = 0.03, strength = 0.01) => {
    if (!targetA.current) return;
    addCpuDrop(x, y, radius, strength);
    dropMaterial.current.uniforms.tSim.value = targetA.current.texture;
    dropMaterial.current.uniforms.center.value.set(x, y);
    dropMaterial.current.uniforms.radius.value = radius;
    dropMaterial.current.uniforms.strength.value = strength;
    renderPass(dropMaterial.current);
  }, [addCpuDrop, renderPass]);

  const moveSphere = useCallback((oldCenter: THREE.Vector3, newCenter: THREE.Vector3, radius: number) => {
    if (!targetA.current) return;
    sphereMaterial.current.uniforms.tSim.value = targetA.current.texture;
    sphereMaterial.current.uniforms.oldCenter.value.copy(oldCenter);
    sphereMaterial.current.uniforms.newCenter.value.copy(newCenter);
    sphereMaterial.current.uniforms.radius.value = radius;
    renderPass(sphereMaterial.current);
  }, [renderPass]);

  const stepCpuSimulation = useCallback(() => {
    const h = cpuHeight.current;
    const v = cpuVelocity.current;
    const nextH = cpuScratchHeight.current;
    const nextV = cpuScratchVelocity.current;
    nextH.set(h);
    nextV.set(v);
    for (let z = 1; z < CPU_SAMPLE_SIZE - 1; z++) {
      const row = z * CPU_SAMPLE_SIZE;
      for (let x = 1; x < CPU_SAMPLE_SIZE - 1; x++) {
        const idx = row + x;
        const avg = (h[idx - 1] + h[idx + 1] + h[idx - CPU_SAMPLE_SIZE] + h[idx + CPU_SAMPLE_SIZE]) * 0.25;
        const vel = (v[idx] + (avg - h[idx]) * 2.0) * 0.995;
        nextV[idx] = vel;
        nextH[idx] = h[idx] + vel;
      }
    }
    cpuHeight.current = nextH;
    cpuVelocity.current = nextV;
    cpuScratchHeight.current = h;
    cpuScratchVelocity.current = v;
  }, []);

  const stepSimulation = useCallback(() => {
    if (!targetA.current) return;
    stepCpuSimulation();
    updateMaterial.current.uniforms.tSim.value = targetA.current.texture;
    renderPass(updateMaterial.current);
  }, [renderPass, stepCpuSimulation]);

  const coupleMpmParticles = useCallback((particles: MpmParticles) => {
    const height = cpuHeight.current;
    const maxY = cpuScratchVelocity.current;
    maxY.fill(-Infinity);

    for (let i = 0; i < particles.count; i++) {
      if (!(particles.flags[i] & FLAG_ALIVE)) continue;
      if (Math.abs(particles.px[i]) > 1 || Math.abs(particles.pz[i]) > 1) continue;
      const ix = Math.max(0, Math.min(CPU_SAMPLE_SIZE - 1, Math.floor((particles.px[i] * 0.5 + 0.5) * CPU_SAMPLE_SIZE)));
      const iz = Math.max(0, Math.min(CPU_SAMPLE_SIZE - 1, Math.floor((particles.pz[i] * 0.5 + 0.5) * CPU_SAMPLE_SIZE)));
      const idx = iz * CPU_SAMPLE_SIZE + ix;
      if (particles.py[i] > maxY[idx]) maxY[idx] = particles.py[i];
    }

    let changed = 0;
    for (let z = 1; z < CPU_SAMPLE_SIZE - 1; z++) {
      for (let x = 1; x < CPU_SAMPLE_SIZE - 1; x++) {
        let sum = 0;
        let count = 0;
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            const y = maxY[(z + dz) * CPU_SAMPLE_SIZE + x + dx];
            if (Number.isFinite(y) && y > 0) { sum += y; count++; }
          }
        }
        if (count > 0) {
          const idx = z * CPU_SAMPLE_SIZE + x;
          const eta = sum / count;
          height[idx] += (eta - height[idx]) * 0.18;
          changed++;
        }
      }
    }

    if (changed > 0) {
      // Reference analogue: particle ride/impact buffers alter the heightfield;
      // in this WebGL port we stamp the same CPU mirror back into the visible
      // ping-pong texture through a compact set of surface drops.
      const stride = Math.max(1, Math.ceil(changed / 24));
      let n = 0;
      for (let z = 1; z < CPU_SAMPLE_SIZE - 1; z++) {
        for (let x = 1; x < CPU_SAMPLE_SIZE - 1; x++) {
          const y = maxY[z * CPU_SAMPLE_SIZE + x];
          if (!Number.isFinite(y) || y <= 0 || (n++ % stride) !== 0) continue;
          const wx = ((x + 0.5) / CPU_SAMPLE_SIZE) * 2 - 1;
          const wz = ((z + 0.5) / CPU_SAMPLE_SIZE) * 2 - 1;
          const strength = Math.min(0.018, Math.max(0.0015, y * 0.012));
          addDrop(wx, wz, 0.026, strength);
        }
      }
    }
  }, [addDrop]);

  const updateNormals = useCallback(() => {
    if (!targetA.current) return;
    normalMaterial.current.uniforms.tSim.value = targetA.current.texture;
    renderPass(normalMaterial.current);
  }, [renderPass]);

  const sampleHeight = useCallback((x: number, z: number) => {
    const u = Math.max(0, Math.min(CPU_SAMPLE_SIZE - 1.001, (x * 0.5 + 0.5) * CPU_SAMPLE_SIZE - 0.5));
    const v = Math.max(0, Math.min(CPU_SAMPLE_SIZE - 1.001, (z * 0.5 + 0.5) * CPU_SAMPLE_SIZE - 0.5));
    const x0 = Math.floor(u), z0 = Math.floor(v);
    const x1 = Math.min(CPU_SAMPLE_SIZE - 1, x0 + 1), z1 = Math.min(CPU_SAMPLE_SIZE - 1, z0 + 1);
    const tx = u - x0, tz = v - z0;
    const h = cpuHeight.current;
    const h00 = h[z0 * CPU_SAMPLE_SIZE + x0], h10 = h[z0 * CPU_SAMPLE_SIZE + x1];
    const h01 = h[z1 * CPU_SAMPLE_SIZE + x0], h11 = h[z1 * CPU_SAMPLE_SIZE + x1];
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }, []);

  const getTexture = useCallback(() => targetA.current?.texture, []);

  return { addDrop, moveSphere, stepSimulation, updateNormals, getTexture, sampleHeight, coupleMpmParticles };
}
