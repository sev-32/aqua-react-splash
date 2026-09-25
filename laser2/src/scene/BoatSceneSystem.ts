import type { AppContext, AppSystem } from '../core/System.js';
import { BOAT_CHILD_BINDINGS, RIG_CHILD_BINDINGS } from './BoatSceneBindings.js';
import type { SceneEntity, SceneEntityGroup } from './SceneEntity.js';
import { NativeHullAssetSystem } from './NativeHullAssetSystem.js';

function collectMeshes(root: any): any[] {
  const meshes: any[] = [];
  root?.traverse?.((object: any) => { if (object?.isMesh && object.geometry) meshes.push(object); });
  if (root?.isMesh && !meshes.includes(root)) meshes.unshift(root);
  return meshes;
}

function triangleCount(objects: readonly any[]): number {
  let triangles = 0;
  const seen = new Set<any>();
  for (const root of objects) {
    for (const mesh of collectMeshes(root)) {
      if (seen.has(mesh)) continue;
      seen.add(mesh);
      const indexCount = mesh.geometry?.index?.count ?? 0;
      const positionCount = mesh.geometry?.attributes?.position?.count ?? 0;
      triangles += indexCount > 0 ? Math.floor(indexCount / 3) : Math.floor(positionCount / 3);
    }
  }
  return triangles;
}

function rootMost(objects: readonly any[]): any[] {
  const set = new Set(objects.filter(Boolean));
  return [...set].filter((object) => {
    let parent = object.parent;
    while (parent) {
      if (set.has(parent)) return false;
      parent = parent.parent;
    }
    return true;
  });
}

function collectObjectRefs(value: unknown, depth = 4, out = new Set<any>(), seen = new Set<unknown>()): Set<any> {
  if (!value || depth < 0 || seen.has(value)) return out;
  if (typeof value !== 'object') return out;
  seen.add(value);
  const object = value as any;
  if (object.isObject3D) {
    out.add(object);
    return out;
  }
  if (Array.isArray(object)) {
    for (const item of object) collectObjectRefs(item, depth - 1, out, seen);
    return out;
  }
  for (const entry of Object.values(object)) collectObjectRefs(entry, depth - 1, out, seen);
  return out;
}

export class BoatSceneSystem implements AppSystem {
  readonly id = 'scene.boat-semantic-root';
  readonly phase = 'postPhysics' as const;
  enabled = true;
  readonly entities: SceneEntity[] = [];
  readonly byId = new Map<string, SceneEntity>();
  root: any = null;
  private groups = new Map<string, any>();
  private assignedMeshes = new Set<any>();
  private unassignedMeshes: any[] = [];
  private bindingErrors: string[] = [];
  private ownedTopLevelRoots = 0;
  private nativeOwnedRoots = 0;

  constructor(private readonly nativeHull: NativeHullAssetSystem) {}

  init(context: AppContext): void {
    this.createNativeRoot(context);
    this.buildSemanticEntities(context);
    context.events.emit('scene:ready', { entities: this.entities.length, unassignedMeshes: this.unassignedMeshes.length });
  }

  private createNativeRoot(context: AppContext): void {
    const scene = context.legacy.scene;
    const GroupCtor = context.legacy.master.boat?.constructor;
    if (!GroupCtor) throw new Error('Cannot construct Foundry scene groups');
    const root = new GroupCtor();
    root.name = 'foundry.scene-root.v3';
    root.userData.foundryAuthority = 'native-semantic-scene-index';
    scene.add(root);
    this.root = root;

    for (const id of ['assembly', 'rig', 'sails', 'ropes', 'hardware', 'environment', 'diagnostics']) {
      const group = new GroupCtor();
      group.name = `foundry.${id}`;
      group.userData.foundrySemanticGroup = id;
      root.add(group);
      this.groups.set(id, group);
    }

    const assembly = this.groups.get('assembly');
    if (assembly && this.nativeHull.root) {
      assembly.add(this.nativeHull.root);
      this.nativeHull.root.userData.foundryOwnerGroup = 'assembly';
      this.nativeOwnedRoots++;
    }

    // Do not reparent compatibility geometry. Several legacy update functions
    // write transforms assuming the original parent graph. Foundry owns semantic
    // identity and frame execution while preserving the validated transform
    // graph until each geometry constructor is migrated natively.
    const link = (groupId: string, object: any, binding: string): void => {
      if (!object) return;
      const group = this.groups.get(groupId);
      if (!group) return;
      const node = new GroupCtor();
      node.name = `foundry.link.${groupId}.${this.ownedTopLevelRoots + 1}`;
      node.visible = false;
      node.userData.boundObjectUuid = object.uuid ?? null;
      node.userData.boundObjectId = object.id ?? null;
      node.userData.sourceBinding = binding;
      group.add(node);
      object.userData = object.userData ?? {};
      object.userData.foundryOwnerGroup = groupId;
      this.ownedTopLevelRoots++;
    };

    link('assembly', context.legacy.master.boat, 'master.boat');
    link('rig', context.legacy.master.rig?.group, 'master.rig.group');
    const optics = context.legacy.sailOpticsV17;
    for (const entry of optics?.sails ?? []) {
      link('sails', entry.mesh, `optics.${entry.kind}.mesh`);
      link('sails', entry.vinyl, `optics.${entry.kind}.vinyl`);
    }
    for (const [key, route] of Object.entries(context.legacy.ropeV16?.ropes ?? {}) as Array<[string, any]>) {
      link('ropes', route?.mesh, `rope.${key}.mesh`);
    }
    link('hardware', scene.getObjectByName?.('laser2-v16-procedural-rope-hardware'), 'hardware.root');
  }

