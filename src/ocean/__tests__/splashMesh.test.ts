import { describe, expect, it } from 'vitest';
import { FLAG_ALIVE, MpmParticles } from '../sim/oceanMpm';
import { SplashConnectivity } from '../sim/splashConnectivity';
import { reconstructSplashMesh } from '../sim/splashMesh';

function fixture(points: number[][], bonds: [number,number][]) {
  const P=new MpmParticles(Math.max(points.length,2));
  P.count=points.length;
  for(let i=0;i<points.length;i++){
    P.px[i]=points[i][0];P.py[i]=points[i][1];P.pz[i]=points[i][2];
    P.vol[i]=0.001+i*0.0002;P.flags[i]=FLAG_ALIVE;
  }
  const g=new SplashConnectivity({form:0.4,break:0.85,memory:0.5,samples:2,thinPower:1.3,maxBonds:100});
  for(const [a,b] of bonds){
    const len=Math.hypot(P.px[a]-P.px[b],P.py[a]-P.py[b],P.pz[a]-P.pz[b]);
    g.bonds.set(a*100+b,{a,b,strength:0.9,distance:len,age:0.1});
  }
  return {P,g};
}

describe('topology-based water-air interface reconstruction',()=>{
  it('reconstructs one valid triangular film with exactly partitioned particle volume',()=>{
    const {P,g}=fixture([[0,0,0],[0.3,0,0],[0.15,0.25,0]],[[0,1],[0,2],[1,2]]);
    const m=reconstructSplashMesh(P,g);
    expect(m.triangles).toBe(1);expect(m.ribbons).toBe(0);
    expect(m.vertexCount).toBe(3);
    expect(m.connectedParticles).toBe(3);
    expect(m.allocatedVolume).toBeCloseTo(m.carrierVolume,12);
    for(let i=0;i<m.vertices.length;i++) expect(Number.isFinite(m.vertices[i])).toBe(true);
  });
  it('creates real strand ribbons for noncyclic bonds, with no extra water',()=>{
    const {P,g}=fixture([[0,0,0],[0,0.4,0],[0,0.8,0]],[[0,1],[1,2]]);
    const m=reconstructSplashMesh(P,g);
    expect(m.triangles).toBe(0);expect(m.ribbons).toBe(2);
    expect(m.vertexCount).toBe(12);
    expect(m.allocatedVolume).toBeCloseTo(m.carrierVolume,12);
    expect(m.maxRibbonWidth).toBeGreaterThan(0);
    expect(m.maxRibbonWidth).toBeLessThanOrEqual(0.18);
  });
  it('does not duplicate shared particle water over incident primitives',()=>{
    const {P,g}=fixture([[0,0,0],[0.2,0,0],[0.15,0.22,0],[0.5,0.22,0]],[[0,1],[0,2],[1,2],[2,3]]);
    const m=reconstructSplashMesh(P,g);
    expect(m.triangles).toBe(1);expect(m.ribbons).toBe(1);
    expect(m.allocatedVolume).toBeCloseTo(m.carrierVolume,12);
  });
  it('omits disconnected and retired particles from the physical interface',()=>{
    const {P,g}=fixture([[0,0,0],[0.2,0,0],[4,4,4]],[[0,1]]);
    P.flags[1]=0;
    const m=reconstructSplashMesh(P,g);
    expect(m.connectedParticles).toBe(0);
    expect(m.vertexCount).toBe(0);
    expect(m.allocatedVolume).toBe(0);
  });
  it('avoids degenerate zero-area water sheets',()=>{
    const {P,g}=fixture([[0,0,0],[0.1,0,0],[0.2,0,0]],[[0,1],[0,2],[1,2]]);
    const m=reconstructSplashMesh(P,g);
    expect(m.triangles).toBe(0);
    expect(m.ribbons).toBe(3);
    expect(m.allocatedVolume).toBeCloseTo(m.carrierVolume,12);
  });
});