import type { AppContext, AppSystem } from '../core/System.js';

interface SerializedAttribute {
  arrayType: string;
  itemSize: number;
  normalized: boolean;
  byteOffset: number;
  elementCount: number;
  byteLength: number;
}

interface SerializedMesh {
  sourceChildIndex: number;
  id: string;
  name: string;
  sourceGeometryType: string;
  transform: { position: number[]; quaternion: number[]; scale: number[] };
  attributes: Record<string, SerializedAttribute>;
  index: SerializedAttribute | null;
  material: { sourceId: number | null; sourceType: string | null };
  castShadow: boolean;
  receiveShadow: boolean;
  renderOrder: number;
}

interface StaticHullAsset {
  schema: string;
  version: string;
  sourceProject: string;
  sourceEntrypointSha256: string;
  coordinateSystem: string;
  sourceJson: string;
  sourceJsonBytes: number;
  sourceJsonSha256: string;
  binary: { file: string; bytes: number; sha256: string; endianness: string };
  meshes: SerializedMesh[];
}

interface SourceResources {
  geometry: any;
  materials: any[];
}

export class NativeHullAssetSystem implements AppSystem {
  readonly id = 'scene.native-static-hull';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  root: any = null;
  readonly bySemanticId = new Map<string, any>();
  readonly sourceBySemanticId = new Map<string, any>();
  private context: AppContext | null = null;
  private asset: StaticHullAsset | null = null;
  private binaryBuffer: ArrayBuffer | null = null;
  private manifestBytes = 0;
  private loadMs = 0;
  private buildMs = 0;
  private sourceTriangles = 0;
  private nativeTriangles = 0;
  private sourceVertices = 0;
  private nativeVertices = 0;
  private nativeMaterialInstances = 0;
  private retiredLegacyMeshes = 0;
  private releasedGeometryResources = 0;
  private releasedMaterialResources = 0;
  private estimatedReleasedGeometryBytes = 0;
  private emptyLegacyGeometry: any = null;
  private retiredLegacyMaterial: any = null;
  private readonly pooledMaterials = new Map<string, any>();
  private readonly errors: string[] = [];

  async init(context: AppContext): Promise<void> {
    this.context = context;
    const loadStart = performance.now();
    const manifestResponse = await fetch('./assets/boat/hull-static-v3.manifest.json', { cache: 'no-store' });
    if (!manifestResponse.ok) throw new Error(`Static hull manifest load failed: ${manifestResponse.status}`);
    const manifestText = await manifestResponse.text();
    this.manifestBytes = new TextEncoder().encode(manifestText).byteLength;
    this.asset = JSON.parse(manifestText) as StaticHullAsset;
    if (this.asset.schema !== 'laser2-native-static-hull-binary-v3') {
      throw new Error(`Unexpected hull asset schema: ${this.asset.schema}`);
    }
    const binaryResponse = await fetch(`./assets/boat/${this.asset.binary.file}`, { cache: 'no-store' });
    if (!binaryResponse.ok) throw new Error(`Static hull binary load failed: ${binaryResponse.status}`);
    this.binaryBuffer = await binaryResponse.arrayBuffer();
    if (this.binaryBuffer.byteLength !== this.asset.binary.bytes) {
      throw new Error(`Static hull binary byte mismatch: ${this.binaryBuffer.byteLength} !== ${this.asset.binary.bytes}`);
    }
    this.loadMs = performance.now() - loadStart;
    this.build(context);
    if (this.errors.length) throw new Error(`Native hull build failed: ${this.errors.join('; ')}`);
  }

