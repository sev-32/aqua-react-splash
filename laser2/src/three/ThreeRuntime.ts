// Typed access to the three.js r160 instance compiled into the legacy bundle.
//
// tools/expose_legacy_three.mjs patches the quarantined bundle so that it
// publishes its own classes as window.LASER2_THREE_R160. Native systems create
// every object from that namespace, which guarantees that the renderer, the
// legacy rig and the new systems share one three.js instance (identical shader
// chunks, math classes and program cache) without shipping a second copy.
//
// A few classes were tree-shaken out of the legacy bundle. The renderer still
// contains the code paths that consume them (they are selected by is* flags),
// so the thin subclasses below restore them without new rendering code.

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ThreeR160 {
  readonly REVISION: string;
  readonly Vector2: any;
  readonly Vector3: any;
  readonly Vector4: any;
  readonly Quaternion: any;
  readonly Matrix3: any;
  readonly Matrix4: any;
  readonly Color: any;
  readonly Euler: any;
  readonly Box3: any;
  readonly Sphere: any;
  readonly Plane: any;
  readonly Object3D: any;
  readonly Group: any;
  readonly Mesh: any;
  readonly Scene: any;
  readonly Camera: any;
  readonly PerspectiveCamera: any;
  readonly OrthographicCamera: any;
  readonly BufferGeometry: any;
  readonly BufferAttribute: any;
  readonly Float32BufferAttribute: any;
  readonly Uint16BufferAttribute: any;
  readonly Uint32BufferAttribute: any;
  readonly ShaderMaterial: any;
  readonly MeshStandardMaterial: any;
  readonly MeshPhysicalMaterial: any;
  readonly MeshBasicMaterial: any;
  readonly Material: any;
  readonly Texture: any;
  readonly DataTexture: any;
  readonly CanvasTexture: any;
  readonly DepthTexture: any;
  readonly WebGLRenderTarget: any;
  readonly PlaneGeometry: any;
  readonly SphereGeometry: any;
  readonly CylinderGeometry: any;
  readonly BoxGeometry: any;
  readonly TorusGeometry?: any;
  readonly SkinnedMesh: any;
  readonly Bone: any;
  readonly DirectionalLight: any;
}

/** three.js r160 enum values used by native systems (stable across r15x-r16x). */
export const GL = Object.freeze({
  FrontSide: 0,
  BackSide: 1,
  DoubleSide: 2,
  NoBlending: 0,
  NormalBlending: 1,
  AdditiveBlending: 2,
  CustomBlending: 5,
  UnsignedByteType: 1009,
  UnsignedShortType: 1012,
  UnsignedIntType: 1014,
  FloatType: 1015,
  HalfFloatType: 1016,
  UnsignedInt248Type: 1020,
  RedFormat: 1028,
  RGBAFormat: 1023,
  DepthFormat: 1026,
  DepthStencilFormat: 1027,
  RepeatWrapping: 1000,
  ClampToEdgeWrapping: 1001,
  NearestFilter: 1003,
  LinearFilter: 1006,
  LinearMipmapLinearFilter: 1008,
  NeverDepth: 0,
  AlwaysDepth: 1,
  LessDepth: 2,
  LessEqualDepth: 3,
  NoToneMapping: 0,
  ACESFilmicToneMapping: 4,
  SRGBColorSpace: 'srgb',
  LinearSRGBColorSpace: 'srgb-linear',
  NoColorSpace: '',
  EquirectangularReflectionMapping: 303,
  OneFactor: 201,
  OneMinusSrcAlphaFactor: 205,
  SrcAlphaFactor: 204,
  AddEquation: 100,
});

let cached: ThreeR160 | null = null;

export function three(): ThreeR160 {
  if (cached) return cached;
  const namespace = (window as any).LASER2_THREE_R160 as ThreeR160 | undefined;
  if (!namespace?.Vector3 || !namespace.WebGLRenderTarget) {
    throw new Error('LASER2_THREE_R160 is unavailable; run tools/expose_legacy_three.mjs on the legacy bundle');
  }
  cached = namespace;
  return namespace;
}

let instancedGeometryCtor: any = null;
let instancedAttributeCtor: any = null;
let pointsCtor: any = null;

/** InstancedBufferGeometry (tree-shaken from the legacy bundle). */
export function InstancedBufferGeometry(): any {
  if (instancedGeometryCtor) return instancedGeometryCtor;
  const T = three();
  instancedGeometryCtor = class extends T.BufferGeometry {
    isInstancedBufferGeometry = true;
    type = 'InstancedBufferGeometry';
    instanceCount = Infinity;
    copy(source: any): any {
      super.copy(source);
      this.instanceCount = source.instanceCount;
      return this;
    }
  };
  return instancedGeometryCtor;
}

/** InstancedBufferAttribute (tree-shaken from the legacy bundle). */
export function InstancedBufferAttribute(): any {
  if (instancedAttributeCtor) return instancedAttributeCtor;
  const T = three();
  instancedAttributeCtor = class extends T.BufferAttribute {
    isInstancedBufferAttribute = true;
    meshPerAttribute: number;
    constructor(array: ArrayLike<number>, itemSize: number, normalized = false, meshPerAttribute = 1) {
      super(array, itemSize, normalized);
      this.meshPerAttribute = meshPerAttribute;
    }
  };
  return instancedAttributeCtor;
}

/** Minimal Points object; the r160 renderer selects GL_POINTS through isPoints. */
export function Points(): any {
  if (pointsCtor) return pointsCtor;
  const T = three();
  pointsCtor = class extends T.Object3D {
    isPoints = true;
    type = 'Points';
    geometry: any;
    material: any;
    constructor(geometry: any, material: any) {
      super();
      this.geometry = geometry;
      this.material = material;
    }
  };
  return pointsCtor;
}
