import type { AppContext, AppSystem } from '../core/System.js';
import type { NativeHullAssetSystem } from './NativeHullAssetSystem.js';

interface BatchGroup {
  material: any;
  meshes: any[];
}

export class NativeHullBatchSystem implements AppSystem {
  readonly id = 'scene.native-hull-batches';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  root: any = null;
  private sourceMeshes = 0;
  private batchMeshes = 0;
  private sourceTriangles = 0;
  private batchTriangles = 0;
  private sourceVertices = 0;
  private batchVertices = 0;
  private buildMs = 0;
  private materialGroups = 0;
  private errors: string[] = [];

  constructor(readonly nativeHull: NativeHullAssetSystem) {}

  init(context: AppContext): void {
    const started = performance.now();
    if (!this.nativeHull.root) throw new Error('Native hull root unavailable for batching');
    const GroupCtor = this.nativeHull.root.constructor;
    const source = [...this.nativeHull.bySemanticId.values()].filter((mesh) => mesh?.isMesh && mesh.geometry && mesh.material);
    this.sourceMeshes = source.length;
    const groups = new Map<any, BatchGroup>();
    for (const mesh of source) {
      const key = mesh.material;
      const group = groups.get(key) ?? { material: key, meshes: [] };
      group.meshes.push(mesh);
      groups.set(key, group);
    }
    this.materialGroups = groups.size;
    const root = new GroupCtor();
    root.name = 'foundry.native-hull-batches.v7';
    root.userData = root.userData ?? {};
    root.userData.foundryAuthority = 'static-material-batched-native-hull';
    this.root = root;
    this.nativeHull.root.add(root);

    let batchIndex = 0;
    for (const group of groups.values()) {
      try {
        const batch = this.mergeGroup(group, batchIndex++);
        root.add(batch);
        this.batchMeshes++;
      } catch (error) {
        this.errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    if (this.errors.length) throw new Error(`Native hull batching failed: ${this.errors.join('; ')}`);
    for (const mesh of source) {
      mesh.userData = mesh.userData ?? {};
      mesh.userData.foundryBatchedSource = true;
      mesh.userData.foundryVisibilityBeforeBatch = mesh.visible;
      mesh.visible = false;
    }
    this.buildMs = performance.now() - started;
  }

  private mergeGroup(group: BatchGroup, batchIndex: number): any {
    const first = group.meshes[0];
    const GeometryCtor = first.geometry.constructor;
    const MeshCtor = first.constructor;
    const geometry = new GeometryCtor();
    const attributeNames = Object.keys(first.geometry.attributes).filter((name) =>
      group.meshes.every((mesh) => mesh.geometry.attributes[name]?.itemSize === first.geometry.attributes[name].itemSize),
    );
    const totalVertices = group.meshes.reduce((sum, mesh) => sum + (mesh.geometry.attributes.position?.count ?? 0), 0);
    const totalIndices = group.meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position?.count ?? 0), 0);
    const attributeArrays = new Map<string, Float32Array>();
    for (const name of attributeNames) {
      const itemSize = first.geometry.attributes[name].itemSize;
      attributeArrays.set(name, new Float32Array(totalVertices * itemSize));
    }
    const IndexArray = totalVertices > 65535 ? Uint32Array : Uint16Array;
    const indices = new IndexArray(totalIndices);
    let vertexOffset = 0;
    let indexOffset = 0;
    const Vec3 = first.position.constructor;
    for (const mesh of group.meshes) {
      mesh.updateMatrix?.();
      const position = mesh.geometry.attributes.position;
      const count = position.count;
      for (let vertex = 0; vertex < count; vertex++) {
        for (const name of attributeNames) {
          const source = mesh.geometry.attributes[name];
          const destination = attributeArrays.get(name)!;
          const itemSize = source.itemSize;
          if (name === 'position') {
            const point = new Vec3(source.getX(vertex), source.getY(vertex), source.getZ(vertex)).applyMatrix4(mesh.matrix);
            destination[(vertexOffset + vertex) * itemSize] = point.x;
            destination[(vertexOffset + vertex) * itemSize + 1] = point.y;
            destination[(vertexOffset + vertex) * itemSize + 2] = point.z;
          } else if (name === 'normal') {
            const normal = new Vec3(source.getX(vertex), source.getY(vertex), source.getZ(vertex)).transformDirection(mesh.matrix);
            destination[(vertexOffset + vertex) * itemSize] = normal.x;
            destination[(vertexOffset + vertex) * itemSize + 1] = normal.y;
            destination[(vertexOffset + vertex) * itemSize + 2] = normal.z;
          } else {
            for (let component = 0; component < itemSize; component++) {
              destination[(vertexOffset + vertex) * itemSize + component] = source.array[vertex * itemSize + component] ?? 0;
            }
          }
        }
      }
      if (mesh.geometry.index) {
        for (let i = 0; i < mesh.geometry.index.count; i++) indices[indexOffset++] = vertexOffset + mesh.geometry.index.getX(i);
      } else {
        for (let i = 0; i < count; i++) indices[indexOffset++] = vertexOffset + i;
      }
      this.sourceVertices += count;
      this.sourceTriangles += mesh.geometry.index ? Math.floor(mesh.geometry.index.count / 3) : Math.floor(count / 3);
      vertexOffset += count;
    }
    for (const name of attributeNames) {
      const sourceAttribute = first.geometry.attributes[name];
      const AttributeCtor = sourceAttribute.constructor;
      geometry.setAttribute(name, new AttributeCtor(attributeArrays.get(name)!, sourceAttribute.itemSize, sourceAttribute.normalized));
    }
    // Important: the index must use the source INDEX attribute constructor, not
    // the position attribute constructor. The latter caused GL_INVALID_ENUM in
    // the earlier diagnostic branch.
    const IndexAttributeCtor = first.geometry.index?.constructor ?? first.geometry.attributes.position.constructor;
    geometry.setIndex(new IndexAttributeCtor(indices, 1, false));
    geometry.computeBoundingBox?.();
    geometry.computeBoundingSphere?.();
    geometry.name = `foundry.native-hull-batch.${batchIndex}.geometry`;
    const batch = new MeshCtor(geometry, group.material);
    batch.name = `foundry.native-hull-batch.${batchIndex}`;
    batch.castShadow = group.meshes.some((mesh) => mesh.castShadow);
    batch.receiveShadow = group.meshes.some((mesh) => mesh.receiveShadow);
    batch.userData = batch.userData ?? {};
    batch.userData.foundryBatchGenerated = true;
    batch.userData.foundryBatchMesh = true;
    batch.userData.foundryBatchSourceIds = group.meshes.map((mesh) => mesh.userData?.foundrySemanticId ?? mesh.name);
    this.batchVertices += totalVertices;
    this.batchTriangles += Math.floor(totalIndices / 3);
    return batch;
  }