  private typedArray(attribute: SerializedAttribute): ArrayBufferView {
    if (!this.binaryBuffer) throw new Error('Hull binary buffer unavailable');
    const Constructor = (globalThis as any)[attribute.arrayType] as {
      new(buffer: ArrayBuffer, byteOffset?: number, length?: number): ArrayBufferView;
    } | undefined;
    if (!Constructor) throw new Error(`Unsupported typed array ${attribute.arrayType}`);
    if (attribute.byteOffset < 0 || attribute.byteLength < 0 || attribute.byteOffset + attribute.byteLength > this.binaryBuffer.byteLength) {
      throw new Error(`Attribute range outside binary buffer: ${attribute.byteOffset}+${attribute.byteLength}`);
    }
    return new Constructor(this.binaryBuffer, attribute.byteOffset, attribute.elementCount);
  }

  private triangleCount(geometry: any): number {
    const index = geometry.index?.count ?? 0;
    const position = geometry.attributes?.position?.count ?? 0;
    return index > 0 ? Math.floor(index / 3) : Math.floor(position / 3);
  }

  private vertexCount(geometry: any): number {
    return geometry.attributes?.position?.count ?? 0;
  }

  private geometryBytes(geometry: any): number {
    let bytes = geometry.index?.array?.byteLength ?? 0;
    for (const attribute of Object.values(geometry.attributes ?? {}) as any[]) bytes += attribute?.array?.byteLength ?? 0;
    return bytes;
  }

  private materialKey(material: any): string {
    if (Array.isArray(material)) return `array:${material.map((entry) => entry?.id ?? entry?.uuid ?? 'unknown').join(',')}`;
    return `single:${material?.id ?? material?.uuid ?? material?.type ?? 'unknown'}`;
  }

  private pooledMaterial(sourceMaterial: any, semanticId: string): any {
    const key = this.materialKey(sourceMaterial);
    const existing = this.pooledMaterials.get(key);
    if (existing) return existing;
    const material = Array.isArray(sourceMaterial)
      ? sourceMaterial.map((entry: any) => entry.clone())
      : sourceMaterial.clone();
    const entries = Array.isArray(material) ? material : [material];
    for (const entry of entries) {
      entry.name = `foundry.hull.material-pool.${key}`;
      entry.userData = entry.userData ?? {};
      entry.userData.foundryNativeHull = true;
      entry.userData.foundryMaterialPoolKey = key;
      entry.userData.foundryFirstSemanticId = semanticId;
      this.nativeMaterialInstances++;
    }
    this.pooledMaterials.set(key, material);
    return material;
  }

