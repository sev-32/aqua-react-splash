/**
 * V3: reconstruct an explicit water-air interface from *existing* MLS-MPM
 * particle positions and the temporally persistent connectivity graph.
 *
 * This is a render-only approximation: the MPM simulation remains authoritative.
 * Closed 3-cycles support real triangles; remaining bonds support narrow
 * surface ribbons. Crucially each connected particle's water volume is divided
 * across its incident primitives exactly ONCE. No graphical connector owns
 * additional water or duplicates the particle's mass.
 *
 * Vertex format: xyz (world), optical film thickness (m), aeration 0..1.
 */
import { FLAG_ALIVE, type MpmParticles } from './oceanMpm';
import type { SplashConnectivity } from './splashConnectivity';

export interface SplashMesh {
  vertices: Float32Array;
  /** Physics particles actually represented by this mesh; others remain
   * in the existing V2 splat path so we never hide unsupported water. */
  covered: Uint8Array;
  vertexCount: number;
  triangles: number;
  ribbons: number;
  connectedParticles: number;
  carrierVolume: number;
  allocatedVolume: number;
  maxOpticalThickness: number;
  maxRibbonWidth: number;
}
type Edge = { a: number; b: number; strength: number; length: number; faces: number };
type Face = { a: number; b: number; c: number; area: number };
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
function cross(a: number[], b: number[]) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function norm(v: number[]) {
  const m = Math.hypot(v[0], v[1], v[2]);
  return m > 1e-10 ? v.map(x=>x/m) : [0,1,0];
}
function delta(P: MpmParticles, a: number, b: number) {
  return [P.px[b]-P.px[a], P.py[b]-P.py[a], P.pz[b]-P.pz[a]];
}
function pos(P: MpmParticles, i: number) {
  return [P.px[i], P.py[i], P.pz[i]];
}

/** Lowest-variance covariance axis estimates the local sheet normal.
 * Dense 3D fluid clouds have no trustworthy thin-surface normal, and their
 * arbitrary graph 3-cycles MUST NOT become giant reflective triangles.
 */
function localSheetNormal(P:MpmParticles, center:number, neighbors:number[], radius:number):number[]|null {
  const A=[[0,0,0],[0,0,0],[0,0,0]];
  let count=0;
  for(const j of neighbors){
    const d=delta(P,center,j), len=Math.hypot(...d);
    if(len<1e-5 || len>radius)continue;
    count++;
    for(let x=0;x<3;x++)for(let y=0;y<3;y++)A[x][y]+=d[x]*d[y];
  }
  if(count<4)return null;
  const U=[[1,0,0],[0,1,0],[0,0,1]];
  for(let iter=0;iter<14;iter++){
    let p=0,q=1,best=Math.abs(A[0][1]);
    for(const [i,j] of [[0,2],[1,2]]){
      const v=Math.abs(A[i][j]);if(v>best){p=i;q=j;best=v;}
    }
    if(best<1e-12)break;
    const angle=0.5*Math.atan2(2*A[p][q],A[q][q]-A[p][p]);
    const c=Math.cos(angle),sn=Math.sin(angle);
    const app=A[p][p],aqq=A[q][q],apq=A[p][q];
    A[p][p]=c*c*app-2*c*sn*apq+sn*sn*aqq;
    A[q][q]=sn*sn*app+2*c*sn*apq+c*c*aqq;
    A[p][q]=A[q][p]=0;
    for(let k=0;k<3;k++)if(k!==p&&k!==q){
      const kp=A[k][p],kq=A[k][q];
      A[k][p]=A[p][k]=c*kp-sn*kq;
      A[k][q]=A[q][k]=sn*kp+c*kq;
    }
    for(let k=0;k<3;k++){
      const kp=U[k][p],kq=U[k][q];
      U[k][p]=c*kp-sn*kq;U[k][q]=sn*kp+c*kq;
    }
  }
  const idx=[0,1,2].sort((a,b)=>A[a][a]-A[b][b]);
  const flatness=A[idx[0]][idx[0]]/Math.max(A[idx[1]][idx[1]],1e-9);
  if(!(flatness>=0) || flatness>0.16 || A[idx[1]][idx[1]]<1e-6)return null;
  return norm([U[0][idx[0]],U[1][idx[0]],U[2][idx[0]]]);
}