  telemetry(): Record<string, unknown> {
    return {
      built: !!this.root,
      sourceMeshes: this.sourceMeshes,
      batchMeshes: this.batchMeshes,
      materialGroups: this.materialGroups,
      drawCallReduction: this.sourceMeshes - this.batchMeshes,
      sourceVertices: this.sourceVertices,
      batchVertices: this.batchVertices,
      sourceTriangles: this.sourceTriangles,
      batchTriangles: this.batchTriangles,
      topologyParity: this.sourceVertices === this.batchVertices && this.sourceTriangles === this.batchTriangles,
      buildMs: this.buildMs,
      errors: [...this.errors],
      model: '27 semantic static hull/deck/fitting meshes merged by pooled material into shared indexed BufferGeometry batches',
      truthBoundary: 'Semantic source meshes remain hidden for inspection selection. A future ID-buffer picker can remove that duplicate CPU geometry path entirely.',
    };
  }

  dispose(): void {
    this.root?.traverse?.((object: any) => { if (object?.isMesh) object.geometry?.dispose?.(); });
    this.root?.removeFromParent?.();
    for (const mesh of this.nativeHull.bySemanticId.values()) {
      if (mesh?.userData?.foundryBatchedSource) mesh.visible = mesh.userData.foundryVisibilityBeforeBatch !== false;
    }
  }
}
