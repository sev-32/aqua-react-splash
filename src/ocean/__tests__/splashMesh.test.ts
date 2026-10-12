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

function integratedSurfaceVolume(vertices: Float32Array) {
  let total=0;
  // Every three vertices are one real non-overlapping raster triangle;
  // each stores the same physical thickness along its local surface.
  for(let i=0;i<vertices.length;i+=15){
    const d1=[vertices[i+5]-vertices[i],vertices[i+6]-vertices[i+1],vertices[i+7]-vertices[i+2]];
    const d2=[vertices[i+10]-vertices[i],vertices[i+11]-vertices[i+1],vertices[i+12]-vertices[i+2]];
    const cx=d1[1]*d2[2]-d1[2]*d2[1];
    const cy=d1[2]*d2[0]-d1[0]*d2[2];
    const cz=d1[0]*d2[1]-d1[1]*d2[0];
    total+=0.5*Math.hypot(cx,cy,cz)*vertices[i+3];
  }
  return total;
}
describe('topology-based water-air interface reconstruction',()=>{
  it('reconstructs one valid triangular film with exactly partitioned particle volume',()=>{
    const {P,g}=fixture([[0,0,0],[0.3,0,0],[0.15,0.25,0]],[[0,1],[0,2],[1,2]]);
    const m=reconstructSplashMesh(P,g);
    expect(m.triangles).toBe(1);expect(m.ribbons).toBe(0);
    expect(m.vertexCount).toBe(3);
    expect(m.connectedParticles).toBe(3);
    expect(m.allocatedVolume).toBeCloseTo(m.carrierVolume,12);
    // Not only bookkeeping: reconstructed actual face area × optical thickness.
    expect(integratedSurfaceVolume(m.vertices)).toBeCloseTo(m.carrierVolume,6);
    for(let i=0;i<m.vertices.length;i++) expect(Number.isFinite(m.vertices[i])).toBe(true);
  });
  it('creates real strand ribbons for noncyclic bonds, with no extra water',()=>{
    const {P,g}=fixture([[0,0,0],[0,0.4,0],[0,0.8,0]],[[0,1],[1,2]]);
    const m=reconstructSplashMesh(P,g);
    expect(m.triangles).toBe(0);expect(m.ribbons).toBe(2);
    expect(m.vertexCount).toBe(12);
    expect(m.allocatedVolume).toBeCloseTo(m.carrierVolume,12);
    // Not only bookkeeping: reconstructed actual face area × optical thickness.
    expect(integratedSurfaceVolume(m.vertices)).toBeCloseTo(m.carrierVolume,6);
    expect(m.maxRibbonWidth).toBeGreaterThan(0);
    expect(m.maxRibbonWidth).toBeLessThanOrEqual(0.18);
  });
  it('does not duplicate shared particle water over incident primitives',()=>{
    const {P,g}=fixture([[0,0,0],[0.2,0,0],[0.15,0.22,0],[0.5,0.22,0]],[[0,1],[0,2],[1,2],[2,3]]);
    const m=reconstructSplashMesh(P,g);
    expect(m.triangles).toBe(1);expect(m.ribbons).toBe(1);
    expect(m.allocatedVolume).toBeCloseTo(m.carrierVolume,12);
    // Not only bookkeeping: reconstructed actual face area × optical thickness.
    expect(integratedSurfaceVolume(m.vertices)).toBeCloseTo(m.carrierVolume,6);
  });
  it('omits disconnected and retired particles from the physical interface',()=>{
    const {P,g}=fixture([[0,0,0],[0.2,0,0],[4,4,4]],[[0,1]]);
    P.flags[1]=0;
    const m=reconstructSplashMesh(P,g);
    expect(m.connectedParticles).toBe(0);
    expect(m.vertexCount).toBe(0);
    expect(m.allocatedVolume).toBe(0);
  });
  it('does not turn a dense nonplanar 3D particle cloud into arbitrary reflective faces',()=>{
    // Four tetrahedral corners and one center are fully connected, but do
    // not define an oriented, thin 2D water-air interface.
    const points=[[0,0,0],[0.26,0,0],[0.13,0.22,0],
      [0.13,0.07,0.22],[0.13,0.07,0.075]];
    const bonds: [number,number][]=[];
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)bonds.push([i,j]);
    const {P,g}=fixture(points,bonds);
    const m=reconstructSplashMesh(P,g);
    expect(m.triangles).toBe(0);
    expect(m.ribbons).toBe(0);
    expect(m.covered.every(v=>v===0)).toBe(true);
    expect(m.carrierVolume).toBe(0);
    expect(m.allocatedVolume).toBe(0);
  });
  it('avoids degenerate zero-area water sheets',()=>{
    const {P,g}=fixture([[0,0,0],[0.1,0,0],[0.2,0,0]],[[0,1],[0,2],[1,2]]);
    const m=reconstructSplashMesh(P,g);
    expect(m.triangles).toBe(0);
    expect(m.ribbons).toBe(3);
    expect(m.allocatedVolume).toBeCloseTo(m.carrierVolume,12);
    // Not only bookkeeping: reconstructed actual face area × optical thickness.
    expect(integratedSurfaceVolume(m.vertices)).toBeCloseTo(m.carrierVolume,6);
  });
});