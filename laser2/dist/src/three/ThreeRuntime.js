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
let cached = null;
export function three() {
    if (cached)
        return cached;
    const namespace = window.LASER2_THREE_R160;
    if (!namespace?.Vector3 || !namespace.WebGLRenderTarget) {
        throw new Error('LASER2_THREE_R160 is unavailable; run tools/expose_legacy_three.mjs on the legacy bundle');
    }
    cached = namespace;
    return namespace;
}
let instancedGeometryCtor = null;
let instancedAttributeCtor = null;
let pointsCtor = null;
/** InstancedBufferGeometry (tree-shaken from the legacy bundle). */
export function InstancedBufferGeometry() {
    if (instancedGeometryCtor)
        return instancedGeometryCtor;
    const T = three();
    instancedGeometryCtor = class extends T.BufferGeometry {
        isInstancedBufferGeometry = true;
        type = 'InstancedBufferGeometry';
        instanceCount = Infinity;
        copy(source) {
            super.copy(source);
            this.instanceCount = source.instanceCount;
            return this;
        }
    };
    return instancedGeometryCtor;
}
/** InstancedBufferAttribute (tree-shaken from the legacy bundle). */
export function InstancedBufferAttribute() {
    if (instancedAttributeCtor)
        return instancedAttributeCtor;
    const T = three();
    instancedAttributeCtor = class extends T.BufferAttribute {
        isInstancedBufferAttribute = true;
        meshPerAttribute;
        constructor(array, itemSize, normalized = false, meshPerAttribute = 1) {
            super(array, itemSize, normalized);
            this.meshPerAttribute = meshPerAttribute;
        }
    };
    return instancedAttributeCtor;
}
/** Minimal Points object; the r160 renderer selects GL_POINTS through isPoints. */
export function Points() {
    if (pointsCtor)
        return pointsCtor;
    const T = three();
    pointsCtor = class extends T.Object3D {
        isPoints = true;
        type = 'Points';
        geometry;
        material;
        constructor(geometry, material) {
            super();
            this.geometry = geometry;
            this.material = material;
        }
    };
    return pointsCtor;
}
//# sourceMappingURL=ThreeRuntime.js.map