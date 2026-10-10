#!/usr/bin/env node
/**
 * THALASSA champion integrity gate.
 *
 * This is a source/provenance and semantic-contract audit, not a visual or
 * physical proof. It fails on silent changes to protected historical donors,
 * absent current source paths, corrupt registry data, and a structural
 * regression in already-demonstrated physical caustics.
 * It records known baseline defects without pretending they passed.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = p => resolve(root, p);
const read = p => readFileSync(file(p));
const source = p => read(p).toString('utf8');
const exists = p => existsSync(file(p));
const registry = JSON.parse(source('docs/consolidation/CHAMPION_REGISTRY.json'));
const ontology = JSON.parse(source('docs/consolidation/WATER_SEMANTIC_CONTRACTS.json'));
const errors = [], warnings = [], provenance = [], observations = [];

if (registry.schema !== 'thalassa-champion-registry-v1') errors.push('unknown champion registry schema');
if (ontology.schema !== 'thalassa-water-semantic-contracts-v1') errors.push('unknown ontology schema');
const permitted = p => /^(src|docs|scripts)\//.test(p) && !p.split('/').includes('..');
for (const entry of registry.protected_legacy_files) {
  if (!permitted(entry.path)) { errors.push('unsafe donor path: '+entry.path); continue; }
  if (!exists(entry.path)) { errors.push('missing original source: '+entry.path); continue; }
  const bytes = read(entry.path);
  const blob = createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  const matching = blob === entry.git_blob_sha1;
  provenance.push({path:entry.path,bytes:bytes.length,blob,matching});
  if (!matching) errors.push('protected original changed without a new champion decision: '+entry.path);
}
for (const c of registry.capabilities) {
  if (!exists(c.current)) errors.push('referenced current code missing: '+c.id+' -> '+c.current);
  if (!c.donor || !c.champion || !c.acceptance || !c.status) errors.push('incomplete legacy capability: '+c.id);
}
const nodes = ontology.phenomena ?? [];
const byId = new Map();
for (const n of nodes) {
  if (!n.id || byId.has(n.id)) errors.push('duplicate/missing phenomenon ID: '+n.id);
  byId.set(n.id,n);
  for (const k of ['meaning','mechanism','visual_signature','failure_mode','champion','implementation','acceptance','status'])
    if (!n[k] || (Array.isArray(n[k]) && n[k].length === 0)) errors.push('missing semantic field '+n.id+'.'+k);
  if (!['baseline-present','proven-donor-unmounted','known-defect','experimental','unverified'].includes(n.status))
    errors.push('unsupported status '+n.id+': '+n.status);
  for (const p of n.implementation ?? []) {
    if (!permitted(p) || !exists(p)) errors.push('semantic implementation missing: '+n.id+' -> '+p);
  }
  if (n.status === 'baseline-present' && n.champion?.source_available === false)
    errors.push('claims present champion but source unavailable: '+n.id);
}
for (const relation of ontology.causal_relations ?? [])
  if (!byId.has(relation.from) || !byId.has(relation.to) || !relation.reason)
    errors.push('invalid causal relationship: '+JSON.stringify(relation));
if (nodes.length < 10 || (ontology.causal_relations ?? []).length < 10)
  errors.push('semantic ontology incomplete (need >=10 phenomena and causal relationships)');

// Two REAL source-structure checks. These are tripwires, not mathematical validation.
const terrain = source('src/ocean/render/terrainRender.ts');
const waterShader = source('src/ocean/render/oceanShaders.ts');
const physicalCaustics = /float\s+caustics\s*\(/.test(terrain) &&
 /Hessian|hessian|determinant|det\s*\(/i.test(terrain) &&
 /depth/.test(terrain) && /caustics\(/.test(terrain);
observations.push({id:'terrain_caustics_mechanism',status:physicalCaustics?'source-preserved':'missing',evidence:'terrainRender.ts: local surface-curvature/depth caustic method'});
if (!physicalCaustics) errors.push('terrain surface-derived caustic source mechanism missing/replaced');

const wetness = source('src/ocean/render/bodiesRender.ts');
const centerSample = /uWaterline/.test(wetness) && /waterAt\(b\.pos\[0\],\s*b\.pos\[2\]\)/.test(wetness);
observations.push({id:'body_wetness_single_waterline',status:centerSample?'KNOWN DEFECT: object-center scalar waterline':'source changed: needs new semantic audit'});
if (centerSample) warnings.push('CURRENT DEBT: wetness is a single waterline per body, not per-point heightfield sample or material film');

const renderOrder = source('src/ocean/engine/OceanEngine.ts');
const waterIdx = renderOrder.indexOf('this.surface.draw(this.ocean, frame)');
const splashIdx = renderOrder.indexOf('m.drawTransparent?.(this)');
const waterBeforeSplash = waterIdx >= 0 && splashIdx > waterIdx;
observations.push({id:'splash_water_mutual_visibility',status:waterBeforeSplash?'KNOWN DEBT: splash composited after main water draw':'needs manual verification of reciprocal visibility'});
if (waterBeforeSplash) warnings.push('CURRENT DEBT: reciprocal ocean reflection of splash requires an explicit optical visibility pass');

const semanticOptics = /fresnel/i.test(waterShader) && /refract/i.test(waterShader) && /reflect/i.test(waterShader);
observations.push({id:'ocean_optical_terms',status:semanticOptics?'present in shader source; not proof of physically correct optics':'missing'});
if (!semanticOptics) errors.push('ocean Fresnel/refraction/reflection shader terms missing');

const result = {
 schema:'thalassa-champion-audit-receipt-v1',timestamp:new Date().toISOString(),
 pass:errors.length===0,protected_sources:provenance,phenomena:nodes.length,
 causal_relations:ontology.causal_relations?.length??0,
 observations,unresolved_donors:registry.capabilities
  .filter(x=>x.status.includes('not present')).map(x=>({id:x.id,champion:x.champion,donor:x.donor})),
 errors,warnings
};
const dest=file('captures/champion-audit');
mkdirSync(dest,{recursive:true});
writeFileSync(resolve(dest,'receipt.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify({pass:result.pass,phenomena:result.phenomena,
 relations:result.causal_relations,errors,warnings,observations},null,2)+'\n');
if(errors.length)process.exitCode=1;
