// Exposes the three.js r160 classes that are compiled into the quarantined
// legacy bundle as window.LASER2_THREE_R160, so native Foundry systems create
// objects from the exact same three.js instance the renderer uses (no second
// copy, no constructor borrowing from arbitrary scene objects).
//
// The bundle is minified, so identifiers are recovered from each class
// constructor: the first `isXxx=!0` flag or `this.type="Xxx"` written after
// `super(...)` (or at the start of a base class constructor). Typed buffer
// attributes are recognised by the typed array they allocate.
//
// Idempotent: re-running on an already patched bundle rewrites the export.
// usage: node tools/expose_legacy_three.mjs [bundlePath] [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const bundlePath = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : `${root}/public/vendor/legacy/three-legacy.bundle.js`;
const checkOnly = process.argv.includes('--check');
const MARKER_START = ';/*LASER2_THREE_R160_EXPORT_START*/';
const MARKER_END = '/*LASER2_THREE_R160_EXPORT_END*/';
const ANCHOR = 'window.LASER2_CREW_RIGGING_MASTER_V2=d0,window.LASER2_CREW_RIGGING_MASTER_V1=d0';

let source = readFileSync(bundlePath, 'utf8');
const existing = source.indexOf(MARKER_START);
if (existing >= 0) {
  const end = source.indexOf(MARKER_END, existing);
  source = source.slice(0, existing) + source.slice(end + MARKER_END.length);
}
const anchorAt = source.indexOf(ANCHOR);
if (anchorAt < 0) throw new Error('export anchor not found in legacy bundle');

const classRe = /([A-Za-z_$][\w$]*)=class(?: [A-Za-z_$][\w$]*)?(?: extends ([A-Za-z_$][\w$]*))?\{constructor\(/g;
const byName = new Map();
const typedAttr = { Float32Array: 'Float32BufferAttribute', Uint16Array: 'Uint16BufferAttribute', Uint32Array: 'Uint32BufferAttribute', Int32Array: 'Int32BufferAttribute', Uint8Array: 'Uint8BufferAttribute' };
let match;
while ((match = classRe.exec(source))) {
  const id = match[1];
  const parent = match[2] ?? null;
  const body = source.slice(match.index, match.index + 700);
  let name = null;
  const typed = /^[^{]*\{constructor\([^)]*\)\{super\(new (\w+Array)\(/.exec(body);
  if (parent && typed && typedAttr[typed[1]]) name = typedAttr[typed[1]];
  if (!name) {
    const superAt = parent ? body.indexOf('super(') : body.indexOf('{constructor(');
    if (superAt < 0) continue;
    // Constructor body stops at the next class definition marker.
    let scope = body.slice(superAt);
    const nextClass = scope.search(/=class[ {]/);
    if (nextClass > 0) scope = scope.slice(0, nextClass);
    const flag = /(?:this|[\w$]+\.prototype)\.is([A-Z]\w*)=!0/.exec(scope);
    const type = /this\.type="(\w+)"/.exec(scope);
    name = flag?.[1] ?? type?.[1] ?? null;
    // Geometries only carry a type string; prefer it when the flag is the base one.
    if (flag && type && flag[1] === 'BufferGeometry' && type[1] !== 'BufferGeometry') name = type[1];
    if (flag && type && flag[1] === 'Material' && type[1]) name = type[1];
  }
  if (!name) continue;
  if (!byName.has(name)) byName.set(name, { id, parent });
}

const REQUIRED = ['Vector2', 'Vector3', 'Vector4', 'Quaternion', 'Matrix3', 'Matrix4', 'Color', 'Euler', 'Box3', 'Sphere', 'Plane',
  'Object3D', 'Group', 'Mesh', 'Scene', 'Camera', 'PerspectiveCamera', 'OrthographicCamera', 'BufferGeometry', 'BufferAttribute',
  'Float32BufferAttribute', 'Uint16BufferAttribute', 'Uint32BufferAttribute', 'ShaderMaterial', 'MeshStandardMaterial', 'MeshPhysicalMaterial',
  'MeshBasicMaterial', 'Texture', 'DataTexture', 'CanvasTexture', 'DepthTexture', 'WebGLRenderTarget', 'PlaneGeometry', 'SphereGeometry',
  'CylinderGeometry', 'BoxGeometry', 'SkinnedMesh', 'Bone', 'DirectionalLight', 'Material'];
const OPTIONAL = ['TorusGeometry', 'RingGeometry', 'ExtrudeGeometry', 'TubeGeometry', 'Shape', 'CatmullRomCurve3', 'HemisphereLight', 'DataArrayTexture', 'Data3DTexture', 'CubeTexture', 'WebGLCubeRenderTarget', 'MeshDepthMaterial', 'MeshDistanceMaterial', 'Int32BufferAttribute', 'Uint8BufferAttribute', 'Light', 'Source', 'RenderTarget'];
const missing = REQUIRED.filter((name) => !byName.has(name));
if (missing.length) throw new Error(`legacy bundle is missing required three.js classes: ${missing.join(', ')}`);
const entries = [...REQUIRED, ...OPTIONAL].filter((name) => byName.has(name)).map((name) => `${name}:${byName.get(name).id}`);
const exportCode = `${MARKER_START}window.LASER2_THREE_R160=Object.freeze({REVISION:"160",${entries.join(',')}});${MARKER_END}`;
const insertAt = anchorAt + ANCHOR.length;
const patched = source.slice(0, insertAt) + exportCode + source.slice(insertAt);
const report = { bundle: bundlePath, exported: entries.length, classes: Object.fromEntries([...REQUIRED, ...OPTIONAL].filter((n) => byName.has(n)).map((n) => [n, byName.get(n).id])) };
if (!checkOnly) writeFileSync(bundlePath, patched);
console.log(JSON.stringify(report, null, 1));
