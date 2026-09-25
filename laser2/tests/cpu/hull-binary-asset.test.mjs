import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('/mnt/data/LASER2_LIGHTING_FOUNDRY_V7');
const manifestPath = resolve(root, 'public/assets/boat/hull-static-v3.manifest.json');
const binaryPath = resolve(root, 'public/assets/boat/hull-static-v3.bin');
const sourcePath = resolve(root, 'public/assets/boat/hull-static-v2.json');
const manifestBytes = await readFile(manifestPath);
const binary = await readFile(binaryPath);
const sourceBytes = await readFile(sourcePath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const source = JSON.parse(sourceBytes.toString('utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const bytesPerElement = { Float32Array: 4, Uint16Array: 2, Uint32Array: 4, Int16Array: 2, Uint8Array: 1 };
const sourceById = new Map(source.meshes.map((mesh) => [mesh.id, mesh]));
let vertices = 0;
let triangles = 0;
const meshChecks = [];
for (const mesh of manifest.meshes) {
  const original = sourceById.get(mesh.id);
  const attributes = Object.values(mesh.attributes);
  const descriptorsValid = attributes.every((attribute) => {
    const bpe = bytesPerElement[attribute.arrayType];
    return bpe && attribute.byteOffset % bpe === 0 && attribute.byteLength === attribute.elementCount * bpe && attribute.byteOffset + attribute.byteLength <= binary.length;
  });
  const indexValid = !mesh.index || (() => {
    const bpe = bytesPerElement[mesh.index.arrayType];
    return bpe && mesh.index.byteOffset % bpe === 0 && mesh.index.byteLength === mesh.index.elementCount * bpe && mesh.index.byteOffset + mesh.index.byteLength <= binary.length;
  })();
  const position = mesh.attributes.position;
  const vertexCount = position.elementCount / position.itemSize;
  const triangleCount = mesh.index ? mesh.index.elementCount / 3 : vertexCount / 3;
  vertices += vertexCount;
  triangles += triangleCount;
  meshChecks.push({
    id: mesh.id,
    sourceFound: !!original,
    sourceIndexMatches: original?.sourceChildIndex === mesh.sourceChildIndex,
    descriptorsValid,
    indexValid,
    vertexCount,
    triangleCount,
    sourceVertexCount: original?.attributes?.position?.array?.length / original?.attributes?.position?.itemSize,
    sourceTriangleCount: original?.index ? original.index.array.length / 3 : original?.attributes?.position?.array?.length / original?.attributes?.position?.itemSize / 3,
  });
}
const combinedBytes = manifestBytes.length + binary.length;
const checks = {
  schema: manifest.schema === 'laser2-native-static-hull-binary-v3',
  littleEndian: manifest.binary.endianness === 'little',
  binaryLength: manifest.binary.bytes === binary.length,
  binaryHash: manifest.binary.sha256 === sha256(binary),
  sourceHash: manifest.sourceJsonSha256 === sha256(sourceBytes),
  meshCount: manifest.meshes.length === 27,
  descriptorsValid: meshChecks.every((mesh) => mesh.sourceFound && mesh.sourceIndexMatches && mesh.descriptorsValid && mesh.indexValid),
  exactTopology: meshChecks.every((mesh) => mesh.vertexCount === mesh.sourceVertexCount && mesh.triangleCount === mesh.sourceTriangleCount),
  expectedTotals: vertices === 5571 && triangles === 9256,
  transferReduction: combinedBytes / sourceBytes.length < 0.35,
};
const report = {
  project: 'LASER2_LIGHTING_FOUNDRY_V7_WORKER_LOCAL_PROBES_BATCHED_HULL',
  lane: 'Node CPU-only binary hull asset range/hash/topology validation',
  manifestPath,
  binaryPath,
  sourcePath,
  bytes: { sourceJson: sourceBytes.length, manifest: manifestBytes.length, binary: binary.length, combined: combinedBytes, reductionRatio: combinedBytes / sourceBytes.length },
  topology: { meshes: manifest.meshes.length, vertices, triangles },
  checks,
  allChecksPassed: Object.values(checks).every(Boolean),
  meshes: meshChecks,
};
const outDir = resolve(root, 'evidence/cpu');
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'hull-binary-asset.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ allChecksPassed: report.allChecksPassed, failed: Object.entries(checks).filter(([, value]) => !value).map(([key]) => key), bytes: report.bytes, topology: report.topology }, null, 2));
if (!report.allChecksPassed) process.exitCode = 1;
