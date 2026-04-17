import { useMemo, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import {
  causticsVertexShader,
  causticsFragmentShader,
} from '../shaders/waterShaders';

const CAUSTICS_SIZE = 1024;
const PLANE_DETAIL = 256;

export function useCaustics() {
  const { gl } = useThree();

  const target = useRef<THREE.WebGLRenderTarget>(null!);
  const material = useRef<THREE.ShaderMaterial>(null!);
  const scene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), []);
  const planeGeom = useMemo(() => new THREE.PlaneGeometry(2, 2, PLANE_DETAIL, PLANE_DETAIL), []);
  const meshRef = useRef<THREE.Mesh>(null!);

  useMemo(() => {
    target.current = new THREE.WebGLRenderTarget(CAUSTICS_SIZE, CAUSTICS_SIZE, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: false,
      generateMipmaps: false,
    });

    material.current = new THREE.ShaderMaterial({
      vertexShader: causticsVertexShader,
      fragmentShader: causticsFragmentShader,
      uniforms: {
        water: { value: null },
        tiles: { value: null }, // unused but declared in helpers
        causticTex: { value: null }, // unused but declared in helpers
        light: { value: new THREE.Vector3(2, 2, -1).normalize() },
        sphereCenter: { value: new THREE.Vector3() },
        sphereRadius: { value: 0.25 },
      },
      side: THREE.DoubleSide,
      blending: THREE.NoBlending,
      depthWrite: false,
      depthTest: false,
      extensions: { derivatives: true } as never,
    });

    meshRef.current = new THREE.Mesh(planeGeom, material.current);
    scene.add(meshRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    target.current?.dispose();
    material.current?.dispose();
    planeGeom.dispose();
  }, [planeGeom]);

  const updateCaustics = useCallback((
    waterTexture: THREE.Texture,
    light: THREE.Vector3,
    sphereCenter: THREE.Vector3,
    sphereRadius: number,
  ) => {
    if (!material.current || !target.current) return;
    material.current.uniforms.water.value = waterTexture;
    material.current.uniforms.light.value.copy(light);
    material.current.uniforms.sphereCenter.value.copy(sphereCenter);
    material.current.uniforms.sphereRadius.value = sphereRadius;

    const prev = gl.getRenderTarget();
    const prevClear = gl.getClearColor(new THREE.Color()).getHex();
    const prevAlpha = gl.getClearAlpha();
    gl.setRenderTarget(target.current);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, false, false);
    gl.render(scene, camera);
    gl.setRenderTarget(prev);
    gl.setClearColor(prevClear, prevAlpha);
  }, [gl, scene, camera]);

  const getTexture = useCallback(() => target.current?.texture, []);

  return { updateCaustics, getTexture };
}