  private build(context: AppContext): void {
    if (!this.asset) return;
    const start = performance.now();
    const master = context.legacy.master;
    const GroupCtor = master.boat?.constructor;
    const fallbackSource = master.boat?.children?.find?.((object: any) => object?.isMesh && object.geometry);
    const MeshCtor = fallbackSource?.constructor;
    const BufferGeometryCtor = fallbackSource?.geometry?.constructor;
    if (!GroupCtor || !MeshCtor || !BufferGeometryCtor) throw new Error('Native hull constructors unavailable');

    const root = new GroupCtor();
    root.name = 'foundry.native-hull.v3';
    root.userData = root.userData ?? {};
    root.userData.foundryAuthority = 'native-static-geometry-asset';
    root.userData.foundryAsset = 'hull-static-v3.manifest.json + hull-static-v3.bin';
    this.root = root;

    const sourceResources = new Map<any, SourceResources>();
    for (const serialized of this.asset.meshes) {
      try {
        const source = master.boat.children[serialized.sourceChildIndex];
        if (!source?.isMesh || !source.geometry || !source.material) {
          throw new Error(`source boat child ${serialized.sourceChildIndex} unavailable`);
        }
        sourceResources.set(source, {
          geometry: source.geometry,
          materials: Array.isArray(source.material) ? [...source.material] : [source.material],
        });
        const geometry = new BufferGeometryCtor();
        for (const [name, attribute] of Object.entries(serialized.attributes)) {
          const SourceAttributeCtor = source.geometry.attributes?.[name]?.constructor ?? source.geometry.attributes.position.constructor;
          const array = this.typedArray(attribute);
          geometry.setAttribute(name, new SourceAttributeCtor(array, attribute.itemSize, attribute.normalized));
        }
        if (serialized.index) {
          const SourceIndexCtor = source.geometry.index?.constructor ?? source.geometry.attributes.position.constructor;
          const array = this.typedArray(serialized.index);
          geometry.setIndex(new SourceIndexCtor(array, serialized.index.itemSize, serialized.index.normalized));
        }
        geometry.name = `${serialized.id}.geometry`;
        geometry.userData = geometry.userData ?? {};
        geometry.userData.foundrySourceGeometryType = serialized.sourceGeometryType;
        geometry.computeBoundingBox?.();
        geometry.computeBoundingSphere?.();

        const material = this.pooledMaterial(source.material, serialized.id);
        const mesh = new MeshCtor(geometry, material);
        mesh.name = serialized.id;
        mesh.position.fromArray(serialized.transform.position);
        mesh.quaternion.fromArray(serialized.transform.quaternion);
        mesh.scale.fromArray(serialized.transform.scale);
        mesh.castShadow = serialized.castShadow;
        mesh.receiveShadow = serialized.receiveShadow;
        mesh.renderOrder = serialized.renderOrder;
        mesh.userData = mesh.userData ?? {};
        mesh.userData.foundrySemanticId = serialized.id;
        mesh.userData.foundrySourceBoatChild = serialized.sourceChildIndex;
        mesh.userData.foundryNativeAsset = 'hull-static-v3.bin';
        mesh.userData.foundryGeometryAuthority = 'native';
        root.add(mesh);
        this.bySemanticId.set(serialized.id, mesh);
        this.sourceBySemanticId.set(serialized.id, source);

        source.userData = source.userData ?? {};
        source.userData.foundryReplacedBy = serialized.id;
        source.userData.foundryLegacyVisibilityBeforeReplacement = source.visible;
        source.visible = false;
        this.sourceTriangles += this.triangleCount(source.geometry);
        this.nativeTriangles += this.triangleCount(geometry);
        this.sourceVertices += this.vertexCount(source.geometry);
        this.nativeVertices += this.vertexCount(geometry);
      } catch (error) {
        this.errors.push(`${serialized.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.retireLegacyResources(context, BufferGeometryCtor, fallbackSource, sourceResources);
    this.syncTransform();
    this.buildMs = performance.now() - start;
  }

  private retireLegacyResources(
    context: AppContext,
    BufferGeometryCtor: any,
    fallbackSource: any,
    sourceResources: Map<any, SourceResources>,
  ): void {
    const replacementSources = new Set(sourceResources.keys());
    const geometryUsers = new Map<any, Set<any>>();
    const materialUsers = new Map<any, Set<any>>();
    context.legacy.scene.traverse((object: any) => {
      if (!object?.isMesh) return;
      if (object.geometry) {
        const users = geometryUsers.get(object.geometry) ?? new Set<any>();
        users.add(object); geometryUsers.set(object.geometry, users);
      }
      for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
        const users = materialUsers.get(material) ?? new Set<any>();
        users.add(object); materialUsers.set(material, users);
      }
    });

    this.emptyLegacyGeometry = new BufferGeometryCtor();
    this.emptyLegacyGeometry.name = 'foundry.retired-static-hull.empty-geometry';
    const MaterialCtor = Array.isArray(fallbackSource.material)
      ? fallbackSource.material[0]?.constructor
      : fallbackSource.material?.constructor;
    this.retiredLegacyMaterial = MaterialCtor ? new MaterialCtor({ visible: false }) : null;
    if (this.retiredLegacyMaterial) {
      this.retiredLegacyMaterial.name = 'foundry.retired-static-hull.material';
      this.retiredLegacyMaterial.visible = false;
      this.retiredLegacyMaterial.depthWrite = false;
      this.retiredLegacyMaterial.colorWrite = false;
    }

    const disposedGeometries = new Set<any>();
    const disposedMaterials = new Set<any>();
    for (const [source, resources] of sourceResources) {
      source.geometry = this.emptyLegacyGeometry;
      if (this.retiredLegacyMaterial) source.material = this.retiredLegacyMaterial;
      source.visible = false;
      source.userData.foundryLegacyResourcesRetired = true;
      this.retiredLegacyMeshes++;

      const geometryUsersForResource = geometryUsers.get(resources.geometry) ?? new Set<any>();
      if ([...geometryUsersForResource].every((user) => replacementSources.has(user)) && !disposedGeometries.has(resources.geometry)) {
        this.estimatedReleasedGeometryBytes += this.geometryBytes(resources.geometry);
        resources.geometry.dispose?.();
        disposedGeometries.add(resources.geometry);
        this.releasedGeometryResources++;
      }
      for (const material of resources.materials) {
        const users = materialUsers.get(material) ?? new Set<any>();
        if ([...users].every((user) => replacementSources.has(user)) && !disposedMaterials.has(material)) {
          material.dispose?.();
          disposedMaterials.add(material);
          this.releasedMaterialResources++;
        }
      }
    }
  }

  update(_dtSeconds: number, _context: AppContext): void {
    this.syncTransform();
  }

  private syncTransform(): void {
    if (!this.root || !this.context) return;
    const boat = this.context.legacy.master.boat;
    this.root.position.copy(boat.position);
    this.root.quaternion.copy(boat.quaternion);
    this.root.scale.copy(boat.scale);
    this.root.updateMatrix?.();
  }

  get(id: string): any | null {
    return this.bySemanticId.get(id) ?? null;
  }

  dispose(): void {
    this.root?.traverse?.((object: any) => {
      if (!object?.isMesh) return;
      object.geometry?.dispose?.();
    });
    for (const material of this.pooledMaterials.values()) {
      for (const entry of Array.isArray(material) ? material : [material]) entry?.dispose?.();
    }
    this.emptyLegacyGeometry?.dispose?.();
    this.retiredLegacyMaterial?.dispose?.();
    this.root?.removeFromParent?.();
  }

  telemetry(): Record<string, unknown> {
    return {
      schema: this.asset?.schema ?? null,
      assetVersion: this.asset?.version ?? null,
      assetBackend: 'binary typed-array views',
      manifestBytes: this.manifestBytes,
      binaryBytes: this.binaryBuffer?.byteLength ?? 0,
      sourceJsonBytes: this.asset?.sourceJsonBytes ?? 0,
      transferReductionRatio: this.asset?.sourceJsonBytes
        ? (this.manifestBytes + (this.binaryBuffer?.byteLength ?? 0)) / this.asset.sourceJsonBytes
        : null,
      sourceHash: this.asset?.sourceEntrypointSha256 ?? null,
      loaded: !!this.asset,
      rootMounted: !!this.root?.parent,
      nativeMeshes: this.bySemanticId.size,
      hiddenLegacyMeshes: this.sourceBySemanticId.size,
      retiredLegacyMeshes: this.retiredLegacyMeshes,
      sourceTriangles: this.sourceTriangles,
      nativeTriangles: this.nativeTriangles,
      sourceVertices: this.sourceVertices,
      nativeVertices: this.nativeVertices,
      topologyParity: this.sourceTriangles === this.nativeTriangles && this.sourceVertices === this.nativeVertices && this.nativeTriangles > 0,
      nativeMaterialPoolKeys: this.pooledMaterials.size,
      nativeMaterialInstances: this.nativeMaterialInstances,
      releasedGeometryResources: this.releasedGeometryResources,
      releasedMaterialResources: this.releasedMaterialResources,
      estimatedReleasedGeometryBytes: this.estimatedReleasedGeometryBytes,
      loadMs: this.loadMs,
      buildMs: this.buildMs,
      errors: [...this.errors],
      authority: '27 static hull/deck/fitting meshes reconstructed from a compact binary typed-array asset; compatibility mesh identities remain as empty hidden placeholders while unique legacy GPU resources are retired',
    };
  }
}