export function reconstructSplashMesh(P: MpmParticles, graph: SplashConnectivity, maxFaces = 7000): SplashMesh {
  const count = P.count;
  const connected = new Uint8Array(count);
  const adjacency: number[][] = Array.from({length:count},()=>[]);
  const edges: Edge[] = [];
  const edgeOf = new Map<string,Edge>();
  const key = (a:number,b:number) => a<b ? a+':'+b : b+':'+a;
  for(const b of graph.bonds.values()) {
    const {a,c}= {a:b.a,c:b.b};
    if (a===c || a<0 || c<0 || a>=count || c>=count) continue;
    if (!(P.flags[a]&FLAG_ALIVE) || !(P.flags[c]&FLAG_ALIVE)) continue;
    const length = Math.hypot(...delta(P,a,c));
    if (!Number.isFinite(length) || length<1e-4 || !(b.strength>0.025)) continue;
    const k=key(a,c);
    if (edgeOf.has(k)) continue;
    const e:Edge={a,b:c,strength:b.strength,length,faces:0};
    edges.push(e);edgeOf.set(k,e);
    adjacency[a].push(c);adjacency[c].push(a);
    connected[a]=1;connected[c]=1;
  }
  const normals=adjacency.map((nb,i)=>localSheetNormal(P,i,nb,graph.p.form*1.25));
  const faces:Face[]=[];
  // A real 3-cycle is a surface *candidate*, not an arbitrary metaball.
  // Prefer local, short, nondegenerate patches; allow at most two faces per edge.
  for(let a=0;a<count&&faces.length<maxFaces;a++) {
    if(!connected[a]) continue;
    const nb=adjacency[a].filter(b=>b>a).sort((b,c)=>b-c);
    for(let i=0;i<nb.length&&faces.length<maxFaces;i++) for(let j=i+1;j<nb.length&&faces.length<maxFaces;j++){
      const b=nb[i],c=nb[j],ab=edgeOf.get(key(a,b)),ac=edgeOf.get(key(a,c)),bc=edgeOf.get(key(b,c));
      if(!ab||!ac||!bc || ab.faces>=2||ac.faces>=2||bc.faces>=2)continue;
      const d1=delta(P,a,b),d2=delta(P,a,c);
      const area=Math.hypot(...cross(d1,d2))*0.5;
      const maxLen=Math.max(ab.length,ac.length,bc.length);
      if (!(area>5e-5) || maxLen>graph.p.form*1.25)continue;
      // Do not turn a dense 3D ball of samples into arbitrary triangular
      // glass shards. Three-particle, low-degree cycles remain legitimate
      // local surface primitives; crowded nodes need PCA sheet evidence.
      const nrm=norm(cross(d1,d2));
      const dense=Math.max(adjacency[a].length,adjacency[b].length,adjacency[c].length)>3;
      if(dense){
        const local=[normals[a],normals[b],normals[c]].filter((n):n is number[]=>n!==null);
        if(local.length<2 || local.some(n=>Math.abs(n[0]*nrm[0]+n[1]*nrm[1]+n[2]*nrm[2])<0.8))continue;
      }
      if(area/(maxLen*maxLen)<0.12)continue;
      // A very small triangle owning a large particle volume is NOT a
      // thin sheet: it is an under-resolved volume, so leave it as spray.
      if((P.vol[a]+P.vol[b]+P.vol[c])/(3*area)>0.14)continue;
      faces.push({a,b,c,area});
      ab.faces++;ac.faces++;bc.faces++;
    }
  }
  const ribbons=edges.filter(e=>e.faces===0 &&
    e.length>=0.055 && e.length<=graph.p.form*1.45 &&
    (adjacency[e.a].length<=3 || adjacency[e.b].length<=3));
  const multiplicity=new Uint16Array(count);
  for(const t of faces){multiplicity[t.a]++;multiplicity[t.b]++;multiplicity[t.c]++;}
  for(const e of ribbons){multiplicity[e.a]++;multiplicity[e.b]++;}
  // Only the particles with an *accepted* interface primitive are meshed.
  // Rejected 3D triangles and truncated graph regions stay in the original
  // V2 fluid/mist pass. Never silently delete their physical water.
  const covered=new Uint8Array(count);
  let carrierVolume=0,connectedParticles=0;
  for(let i=0;i<count;i++)if(multiplicity[i]>0){
    covered[i]=1;connectedParticles++;carrierVolume+=P.vol[i];
  }
  const share=(i:number)=> multiplicity[i]>0?P.vol[i]/multiplicity[i]:0;
  const verts:number[]=[];
  let allocatedVolume=0,maxOpticalThickness=0,maxRibbonWidth=0;
  const add=(p:number[],thickness:number,aer:number)=>{
    verts.push(p[0],p[1],p[2],thickness,aer);
  };
  for(const t of faces){
    const volume=share(t.a)+share(t.b)+share(t.c);
    allocatedVolume+=volume;
    const thick=volume/t.area;
    maxOpticalThickness=Math.max(maxOpticalThickness,thick);
    const aer=0.015;
    add(pos(P,t.a),thick,aer);
    add(pos(P,t.b),thick,aer);
    add(pos(P,t.c),thick,aer);
  }
  for(const e of ribbons){
    const volume=share(e.a)+share(e.b);
    allocatedVolume+=volume;
    const t=norm(delta(P,e.a,e.b));
    const up=Math.abs(t[1])>.88?[1,0,0]:[0,1,0];
    const ortho=norm(cross(t,up));
    // Constrain projected strand width for large computational parcels; the
    // remaining volume changes optical thickness, not the silhouette size.
    const targetThickness=clamp(Math.cbrt(volume)/7,0.008,0.075);
    const width=clamp(volume/(e.length*targetThickness),0.008,0.045);
    const thickness=volume/(e.length*width);
    maxRibbonWidth=Math.max(maxRibbonWidth,width);
    maxOpticalThickness=Math.max(maxOpticalThickness,thickness);
    const a=pos(P,e.a),b=pos(P,e.b),half=width*0.5*clamp(e.strength,0.2,1);
    const shift=ortho.map(x=>x*half);
    const p0=a.map((x,i)=>x-shift[i]),p1=a.map((x,i)=>x+shift[i]);
    const p2=b.map((x,i)=>x-shift[i]),p3=b.map((x,i)=>x+shift[i]);
    const aer=0.03;
    // Two triangles, front and back visible (CULL_FACE disabled).
    add(p0,thickness,aer);add(p2,thickness,aer);add(p1,thickness,aer);
    add(p1,thickness,aer);add(p2,thickness,aer);add(p3,thickness,aer);
  }
  return {
    vertices:new Float32Array(verts),
    covered,
    vertexCount:verts.length/5,
    triangles:faces.length,
    ribbons:ribbons.length,
    connectedParticles,carrierVolume,allocatedVolume,
    maxOpticalThickness,maxRibbonWidth,
  };
}