  private register(entity: Omit<SceneEntity, 'triangleCount'>, assignSemanticId = true): void {
    if (this.byId.has(entity.id)) {
      this.bindingErrors.push(`duplicate semantic id ${entity.id}`);
      return;
    }
    const objects = rootMost(entity.objects.filter(Boolean));
    if (!objects.length) {
      this.bindingErrors.push(`missing objects for ${entity.id} at ${entity.sourceBinding}`);
      return;
    }
    const completed: SceneEntity = { ...entity, objects, triangleCount: triangleCount(objects) };
    this.entities.push(completed);
    this.byId.set(completed.id, completed);
    if (assignSemanticId) {
      for (const object of objects) {
        object.userData = object.userData ?? {};
        object.userData.foundrySemanticId = completed.id;
        object.userData.foundrySemanticGroup = completed.group;
        if (!object.name || /^laser2-(main|jib|spin)-/.test(object.name)) object.name = completed.id;
        for (const mesh of collectMeshes(object)) this.assignedMeshes.add(mesh);
      }
    }
  }

  private bindIndexedChildren(root: any, bindings: readonly { index: number; id: string; name: string; group: SceneEntityGroup }[], source: string): void {
    for (const binding of bindings) {
      const nativeObject = binding.id.startsWith('hull.') ? this.nativeHull.get(binding.id) : null;
      const object = nativeObject ?? root?.children?.[binding.index];
      this.register({
        id: binding.id,
        name: binding.name,
        group: binding.group,
        objects: object ? [object] : [],
        sourceBinding: nativeObject
          ? `NativeHullAssetSystem.get(${JSON.stringify(binding.id)})`
          : `${source}.children[${binding.index}]`,
        verified: !!object,
        description: nativeObject
          ? 'Native static hull/deck/fitting geometry reconstructed from the versioned hull asset.'
          : 'Stable extracted binding from the versioned Laser 2 semantic manifest.',
      });
    }
  }

  private buildSemanticEntities(context: AppContext): void {
    this.entities.length = 0;
    this.byId.clear();
    this.assignedMeshes.clear();
    this.bindingErrors.length = 0;
    const master = context.legacy.master;

    this.bindIndexedChildren(master.boat, BOAT_CHILD_BINDINGS, 'master.boat');
    this.bindIndexedChildren(master.rig?.group, RIG_CHILD_BINDINGS, 'master.rig.group');

    const optics = context.legacy.sailOpticsV17;
    const sailNames: Record<string, string> = { main: 'Main sail', jib: 'Jib', spin: 'Spinnaker' };
    for (const entry of optics?.sails ?? []) {
      const baseId = entry.kind === 'spin' ? 'sails.spinnaker' : `sails.${entry.kind}`;
      this.register({
        id: `${baseId}.cloth`, name: `${sailNames[entry.kind] ?? entry.kind} cloth`, group: 'sails',
        objects: [entry.mesh], sourceBinding: `LASER2_SAIL_OPTICS_V17.sails[${entry.kind}].mesh`, verified: true,
        description: 'Deforming woven sail sheet using the retained V17 optical authority.',
      });
      if (entry.vinyl) {
        this.register({
          id: `${baseId}.window`, name: `${sailNames[entry.kind] ?? entry.kind} vinyl window`, group: 'sails',
          objects: [entry.vinyl], sourceBinding: `LASER2_SAIL_OPTICS_V17.sails[${entry.kind}].vinyl`, verified: true,
          description: 'Co-moving clear vinyl window with physical transmission and reflection.',
        });
      }
      this.register({
        id: baseId, name: `${sailNames[entry.kind] ?? entry.kind} complete`, group: 'sails',
        objects: [entry.mesh, entry.vinyl].filter(Boolean), sourceBinding: `LASER2_SAIL_OPTICS_V17.sails[${entry.kind}]`, verified: true,
        description: 'Complete sail optical assembly.',
      }, false);
    }

    for (const [key, route] of Object.entries(context.legacy.ropeV16?.ropes ?? {}) as Array<[string, any]>) {
      if (!route?.mesh) continue;
      this.register({
        id: `rope.${key}`, name: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), group: 'ropes',
        objects: [route.mesh], sourceBinding: `LASER2_ROPE_HARDWARE_V16.ropes.${key}.mesh`, verified: true,
        description: 'Named V16 rope route retained behind the rope runtime boundary.',
      });
    }

