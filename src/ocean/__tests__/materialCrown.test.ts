import { describe, it, expect } from 'vitest';
import { MaterialCrownHistory } from '../sim/materialCrown';
import { MpmParticles, FLAG_ALIVE } from '../sim/oceanMpm';

function setup(n=16, dz=0.22, vol=0.00015){
  const P=new MpmParticles(n*3);
  P.count=n*2;
  const h=new MaterialCrownHistory();
  for(let epoch=0;epoch<2;epoch++){
    h.start(17,epoch*0.08);
    for(let k=0;k<n;k++){
      const i=epoch*n+k,a=k*2*Math.PI/n;
      P.px[i]=0.5*Math.cos(a);
      P.py[i]=epoch*dz;
      P.pz[i]=0.5*Math.sin(a);
      P.vol[i]=vol;
      P.flags[i]=FLAG_ALIVE;
      P.seed[i]=0.11+i*0.00001;
      h.record(i,P.seed[i],a,vol);
    }
    h.end();
  }
  return {P,h};
}
describe('V4 material coordinate sheet emitted with water',()=>{
  it('constructs a cylindrical continuous curtain from two original material epochs',()=>{
    const {P,h}=setup();
    const mesh=h.build(P);
    expect(h.recordedRings).toBe(2);
    expect(mesh.triangles).toBeGreaterThan(0);
    expect(mesh.connectedParticles).toBe(32);
    expect(mesh.allocatedVolume).toBeCloseTo(mesh.carrierVolume,10);
    expect(mesh.maxOpticalThickness).toBeLessThan(0.27);
    expect(mesh.vertices.every(Number.isFinite)).toBe(true);
  });
  it('follows advected MPM material indices without recomputing bonds',()=>{
    const {P,h}=setup();
    const old=h.build(P);
    for(let i=0;i<P.count;i++) P.py[i]+=0.17;
    const moved=h.build(P);
    expect(moved.vertexCount).toBe(old.vertexCount);
    expect(moved.vertices[1]).toBeCloseTo(old.vertices[1]+0.17,5);
    expect(moved.allocatedVolume).toBeCloseTo(old.allocatedVolume,10);
  });
  it('drops only retired/overwritten birth identities, not physically live unrelated water',()=>{
    const {P,h}=setup();
    const before=h.build(P);
    P.seed[0]+=0.004; // recycled particle slot, same index but different water
    const after=h.build(P);
    expect(after.triangles).toBeLessThan(before.triangles);
    expect(after.covered[0]).toBe(0);
    expect(P.flags[0]).toBe(FLAG_ALIVE);
  });
  it('refuses false sheet panels between unrelated source bodies',()=>{
    const {P,h}=setup(16);
    h.clear();
    for(let epoch=0;epoch<2;epoch++){
      h.start(epoch+1,epoch*0.08);
      for(let k=0;k<16;k++){const i=epoch*16+k;h.record(i,P.seed[i],k*2*Math.PI/16,P.vol[i]);}
      h.end();
    }
    expect(h.build(P).vertexCount).toBe(0);
  });
  it('refuses unsupported huge gaps between emission epochs',()=>{
    const {P,h}=setup(16);h.clear();
    for(let epoch=0;epoch<2;epoch++){
      h.start(17,epoch*0.7);
      for(let k=0;k<16;k++){const i=epoch*16+k;h.record(i,P.seed[i],k*2*Math.PI/16,P.vol[i]);}
      h.end();
    }
    expect(h.build(P).vertexCount).toBe(0);
  });
});
