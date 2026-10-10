/**
 * V4 — material-history splash surface.
 *
 * Each crown release records the actual MPM particle identity, birth azimuth
 * and emission epoch. The records are immutable birth coordinates, NOT a
 * per-frame nearest-neighbour guess. The dynamic vertices are always read
 * from the live, advected MLS-MPM particle positions.
 *
 * This affects rendering only. It neither creates nor modifies physical
 * particles, water volumes, impulses or trajectories.
 */
import { FLAG_ALIVE, type MpmParticles } from './oceanMpm';
import type { SplashMesh } from './splashMesh';

export interface MaterialNode { id:number; seed:number; theta:number; bornVolume:number }
interface Ring { source:number; time:number; nodes:MaterialNode[] }
interface Face { a:number;b:number;c:number;area:number }
const TAU=Math.PI*2;
const positive=(x:number)=>((x%TAU)+TAU)%TAU;
const pos=(p:MpmParticles,i:number)=>[p.px[i],p.py[i],p.pz[i]];
function edge(p:MpmParticles,a:number,b:number){return [p.px[b]-p.px[a],p.py[b]-p.py[a],p.pz[b]-p.pz[a]];}
function area(p:MpmParticles,a:number,b:number,c:number) {
 const u=edge(p,a,b),v=edge(p,a,c);
 return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])*0.5;
}
export class MaterialCrownHistory {
 private rings:Ring[]=[];
 private open:Ring|null=null;
 private emissionSerial=0;
 /** O(1) capped retention; all entries older than 2.5s can be retired.
  * A saved particle index is valid ONLY while its birth seed still matches. */
 start(source:number,time:number) {
   if(this.open)this.end();
   this.open={source,time,nodes:[]};
   this.emissionSerial++;
 }
 record(index:number,seed:number,theta:number,volume:number){
   this.open?.nodes.push({id:index,seed,theta:positive(theta),bornVolume:volume});
 }
 end(){
   if(this.open && this.open.nodes.length>=4){
     this.open.nodes.sort((a,b)=>a.theta-b.theta);
     this.rings.push(this.open);
   }
   this.open=null;
   if(this.rings.length>90)this.rings.splice(0,this.rings.length-90);
 }
 clear(){this.rings=[];this.open=null;this.emissionSerial=0;}
 get recordedRings(){return this.rings.length;}
 get recordedEmissions(){return this.emissionSerial;}
 build(P:MpmParticles, maxFaces=8000):SplashMesh {
   const valid=(node:MaterialNode)=>node.id>=0 && node.id<P.count &&
       !!(P.flags[node.id]&FLAG_ALIVE) && P.seed[node.id]===node.seed &&
       P.vol[node.id]>0;
   const faces:Face[]=[];
   let prev:Ring|null=null;
   const ordered=[...this.rings].sort((a,b)=>a.time-b.time);
   // Each material strip is constrained to ONE source and two neighboring
   // emission epochs; a later unrelated packet can never close a fake panel.
   for(const ring of ordered){
     if(!prev){prev=ring;continue;}
     if(ring.source!==prev.source || ring.time-prev.time>0.24 || ring.time-prev.time<1e-6){
       prev=ring;continue;
     }
     const A=prev.nodes.filter(valid),B=ring.nodes.filter(valid);
     if(A.length<5||B.length<5){prev=ring;continue;}
     const count=Math.max(6,Math.min(72,Math.min(A.length,B.length)));
     for(let k=0;k<count && faces.length<maxFaces;k++){
       const a0=A[Math.floor(k*A.length/count)].id,
             a1=A[Math.floor(((k+1)%count)*A.length/count)].id,
             b0=B[Math.floor(k*B.length/count)].id,
             b1=B[Math.floor(((k+1)%count)*B.length/count)].id;
       const add=(a:number,b:number,c:number)=>{
         if(a===b||a===c||b===c)return;
         const ab=Math.hypot(...edge(P,a,b)),ac=Math.hypot(...edge(P,a,c)),
               bc=Math.hypot(...edge(P,b,c));
         const max=Math.max(ab,ac,bc);
         if(max>0.9 || max<0.025)return;
         const ar=area(P,a,b,c);
         if(!(ar>0.0025) || ar/(max*max)<0.035)return;
         faces.push({a,b,c,area:ar});
       };
       add(a0,b0,a1);
       add(a1,b0,b1);
     }
     prev=ring;
     if(faces.length>=maxFaces)break;
   }
   // The computed film volume is a partition of the existing MPM parcels,
   // not duplicated by the number of incident triangles.
   const computeDegree=(arr:Face[])=>{
     const degree=new Uint16Array(P.capacity);
     for(const f of arr){degree[f.a]++;degree[f.b]++;degree[f.c]++;}
     return degree;
   };
   let degree=computeDegree(faces);
   // The underlying material surface is real only where film thickness is
   // compatible with the measured area. Unresolved bulk stays as particles.
   let accepted=faces.filter(f=>{
     const v=P.vol[f.a]/degree[f.a]+P.vol[f.b]/degree[f.b]+P.vol[f.c]/degree[f.c];
     const t=v/f.area;
     return t>0 && t<0.27 && Number.isFinite(t);
   });
   degree=computeDegree(accepted);
   const covered=new Uint8Array(P.capacity);
   const vertices:number[]=[];
   let allocatedVolume=0,maxOpticalThickness=0,carrierVolume=0,connectedParticles=0;
   for(const f of accepted){
     const volume=P.vol[f.a]/degree[f.a]+P.vol[f.b]/degree[f.b]+P.vol[f.c]/degree[f.c];
     const thickness=volume/f.area;
     if(!Number.isFinite(thickness) || thickness<=0)continue;
     allocatedVolume+=volume;
     maxOpticalThickness=Math.max(maxOpticalThickness,thickness);
     for(const id of [f.a,f.b,f.c]){
       covered[id]=1;
       const p=pos(P,id);
       vertices.push(p[0],p[1],p[2],thickness,0.018);
     }
   }
   for(let i=0;i<P.count;i++)if(covered[i]){
     connectedParticles++;carrierVolume+=P.vol[i];
   }
   return {
     vertices:new Float32Array(vertices),covered,
     vertexCount:vertices.length/5,triangles:vertices.length/15,ribbons:0,
     connectedParticles,carrierVolume,allocatedVolume,maxOpticalThickness,maxRibbonWidth:0,
   };
 }
}
