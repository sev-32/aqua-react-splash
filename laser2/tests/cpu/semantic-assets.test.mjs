import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('../..', import.meta.url).pathname);
const semanticPath = resolve(root, 'public/assets/boat/semantic-manifest.v2.json');
const hullPath = resolve(root, 'public/assets/boat/hull-static-v2.json');
const semanticBytes = await readFile(semanticPath);
const hullBytes = await readFile(hullPath);
const semantic = JSON.parse(semanticBytes.toString('utf8'));
const hull = JSON.parse(hullBytes.toString('utf8'));

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const finiteArray = (values) => Array.isArray(values) && values.every(Number.isFinite);
const unique = (values) => new Set(values).size === values.length;
const boat = semantic.bindings?.boatChildren ?? [];
const rig = semantic.bindings?.rigChildren ?? [];
const hullBindings = boat.filter(([, id]) => String(id).startsWith('hull.'));
const hullById = new Map(hull.meshes.map((mesh) => [mesh.id, mesh]));

let triangles = 0;
let vertices = 0;
const meshChecks = [];
for (const [expectedIndex, id] of hullBindings) {
  const mesh = hullById.get(id);
  const position = mesh?.attributes?.position;
  const index = mesh?.index;
  const vertexCount = position ? position.array.length / position.itemSize : 0;
  const triangleCount = index ? index.array.length / 3 : vertexCount / 3;
  vertices += vertexCount;
  triangles += triangleCount;
  meshChecks.push({
    id,
    found: !!mesh,
    sourceChildIndex: mesh?.sourceChildIndex ?? null,
    expectedIndex,
    sourceIndexMatched: mesh?.sourceChildIndex === expectedIndex,
    positionFinite: finiteArray(position?.array),
    normalFinite: mesh?.attributes?.normal ? finiteArray(mesh.attributes.normal.array) : true,
    uvFinite: mesh?.attributes?.uv ? finiteArray(mesh.attributes.uv.array) : true,
    indexFinite: index ? finiteArray(index.array) : true,
    transformFinite: finiteArray(mesh?.transform?.position) && finiteArray(mesh?.transform?.quaternion) && finiteArray(mesh?.transform?.scale),
    vertexCount,
    triangleCount,
  });
}

const checks = {
  semanticSchema: semantic.schema === 'laser2-semantic-scene-v2',
  hullSchema: hull.schema === 'laser2-native-static-hull-v2',
  completeBoatIndices: boat.map(([index]) => index).join(',') === Array.from({ length: 32 }, (_, index) => index).join(','),
  completeRigIndices: rig.map(([index]) => index).join(',') === Array.from({ length: 9 }, (_, index) => index).join(','),
  uniqueBoatIds: unique(boat.map(([, id]) => id)),
  uniqueRigIds: unique(rig.map(([, id]) => id)),
  noCrossManifestIdCollision: unique([...boat, ...rig].map(([, id]) => id)),
  hullBindingCount27: hullBindings.length === 27,
  hullAssetCount27: hull.meshes.length === 27,
  uniqueHullAssetIds: unique(hull.meshes.map((mesh) => mesh.id)),
  uniqueHullSourceIndices: unique(hull.meshes.map((mesh) => mesh.sourceChildIndex)),
  exactHullIdSet: hullBindings.every(([, id]) => hullById.has(id)) && hull.meshes.every((mesh) => hullBindings.some(([, id]) => id === mesh.id)),
  allHullMeshesFinite: meshChecks.every((mesh) => mesh.found && mesh.sourceIndexMatched && mesh.positionFinite && mesh.normalFinite && mesh.uvFinite && mesh.indexFinite && mesh.transformFinite),
  nonzeroTopology: vertices > 0 && triangles > 0,
};

const report = {
  project: 'LASER2_LIGHTING_FOUNDRY_V7_WORKER_LOCAL_PROBES_BATCHED_HULL',
  lane: 'Node CPU-only manifest and serialized BufferGeometry validation; no browser or GPU required',
  semanticManifest: { path: semanticPath, sha256: sha256(semanticBytes), boatBindings: boat.length, rigBindings: rig.length },
  hullAsset: { path: hullPath, sha256: sha256(hullBytes), meshes: hull.meshes.length, vertices, triangles, bytes: hullBytes.length },
  checks,
  allChecksPassed: Object.values(checks).every(Boolean),
  meshes: meshChecks,
};

const outDir = resolve(root, 'evidence/cpu');
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'semantic-assets.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ allChecksPassed: report.allChecksPassed, failed: Object.entries(checks).filter(([, value]) => !value).map(([key]) => key), hullAsset: report.hullAsset }, null, 2));
if (!report.allChecksPassed) process.exitCode = 1;