    const hardwareRoot = context.legacy.scene.getObjectByName?.('laser2-v16-procedural-rope-hardware');
    for (const child of hardwareRoot?.children ?? []) {
      if (!child) continue;
      const suffix = String(child.name || `hardware-${child.id}`).replace(/^laser2-/, '').replace(/[^a-z0-9]+/gi, '.').replace(/^\.+|\.+$/g, '').toLowerCase();
      this.register({
        id: `hardware.${suffix}`, name: child.name || suffix, group: 'hardware', objects: [child],
        sourceBinding: `scene.getObjectByName(${JSON.stringify(child.name)})`, verified: !!child.name,
        description: 'Procedural block, cleat, fairlead, or mast hardware assembly.',
      });
    }

    // Crew bindings point to the exact extracted boat child roots. Named subparts
    // remain selectable as child entities without scene-wide name heuristics.
    for (const crewId of ['crew.helm', 'crew.forward']) {
      const crew = this.byId.get(crewId);
      if (!crew) continue;
      let subIndex = 0;
      for (const root of crew.objects) {
        root.traverse?.((object: any) => {
          if (!object?.isMesh || !object.name) return;
          subIndex++;
          const suffix = object.name.replace(/[^a-z0-9]+/gi, '.').replace(/^\.+|\.+$/g, '').toLowerCase();
          this.register({
            id: `${crewId}.${suffix}.${subIndex}`, name: `${crew.name}: ${object.name}`, group: 'crew', objects: [object],
            sourceBinding: `${crew.sourceBinding}.traverse(${JSON.stringify(object.name)})`, verified: true,
            description: 'Named articulated crew subcomponent.',
          });
        });
      }
    }

    const excluded = new Set([master.water?.meshNear, master.water?.meshFar, master.water?.skyMesh]);
    this.unassignedMeshes = [];
    context.legacy.scene.traverse((object: any) => {
      if (!object?.isMesh || excluded.has(object) || this.assignedMeshes.has(object) || object.userData?.foundryReplacedBy || object.userData?.foundryBatchGenerated) return;
      this.unassignedMeshes.push(object);
    });

    const allAssigned = [...this.assignedMeshes];
    this.register({
      id: 'overview.complete', name: 'Complete Laser 2', group: 'overview', objects: allAssigned,
      sourceBinding: 'BoatSceneSystem.assignedMeshes', verified: this.bindingErrors.length === 0,
      description: 'Complete semantically indexed boat, rig, sails, ropes, hardware, and crew.',
    }, false);

    this.entities.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
  }

  telemetry(): Record<string, unknown> {
    const groups: Record<string, number> = {};
    for (const entity of this.entities) groups[entity.group] = (groups[entity.group] ?? 0) + 1;
    return {
      schema: 'laser2-semantic-scene-v3-runtime',
      rootName: this.root?.name ?? null,
      nativeRootOwned: !!this.root,
      linkedCompatibilityRoots: this.ownedTopLevelRoots,
      nativeOwnedRoots: this.nativeOwnedRoots,
      entities: this.entities.length,
      assignedMeshes: this.assignedMeshes.size,
      unassignedMeshes: this.unassignedMeshes.length,
      bindingErrors: [...this.bindingErrors],
      groups,
      sourceGeometryBackend: '27 static hull/deck/fitting meshes are native versioned BufferGeometry assets; steering, crew, rig, sails, ropes, and hardware retain the compatibility transform/simulation backend',
    };
  }
}
