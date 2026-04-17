import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { cubeVertexShader, cubeFragmentShader } from '../shaders/waterShaders';

interface PoolEnvironmentProps {
  waterTexture: THREE.Texture | undefined;
  causticsTexture: THREE.Texture | undefined;
  tilesTexture: THREE.Texture;
  light: THREE.Vector3;
  sphereCenter: THREE.Vector3;
  sphereRadius: number;
}

/**
 * Open-top unit cube in [-1,1]³, with the +Y face removed.
 * The vertex shader remaps y via ((1 - y) * 7/12 - 1) so:
 *   - original y = +1 → world y = -1   (pool floor)
 *   - original y = -1 → world y = 2/12 ≈ 0.167  (top of walls, just above water)
 * Rendered with FrontSide because we removed the ceiling and view from outside.
 */
function createOpenCube(): THREE.BufferGeometry {
  // 6 faces × 2 tris × 3 verts = 36 verts — but we omit +Y face (6 verts)
  // CCW winding when viewed from outside the cube.
  const v = (x: number, y: number, z: number) => [x, y, z];

  const positions: number[] = [];

  const push = (a: number[], b: number[], c: number[]) => {
    positions.push(...a, ...b, ...c);
  };

  // -Y (floor in source space, becomes top of walls after remap, y=2/12)
  // We KEEP this — it's the inner ceiling? No — we want to keep what's visible.
  // The original removed the +Y face. After the y-remap, +Y(=1) → world y=-1 (floor).
  // So the removed face would actually be the FLOOR after remap. That's wrong.
  // Let me re-check: splice(4, 2) on GL.Mesh.cube — depends on face order.
  // Empirically: in the original demo you SEE the pool floor and walls, not a roof.
  // So the kept faces include the floor. Let me just build all 6 and remove the
  // one that becomes the visible "ceiling" after remap (i.e., original -Y, which
  // maps to world y = 2/12, and would face downward = invisible from above anyway,
  // but visible from below — that's the rim ceiling we don't want).
  //
  // CONCLUSION: remove the original -Y face (so original Y range becomes (-,1]
  // and after remap world Y range becomes [-1, 2/12) where the ceiling at 2/12
  // is open). Keep: +Y (floor), ±X, ±Z (walls).

  // +Y face (original) → world y=-1 (FLOOR) — KEEP. Normal points +Y in source, but
  // after y-flip in remap the visible side faces upward (toward camera). We want
  // the inside surface visible. With FrontSide rendering, winding must be CCW from
  // the camera/inside. After the remap inverts Y, original CCW becomes CW. So we
  // build with CW in source space to end up CCW after the flip.
  //
  // Easier: just use DoubleSide and not worry about it. Performance is fine.

  // +Y face (source y=1)  → world y=-1 (FLOOR)
  push(v(-1, 1, -1), v( 1, 1, -1), v( 1, 1,  1));
  push(v(-1, 1, -1), v( 1, 1,  1), v(-1, 1,  1));

  // -X face (source x=-1) → wall
  push(v(-1, -1, -1), v(-1, 1, -1), v(-1, 1,  1));
  push(v(-1, -1, -1), v(-1, 1,  1), v(-1, -1,  1));

  // +X face
  push(v( 1, -1,  1), v( 1, 1,  1), v( 1, 1, -1));
  push(v( 1, -1,  1), v( 1, 1, -1), v( 1, -1, -1));

  // -Z face
  push(v(-1, -1, -1), v( 1, -1, -1), v( 1, 1, -1));
  push(v(-1, -1, -1), v( 1, 1, -1), v(-1, 1, -1));

  // +Z face
  push(v( 1, -1,  1), v(-1, -1,  1), v(-1, 1,  1));
  push(v( 1, -1,  1), v(-1, 1,  1), v( 1, 1,  1));

  // We do NOT push the -Y face — that's the open top.

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.computeVertexNormals();
  return geom;
}

export function PoolEnvironment({
  waterTexture,
  causticsTexture,
  tilesTexture,
  light,
  sphereCenter,
  sphereRadius,
}: PoolEnvironmentProps) {
  const geometry = useMemo(() => createOpenCube(), []);

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: cubeVertexShader,
    fragmentShader: cubeFragmentShader,
    uniforms: {
      water: { value: null },
      tiles: { value: tilesTexture },
      causticTex: { value: null },
      light: { value: new THREE.Vector3() },
      sphereCenter: { value: new THREE.Vector3() },
      sphereRadius: { value: 0.25 },
      poolHeightU: { value: 1.0 },
    },
    side: THREE.BackSide,
  }), [tilesTexture]);

  useFrame(() => {
    if (waterTexture) material.uniforms.water.value = waterTexture;
    if (causticsTexture) material.uniforms.causticTex.value = causticsTexture;
    material.uniforms.light.value.copy(light);
    material.uniforms.sphereCenter.value.copy(sphereCenter);
    material.uniforms.sphereRadius.value = sphereRadius;
  });

  return <mesh geometry={geometry} material={material} renderOrder={0} />;
}
