(()=>{
  "use strict";
  const VERSION="LASER2_REACTIVE_CUTCELL_HEIGHTFIELD_V15_20260713";
  const master=window.LASER2_CREW_RIGGING_MASTER_V2;
  const water=window.LASER2_WATER_INTERNAL;
  const ocean=window.LASER2_OCEAN_V4;
  const oldHF=window.LASER2_HEIGHTFIELD_V5;
  if(!master?.body||!master?.physics||!master?.renderer||!master?.config||!water||!ocean||!oldHF){
    console.error(VERSION+": required V12 runtime unavailable");return;
  }

  // Supersede the rejected V12 field without disturbing the boat, rig, crew, or sailing runtime.
  oldHF.params.enabled=false;
  if(oldHF.localMesh){oldHF.localMesh.visible=false;try{oldHF.localMesh.parent?.remove(oldHF.localMesh);}catch(_){}}
  if(water.matNear?.uniforms?.uLocalCutoutEnabled)water.matNear.uniforms.uLocalCutoutEnabled.value=0;

  const body=master.body,cfg=master.config;
  const G=cfg.env?.g||9.81,RHO=cfg.env?.rhoWater||1025;
  const Vec3=body.pos.constructor;
  const ShaderMaterial=water.matNear.constructor;
  const PlaneGeometry=water.meshNear.geometry.constructor;
  const MeshCtor=water.meshNear.constructor;
  const TextureCtor=oldHF.fieldTexture.constructor;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,x)=>{x=clamp((x-a)/Math.max(1e-8,b-a),0,1);return x*x*(3-2*x)};

  const params={
    enabled:true,
    gridN:144,
    sizeM:18.0,
    effectiveDepthM:1.0,
    solverHz:60,
    pressureIterations:9,
    pressureProjection:0.0,
    pressureRadiusM:0.92,
    submergedPressureDepthM:1.15,
    viscosity:0.020,
    physicalSmoothing:0.034,
    renderSmoothing:0.46,
    momentumDamping:0.9958,
    boundarySponge:0.34,
    boundaryNoSlip:0.0,
    tangentialDrag:0.0,
    reactionGain:0.0,
    maxReactionN:520,
    foamGain:0.08,
    foamPersistence:0.955,
    maxEtaM:0.34,
    maxSpeedMps:3.6,
    fieldAmplitudeM:0.58,
    hullColumnSamples:26,
    rootIterations:8,
    contactHysteresisM:0.018,
    contactFeatherM:0.030,
    meanLevelRelaxS:0.18,
    textureStride:1,
    debugField:"off",
    subcellSamples:2,
    underwaterMomentumGain:0.45,
    underwaterMomentumMaxDu:0.32
  };

  const N=params.gridN,NN=N*N,dx=params.sizeM/N;
  const idx=(x,z)=>z*N+x;
  const eta=new Float32Array(NN),etaPrev=new Float32Array(NN),etaNext=new Float32Array(NN);
  const ux=new Float32Array(NN),uz=new Float32Array(NN),uTent=new Float32Array(NN),vTent=new Float32Array(NN);
  const sigma=new Float32Array(NN),sigmaPrev=new Float32Array(NN),sigmaDot=new Float32Array(NN),block=new Float32Array(NN),solidCoverage=new Float32Array(NN);
  const solidUx=new Float32Array(NN),solidUz=new Float32Array(NN),depthCoupling=new Float32Array(NN);
  const hullLo=new Float32Array(NN),hullHi=new Float32Array(NN),hasHull=new Uint8Array(NN);
  let pressure=new Float32Array(NN),pressureNext=new Float32Array(NN);const pressureMemory=new Float32Array(NN),rhs=new Float32Array(NN);
  const verticalVelocity=new Float32Array(NN),contactEvent=new Float32Array(NN),wetness=new Float32Array(NN),branch=new Float32Array(NN);
  const displayEta=new Float32Array(NN),hydroEta=new Float32Array(NN),hydroUx=new Float32Array(NN),hydroUz=new Float32Array(NN),foam=new Float32Array(NN),foamNext=new Float32Array(NN);
  const tempA=new Float32Array(NN),tempB=new Float32Array(NN);
  // Underwater appendages are not surface-piercing solids. Their equal-and-opposite
  // hydrodynamic force is deposited as a depth-attenuated momentum impulse, which then
  // reaches the free surface only through the same pressure/continuity solve.
  const submergedDuX=new Float32Array(NN),submergedDuZ=new Float32Array(NN);
  let externalImpulseNs=0,externalMomentumEvents=0;
  const qn=new Vec3(0,cfg.hull.bodyReferenceY,cfg.hull.comZ);
  const invQuat=body.quat.clone();
  const tmpPoint=new Vec3(),tmpVel=new Vec3(),tmpForce=new Vec3(),tmpLocal=new Vec3(),tmpForward=new Vec3(),tmpRight=new Vec3(),tmpSt=new Vec3();
  let centerX=0,centerZ=0,originX=0,originZ=0,accumulator=0,initialized=false,warmStart=true;
  let queryCount=0,queryHits=0,lastStepMs=0,lastReactionN=0,lastPressureN=0,lastTextureStep=-1;
  const state={steps:0,shifts:0,resets:0,textureFrames:0,finite:true,lastError:null,sourceModified:true,warmStart:true};
  let latest={maxEta:0,maxSpeed:0,maxPressure:0,maxFoam:0,maxSigma:0,cfl:0,disturbanceVolume:0,displacedVolume:0,wakeEnergy:0,occupiedCells:0,followError:0,sigmaAttachmentError:0,wakeDepression:0,wakeLength:0,pressureReach:0,contactError:0,transomExposure:0};

  // Procedural Laser hull geometry, identical to the visual/physics hull authority.
  function halfWidth(e){let t;if(e<.45)t=lerp(.775,1,Math.pow(smooth(0,1,e/.45),.9));else t=Math.pow(Math.cos((e-.45)/.55*Math.PI/2),1.18);return Math.max(.016,.71*t)}
  function keelY(e){return e<.42?lerp(-.052,-.165,Math.pow(smooth(0,1,e/.42),.8)):lerp(-.165,.155,Math.pow((e-.42)/.58,2.15))}
  function sheerY(e){return .365+.045*e+.14*e*e*e}
  function sectionPower(e){return e<.45?lerp(3.4,2.5,e/.45):lerp(2.5,1.5,smooth(0,1,(e-.45)/.55))}
  function cockpit(x,z){const e=clamp((z+2.2)/4.4,0,1),i=halfWidth(e)-.175;return (1-smooth(0,1,(Math.abs(x)-(i-.07))/.09))*smooth(0,1,(z+1.78)/.1)*(1-smooth(0,1,(z-.3)/.1))}
  function deckY(x,z){const e=clamp((z+2.2)/4.4,0,1),w=halfWidth(e),s=sheerY(e),n=.045*(1-Math.pow(Math.min(Math.abs(x)/Math.max(w,.01),1),2));return lerp(s+n,.155,cockpit(x,z))}
  function normalizedSectionX(x,w){let t=clamp(Math.abs(x)/Math.max(w,1e-6),0,1.15);for(let k=0;k<4;k++){const t2=t*t,t4=t2*t2,t6=t4*t2,f=w*t*(1+.05*t6)-Math.abs(x),df=w*(1+.35*t6);t=clamp(t-f/Math.max(df,1e-6),0,1.05)}return t}
  function insideHullLocal(x,y,z){const e=(z+2.2)/4.4;if(e<0||e>1)return false;const w=halfWidth(e),t=normalizedSectionX(x,w);if(t>1.001)return false;const bottom=keelY(e)+(sheerY(e)-keelY(e))*Math.pow(Math.abs(t),sectionPower(e)),top=deckY(x,z);return y>=bottom&&y<=top}
  function inverseRotation(){
    invQuat.copy(body.quat).invert();
    const x=invQuat.x,y=invQuat.y,z=invQuat.z,w=invQuat.w,x2=x+x,y2=y+y,z2=z+z;
    const xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
    return [1-(yy+zz),xy-wz,xz+wy,xy+wz,1-(xx+zz),yz-wx,xz-wy,yz+wx,1-(xx+yy)];
  }
  function worldLine(wx,wz,R){
    const bx=wx-body.pos.x,bz=wz-body.pos.z,by0=-body.pos.y;
    return {ax:R[1],ay:R[4],az:R[7],bx:R[0]*bx+R[1]*by0+R[2]*bz+qn.x,by:R[3]*bx+R[4]*by0+R[5]*bz+qn.y,bz:R[6]*bx+R[7]*by0+R[8]*bz+qn.z};
  }
  function lineInside(c,y){return insideHullLocal(c.bx+c.ax*y,c.by+c.ay*y,c.bz+c.az*y)}
  function bisectTransition(c,a,b,insideAtB){
    let lo=a,hi=b;
    for(let k=0;k<params.rootIterations;k++){const m=.5*(lo+hi),inside=lineInside(c,m);if(inside===insideAtB)hi=m;else lo=m;}
    return .5*(lo+hi);
  }
  function hullInterval(wx,wz,R,out){
    const rx=wx-body.pos.x,rz=wz-body.pos.z;if(rx*rx+rz*rz>9.1)return false;
    const c=worldLine(wx,wz,R),y0=body.pos.y-1.38,y1=body.pos.y+1.38,S=params.hullColumnSamples,dy=(y1-y0)/S;
    let prev=lineInside(c,y0),enter=prev?y0:NaN,exit=NaN,py=y0;
    for(let s=1;s<=S;s++){
      const y=y0+s*dy,cur=lineInside(c,y);
      if(cur!==prev){const root=bisectTransition(c,py,y,cur);if(cur&&!prev&&Number.isNaN(enter))enter=root;else if(!cur&&prev)exit=root;}
      prev=cur;py=y;
    }
    if(prev&&Number.isNaN(exit))exit=y1;
    if(!Number.isFinite(enter)||!Number.isFinite(exit)||exit<=enter)return false;
    out.lo=enter;out.hi=exit;out.c=c;return true;
  }

  // Extensible solid-column interface. Additional immersed objects can register exact providers.
  const solids=[];
  const intervalScratch={lo:0,hi:0,c:null};
  const hullProvider={id:"procedural-laser-hull",sampleColumn(wx,wz,R,out){return hullInterval(wx,wz,R,out)}};
  solids.push(hullProvider);
  function createSphereProvider(getState){return {id:"analytic-sphere",sampleColumn(wx,wz,R,out){const s=typeof getState==='function'?getState():getState;if(!s)return false;const dx=wx-s.x,dz=wz-s.z,r=s.radius,d2=dx*dx+dz*dz;if(d2>=r*r)return false;const h=Math.sqrt(r*r-d2);out.lo=s.y-h;out.hi=s.y+h;out.c=null;return true;}}}
  function registerSolid(provider){if(provider?.sampleColumn&&!solids.includes(provider))solids.push(provider);return provider}
  function unregisterSolid(provider){const i=solids.indexOf(provider);if(i>=0)solids.splice(i,1)}

  function cellWorldX(x){return originX+(x+.5)*dx}
  function cellWorldZ(z){return originZ+(z+.5)*dx}
  function reset(reason="manual"){
    for(const a of [eta,etaPrev,etaNext,ux,uz,uTent,vTent,sigma,sigmaPrev,sigmaDot,block,solidCoverage,solidUx,solidUz,depthCoupling,hullLo,hullHi,pressure,pressureNext,pressureMemory,rhs,verticalVelocity,contactEvent,wetness,branch,displayEta,hydroEta,hydroUx,hydroUz,foam,foamNext,tempA,tempB,submergedDuX,submergedDuZ])a.fill(0);
    hasHull.fill(0);centerX=Math.round(body.pos.x/dx)*dx;centerZ=Math.round(body.pos.z/dx)*dx;originX=centerX-params.sizeM*.5;originZ=centerZ-params.sizeM*.5;
    accumulator=0;initialized=true;warmStart=true;state.warmStart=true;state.resets++;state.lastResetReason=reason;
  }
  function shiftArray(a,sx,sz,fill=0){
    tempA.fill(fill);
    for(let z=0;z<N;z++){const oz=z+sz;if(oz<0||oz>=N)continue;for(let x=0;x<N;x++){const ox=x+sx;if(ox<0||ox>=N)continue;tempA[idx(x,z)]=a[idx(ox,oz)];}}
    a.set(tempA);
  }
  function shiftByteArray(a,sx,sz,fill=0){
    const t=new Uint8Array(NN);if(fill)t.fill(fill);
    for(let z=0;z<N;z++){const oz=z+sz;if(oz<0||oz>=N)continue;for(let x=0;x<N;x++){const ox=x+sx;if(ox<0||ox>=N)continue;t[idx(x,z)]=a[idx(ox,oz)];}}
    a.set(t);
  }
  function shiftWindow(){
    if(!initialized){reset("initialize");return;}
    const nx=Math.round(body.pos.x/dx)*dx,nz=Math.round(body.pos.z/dx)*dx,sx=Math.round((nx-centerX)/dx),sz=Math.round((nz-centerZ)/dx);
    if(!sx&&!sz)return;
    if(Math.abs(sx)>N/3||Math.abs(sz)>N/3){reset("large-window-shift");return;}
    for(const a of [eta,etaPrev,ux,uz,sigma,sigmaPrev,sigmaDot,solidCoverage,solidUx,solidUz,depthCoupling,pressureMemory,contactEvent,wetness,branch,displayEta,hydroEta,hydroUx,hydroUz,foam,verticalVelocity,submergedDuX,submergedDuZ])shiftArray(a,sx,sz,0);
    shiftByteArray(hasHull,sx,sz,0);hullLo.fill(0);hullHi.fill(0);block.fill(0);pressure.fill(0);pressureNext.fill(0);rhs.fill(0);
    centerX=nx;centerZ=nz;originX=centerX-params.sizeM*.5;originZ=centerZ-params.sizeM*.5;state.shifts++;
  }
  function bilerp(a,wx,wz){
    const gx=(wx-originX)/dx-.5,gz=(wz-originZ)/dx-.5;if(gx<0||gz<0||gx>N-1||gz>N-1)return 0;
    const x0=Math.floor(gx),z0=Math.floor(gz),x1=Math.min(N-1,x0+1),z1=Math.min(N-1,z0+1),tx=gx-x0,tz=gz-z0;
    return lerp(lerp(a[idx(x0,z0)],a[idx(x1,z0)],tx),lerp(a[idx(x0,z1)],a[idx(x1,z1)],tx),tz);
  }
  function sample(wx,wz){
    queryCount++;const gx=(wx-originX)/dx-.5,gz=(wz-originZ)/dx-.5;if(gx<0||gz<0||gx>N-1||gz>N-1)return {eta:0,physicalEta:0,ux:0,uz:0,w:0,pressure:0,foam:0,sigma:0,inside:false};
    queryHits++;return {eta:bilerp(hydroEta,wx,wz),physicalEta:bilerp(eta,wx,wz),ux:bilerp(hydroUx,wx,wz),uz:bilerp(hydroUz,wx,wz),w:bilerp(verticalVelocity,wx,wz),pressure:bilerp(pressureMemory,wx,wz),foam:bilerp(foam,wx,wz),sigma:bilerp(sigma,wx,wz),inside:true};
  }

  function injectMomentum(wx,wz,forceX,forceZ,depth=0,radius=.30,dt=1/60){
    if(!params.enabled||!Number.isFinite(wx+wz+forceX+forceZ+depth+radius+dt)||Math.hypot(forceX,forceZ)<1e-5)return 0;
    const coupling=Math.exp(-Math.max(0,depth)/Math.max(.12,params.submergedPressureDepthM));
    if(coupling<1e-4)return 0;
    radius=Math.max(dx*1.15,Math.abs(radius));
    const reach=Math.ceil(radius*2.6/dx),cx=Math.floor((wx-originX)/dx),cz=Math.floor((wz-originZ)/dx);
    let sum=0;
    for(let dz=-reach;dz<=reach;dz++)for(let sx=-reach;sx<=reach;sx++){
      const x=cx+sx,z=cz+dz;if(x<1||x>=N-1||z<1||z>=N-1)continue;
      const rx=cellWorldX(x)-wx,rz=cellWorldZ(z)-wz,r2=rx*rx+rz*rz;
      if(r2>radius*radius*6.76)continue;
      const i=idx(x,z),open=.18+.82*(1-block[i]),w=Math.exp(-.5*r2/(radius*radius))*open;sum+=w;
    }
    if(sum<1e-8)return 0;
    const impulseScale=params.underwaterMomentumGain*coupling*dt/(RHO*params.effectiveDepthM*dx*dx*sum);
    const dux=forceX*impulseScale,duz=forceZ*impulseScale,maxDu=params.underwaterMomentumMaxDu;
    for(let dz=-reach;dz<=reach;dz++)for(let sx=-reach;sx<=reach;sx++){
      const x=cx+sx,z=cz+dz;if(x<1||x>=N-1||z<1||z>=N-1)continue;
      const rx=cellWorldX(x)-wx,rz=cellWorldZ(z)-wz,r2=rx*rx+rz*rz;
      if(r2>radius*radius*6.76)continue;
      const i=idx(x,z),open=.18+.82*(1-block[i]),w=Math.exp(-.5*r2/(radius*radius))*open;
      submergedDuX[i]+=clamp(dux*w,-maxDu,maxDu);submergedDuZ[i]+=clamp(duz*w,-maxDu,maxDu);
    }
    const J=Math.hypot(forceX,forceZ)*dt*coupling;externalImpulseNs+=J;externalMomentumEvents++;return J;
  }

  function updateOccupancy(dt){
    sigmaPrev.set(sigma);sigma.fill(0);sigmaDot.fill(0);block.fill(0);solidCoverage.fill(0);solidUx.fill(0);solidUz.fill(0);depthCoupling.fill(0);hasHull.fill(0);hullLo.fill(0);hullHi.fill(0);
    const R=inverseRotation(),bottom=-params.effectiveDepthM,S=Math.max(2,params.subcellSamples|0),half=.34*dx;
    // Only cells within the transformed Laser hull's conservative horizontal radius need
    // expensive root searches. This buys true sub-cell coverage without global cost.
    const pad=3.15,x0=clamp(Math.floor((body.pos.x-pad-originX)/dx),1,N-2),x1=clamp(Math.ceil((body.pos.x+pad-originX)/dx),1,N-2);
    const z0=clamp(Math.floor((body.pos.z-pad-originZ)/dx),1,N-2),z1=clamp(Math.ceil((body.pos.z+pad-originZ)/dx),1,N-2);
    for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
      const i=idx(x,z),surface=eta[i],baseX=cellWorldX(x),baseZ=cellWorldZ(z);
      let sigSum=0,depthSum=0,velX=0,velZ=0,wetWeight=0,foundCount=0,wetSamples=0,loMin=1e9,hiMax=-1e9,centerLo=NaN,centerHi=NaN;
      for(let az=0;az<S;az++)for(let ax=0;ax<S;ax++){
        const ox=S===1?0:lerp(-half,half,ax/(S-1)),oz=S===1?0:lerp(-half,half,az/(S-1));
        const wx=baseX+ox,wz=baseZ+oz;let found=false,lo=1e9,hi=-1e9,total=0,depthWeighted=0,weight=0;
        for(const provider of solids){
          if(!provider.sampleColumn(wx,wz,R,intervalScratch))continue;found=true;lo=Math.min(lo,intervalScratch.lo);hi=Math.max(hi,intervalScratch.hi);
          const wetLo=Math.max(bottom,intervalScratch.lo),wetHi=Math.min(surface,intervalScratch.hi),th=Math.max(0,wetHi-wetLo);
          total+=th;if(th>0){const d=Math.max(0,surface-.5*(wetLo+wetHi));depthWeighted+=d*th;weight+=th;}
        }
        if(!found)continue;foundCount++;loMin=Math.min(loMin,lo);hiMax=Math.max(hiMax,hi);
        if(ax===(S>>1)&&az===(S>>1)){centerLo=lo;centerHi=hi;}
        sigSum+=total;
        if(total>0){wetSamples++;const cy=clamp(.5*(Math.max(bottom,lo)+Math.min(surface,hi)),bottom,surface);tmpPoint.set(wx,cy,wz);body.worldPointVelocity(tmpPoint,tmpVel);velX+=tmpVel.x*total;velZ+=tmpVel.z*total;wetWeight+=total;depthSum+=(weight>1e-8?depthWeighted/weight:Math.max(0,surface-.5*(lo+hi)))*total;}
      }
      if(!foundCount)continue;
      hasHull[i]=1;hullLo[i]=Number.isFinite(centerLo)?centerLo:loMin;hullHi[i]=Number.isFinite(centerHi)?centerHi:hiMax;
      const sampleCount=S*S,total=sigSum/sampleCount,cov=wetSamples/sampleCount;sigma[i]=clamp(total,0,params.effectiveDepthM*.96);solidCoverage[i]=cov;
      const meanWet=cov>1e-6?sigma[i]/cov:0;block[i]=clamp(cov*smooth(.0015,.105,meanWet),0,1);
      if(wetWeight>1e-8){solidUx[i]=velX/wetWeight;solidUz[i]=velZ/wetWeight;const depth=depthSum/wetWeight;depthCoupling[i]=Math.exp(-depth/Math.max(.15,params.submergedPressureDepthM));}
      else depthCoupling[i]=Math.exp(-Math.max(0,surface-.5*(loMin+hiMax))/Math.max(.15,params.submergedPressureDepthM));
      const ds=clamp(sigma[i]-sigmaPrev[i],-.14,.14);sigmaDot[i]=ds/Math.max(dt,1e-5);
    }
    if(warmStart){
      sigmaPrev.set(sigma);sigmaDot.fill(0);eta.fill(0);etaPrev.fill(0);ux.fill(0);uz.fill(0);pressureMemory.fill(0);foam.fill(0);wetness.fill(0);branch.fill(-1);hydroEta.fill(0);hydroUx.fill(0);hydroUz.fill(0);submergedDuX.fill(0);submergedDuZ.fill(0);warmStart=false;state.warmStart=false;
    }
  }

  function tentativeVelocity(dt){
    const inv2=.5/dx,invDx2=1/(dx*dx);
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),im=i-1,ip=i+1,jm=i-N,jp=i+N;
      const eL=block[im]>.9?eta[i]:eta[im],eR=block[ip]>.9?eta[i]:eta[ip],eD=block[jm]>.9?eta[i]:eta[jm],eU=block[jp]>.9?eta[i]:eta[jp];
      const gx=(eR-eL)*inv2,gz=(eU-eD)*inv2,u=ux[i],v=uz[i];
      const dudx=u>=0?(u-ux[im])/dx:(ux[ip]-u)/dx,dudz=v>=0?(u-ux[jm])/dx:(ux[jp]-u)/dx;
      const dvdx=u>=0?(v-uz[im])/dx:(uz[ip]-v)/dx,dvdz=v>=0?(v-uz[jm])/dx:(uz[jp]-v)/dx;
      const lapU=(ux[im]+ux[ip]+ux[jm]+ux[jp]-4*u)*invDx2,lapV=(uz[im]+uz[ip]+uz[jm]+uz[jp]-4*v)*invDx2;
      let nu=u+dt*(-G*gx-u*dudx-v*dudz+params.viscosity*lapU)+submergedDuX[i],nv=v+dt*(-G*gz-u*dvdx-v*dvdz+params.viscosity*lapV)+submergedDuZ[i];
      submergedDuX[i]=0;submergedDuZ[i]=0;
      const b=block[i];nu=lerp(nu,solidUx[i],b*params.boundaryNoSlip);nv=lerp(nv,solidUz[i],b*params.boundaryNoSlip);
      const relTx=solidUx[i]-nu,relTz=solidUz[i]-nv;nu+=relTx*b*params.tangentialDrag;nv+=relTz*b*params.tangentialDrag;
      uTent[i]=clamp(nu,-params.maxSpeedMps,params.maxSpeedMps);vTent[i]=clamp(nv,-params.maxSpeedMps,params.maxSpeedMps);
    }
  }

  function faceU(a,b,axis){
    // Solid-capacity change is the sole moving-boundary volume source. Liquid flux
    // uses only the open-face fluid velocity, avoiding a second synthetic hull wake.
    return axis===0?.5*(uTent[a]+uTent[b]):.5*(vTent[a]+vTent[b]);
  }
  function solvePressure(dt){
    const H=params.effectiveDepthM,inv2=.5/dx,screen=(dx/Math.max(dx,params.pressureRadiusM))**2;
    pressure.set(pressureMemory);
    let rhsSum=0,rhsWeight=0;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),im=i-1,ip=i+1,jm=i-N,jp=i+N;
      const div=((faceU(i,ip,0)-faceU(im,i,0))+(faceU(i,jp,1)-faceU(jm,i,1)))/dx;
      const source=sigmaDot[i]*depthCoupling[i]/Math.max(.08,H),open=1-block[i];
      rhs[i]=div-source;rhsSum+=rhs[i]*open;rhsWeight+=open;
    }
    const rhsMean=rhsWeight>1e-6?rhsSum/rhsWeight:0;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){const i=idx(x,z);rhs[i]-=rhsMean*(1-block[i]);}
    for(let it=0;it<params.pressureIterations;it++){
      for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
        const i=idx(x,z),im=i-1,ip=i+1,jm=i-N,jp=i+N;
        const wL=1-clamp(.5*(solidCoverage[i]+solidCoverage[im]),0,1),wR=1-clamp(.5*(solidCoverage[i]+solidCoverage[ip]),0,1),wD=1-clamp(.5*(solidCoverage[i]+solidCoverage[jm]),0,1),wU=1-clamp(.5*(solidCoverage[i]+solidCoverage[jp]),0,1);
        const den=wL+wR+wD+wU+screen;
        pressureNext[i]=(wL*pressure[im]+wR*pressure[ip]+wD*pressure[jm]+wU*pressure[jp]-rhs[i]*dx*dx)/Math.max(.2,den);
      }
      const swap=pressure;pressure=pressureNext;pressureNext=swap;
    }
    let maxP=0,forceX=0,forceZ=0;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),im=i-1,ip=i+1,jm=i-N,jp=i+N;
      const gx=(pressure[ip]-pressure[im])*inv2,gz=(pressure[jp]-pressure[jm])*inv2;
      let nu=uTent[i]-params.pressureProjection*gx,nv=vTent[i]-params.pressureProjection*gz;
      const b=block[i];
      ux[i]=clamp(nu*params.momentumDamping,-params.maxSpeedMps,params.maxSpeedMps);uz[i]=clamp(nv*params.momentumDamping,-params.maxSpeedMps,params.maxSpeedMps);
      pressureMemory[i]=lerp(pressureMemory[i]*Math.exp(-dt*3.2),pressure[i],.60);maxP=Math.max(maxP,Math.abs(pressureMemory[i]));
      const gsx=(sigma[ip]-sigma[im])*inv2,gsz=(sigma[jp]-sigma[jm])*inv2;
      const pPa=RHO*pressureMemory[i]/Math.max(dt,.001);
      forceX-=pPa*gsx*dx*dx*params.reactionGain;forceZ-=pPa*gsz*dx*dx*params.reactionGain;
    }
    tmpForce.set(forceX,0,forceZ);lastPressureN=tmpForce.length();
    if(lastPressureN>params.maxReactionN){tmpForce.multiplyScalar(params.maxReactionN/Math.max(lastPressureN,1e-6));lastPressureN=params.maxReactionN;}
    if(Number.isFinite(lastPressureN)&&lastPressureN>0)body.addForceAt(tmpForce,body.pos);
    lastReactionN=lastPressureN;return maxP;
  }

  function fluxX(a,b,hA,hB){const vel=faceU(a,b,0),open=1-clamp(.5*(solidCoverage[a]+solidCoverage[b]),0,1);return open*(vel>=0?hA:hB)*vel;}
  function fluxZ(a,b,hA,hB){const vel=faceU(a,b,1),open=1-clamp(.5*(solidCoverage[a]+solidCoverage[b]),0,1);return open*(vel>=0?hA:hB)*vel;}
  function continuity(dt,maxPressure){
    etaNext.set(eta);foamNext.set(foam);const H=params.effectiveDepthM,invDx=1/dx;
    let maxEta=0,maxSpeed=0,maxFoam=0,maxSigma=0,volume=0,wakeEnergy=0,occ=0;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),im=i-1,ip=i+1,jm=i-N,jp=i+N;
      const hOld=Math.max(.012,H+eta[i]-sigmaPrev[i]);
      const hL=Math.max(.012,H+eta[im]-sigmaPrev[im]),hR=Math.max(.012,H+eta[ip]-sigmaPrev[ip]);
      const hD=Math.max(.012,H+eta[jm]-sigmaPrev[jm]),hU=Math.max(.012,H+eta[jp]-sigmaPrev[jp]);
      const div=(fluxX(i,ip,hOld,hR)-fluxX(im,i,hL,hOld)+fluxZ(i,jp,hOld,hU)-fluxZ(jm,i,hD,hOld))*invDx;
      let hNew=Math.max(.008,hOld-dt*div);
      let en=clamp(hNew+sigma[i]-H,-params.maxEtaM,params.maxEtaM);
      const edge=Math.min(x,z,N-1-x,N-1-z),sponge=1-smooth(0,N*.22,edge),sd=clamp(params.boundarySponge*sponge,0,.42);
      en*=1-sd;ux[i]*=1-sd*.72;uz[i]*=1-sd*.72;pressureMemory[i]*=1-sd*.65;
      etaNext[i]=en;
      const divU=((ux[ip]-ux[im])+(uz[jp]-uz[jm]))*.5*invDx,compression=Math.max(0,-divU),release=Math.max(0,-sigmaDot[i]);
      const gen=params.foamGain*clamp(compression*.16+contactEvent[i]*.42+release*.055+Math.abs(en)*.05,0,1.5);
      const backX=cellWorldX(x)-ux[i]*dt,backZ=cellWorldZ(z)-uz[i]*dt;
      const adv=bilerp(foam,backX,backZ);const fn=clamp(adv*params.foamPersistence+gen*dt,0,1)*(1-sd*.3);foamNext[i]=fn;
      const sp=Math.hypot(ux[i],uz[i]);maxEta=Math.max(maxEta,Math.abs(en));maxSpeed=Math.max(maxSpeed,sp);maxFoam=Math.max(maxFoam,fn);maxSigma=Math.max(maxSigma,sigma[i]);volume+=en*dx*dx;wakeEnergy+=(en*en+.025*sp*sp)*dx*dx;if(sigma[i]>.008)occ++;
    }
    tempA.set(etaNext);
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),avg=.25*(tempA[i-1]+tempA[i+1]+tempA[i-N]+tempA[i+N]),k=params.physicalSmoothing*(1-block[i])*(1-smooth(0,N*.22,Math.min(x,z,N-1-x,N-1-z))*.2);
      etaNext[i]=clamp(tempA[i]+(avg-tempA[i])*k,-params.maxEtaM,params.maxEtaM);
    }
    let openSum=0,openWeight=0;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){const i=idx(x,z),w=1-block[i];openSum+=etaNext[i]*w;openWeight+=w;}
    const openMean=openWeight>1e-6?openSum/openWeight:0,meanRelax=1-Math.exp(-dt/Math.max(.05,params.meanLevelRelaxS));
    if(Math.abs(openMean)>1e-8){for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){const i=idx(x,z);etaNext[i]=clamp(etaNext[i]-openMean*meanRelax*(1-block[i]),-params.maxEtaM,params.maxEtaM);}}
    etaPrev.set(eta);eta.set(etaNext);foam.set(foamNext);
    maxEta=0;maxSpeed=0;volume=0;wakeEnergy=0;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){const i=idx(x,z),sp=Math.hypot(ux[i],uz[i]),open=1-block[i];if(open>.55){maxEta=Math.max(maxEta,Math.abs(eta[i]));maxSpeed=Math.max(maxSpeed,sp);}volume+=eta[i]*open*dx*dx;wakeEnergy+=(eta[i]*eta[i]+.025*sp*sp)*open*dx*dx;}
    for(let i=0;i<NN;i++)verticalVelocity[i]=(eta[i]-etaPrev[i])/Math.max(dt,1e-5);
    return {maxEta,maxSpeed,maxFoam,maxSigma,volume,wakeEnergy,occ,cfl:maxSpeed*dt/dx,maxPressure};
  }

  function updateContactDisplay(dt){
    tempA.set(eta);
    // Render reconstruction is smoothed, while the physical field remains unsmoothed for buoyancy.
    for(let pass=0;pass<2;pass++){
      for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
        const i=idx(x,z),avg=(tempA[i]*4+(tempA[i-1]+tempA[i+1]+tempA[i-N]+tempA[i+N])*2+tempA[i-N-1]+tempA[i-N+1]+tempA[i+N-1]+tempA[i+N+1])/16;
        tempB[i]=lerp(tempA[i],avg,params.renderSmoothing);
      }
      tempA.set(tempB);
    }
    let contactErr=0,contactN=0;
    for(let z=0;z<N;z++)for(let x=0;x<N;x++){
      const i=idx(x,z),e=eta[i];let d=tempA[i];
      if(hasHull[i]){
        const lo=hullLo[i],hi=hullHi[i],inside=e>lo&&e<hi,dist=inside?0:Math.min(Math.abs(e-lo),Math.abs(e-hi));
        let neighbor=e,n=0;if(x>0){neighbor+=eta[i-1];n++;}if(x<N-1){neighbor+=eta[i+1];n++;}if(z>0){neighbor+=eta[i-N];n++;}if(z<N-1){neighbor+=eta[i+N];n++;}neighbor/=n+1;
        let target=branch[i]||-1;
        if(e>=hi+params.contactHysteresisM)target=1;else if(e<=lo-params.contactHysteresisM)target=-1;else target=neighbor>.5*(lo+hi)?1:-1;
        branch[i]=lerp(branch[i],target,clamp(dt*9,0,1));
        const contact=inside?1:1-smooth(0,params.contactFeatherM,dist),release=Math.max(0,-sigmaDot[i]);
        wetness[i]=Math.max(wetness[i]*Math.exp(-dt*(2.4+release*2.2)),contact);
        if(inside){const bound=(branch[i]>=0?hi+.0035:lo-.0035),w=clamp(wetness[i],0,1);d=lerp(d,bound,w);contactErr=Math.max(contactErr,Math.abs(d-bound));contactN++;}
      }else{wetness[i]*=Math.exp(-dt*3.2);branch[i]=lerp(branch[i],-1,clamp(dt*4,0,1));}
      const rx=(x+.5)-N*.5,rz=(z+.5)-N*.5,rr=Math.hypot(rx,rz)/(N*.5),edgeMask=1-smooth(.72,.965,rr);displayEta[i]=d*edgeMask;
      contactEvent[i]=Math.max(contactEvent[i]*Math.exp(-dt*5.0),clamp(Math.abs(sigmaDot[i])*.025+wetness[i]*block[i]*.28,0,1.2));
    }
    latest.contactError=contactN?contactErr:0;
  }

  function reconstructHydraulicHead(){
    hydroEta.set(eta);hydroUx.set(ux);hydroUz.set(uz);
    for(let it=0;it<5;it++){
      tempA.set(hydroEta);
      for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
        const i=idx(x,z);if(!hasHull[i]||block[i]<.025||eta[i]>=hullHi[i]+.015)continue;
        let sum=0,w=0;for(const j of [i-1,i+1,i-N,i+N]){const q=1-block[j];if(q>.02){sum+=hydroEta[j]*q;w+=q;}}
        if(w>.02)tempA[i]=sum/w+pressureMemory[i]*(.10/G);
      }
      hydroEta.set(tempA);
    }
    for(const pair of [[hydroUx,ux],[hydroUz,uz]]){
      const out=pair[0],src=pair[1];out.set(src);
      for(let it=0;it<4;it++){
        tempA.set(out);
        for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
          const i=idx(x,z);if(!hasHull[i]||block[i]<.025||eta[i]>=hullHi[i]+.015)continue;
          let sum=0,w=0;for(const j of [i-1,i+1,i-N,i+N]){const q=1-block[j];if(q>.02){sum+=out[j]*q;w+=q;}}
          if(w>.02)tempA[i]=sum/w;
        }
        out.set(tempA);
      }
    }
  }

  function diagnostics(){
    tmpForward.set(0,0,1).applyQuaternion(body.quat);tmpForward.y=0;if(tmpForward.lengthSq()<1e-8)tmpForward.set(0,0,1);tmpForward.normalize();tmpRight.set(tmpForward.z,0,-tmpForward.x);
    tmpSt.set(0,0,-2.2).sub(qn).applyQuaternion(body.quat).add(body.pos);
    let sx=0,sz=0,sw=0,minWake=0,wakeLen=0,pReach=0,transomEta=0,transomN=0;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),wx=cellWorldX(x),wz=cellWorldZ(z),s=sigma[i];if(s>1e-5){sx+=wx*s;sz+=wz*s;sw+=s;}
      const rx=wx-tmpSt.x,rz=wz-tmpSt.z,aft=-(rx*tmpForward.x+rz*tmpForward.z),lat=Math.abs(rx*tmpRight.x+rz*tmpRight.z);
      if(aft>.05&&lat<2.2&&s<.004){minWake=Math.min(minWake,eta[i]);if(Math.abs(eta[i])>.006||Math.hypot(ux[i],uz[i])>.08)wakeLen=Math.max(wakeLen,aft);if(aft<.55&&lat<.65){transomEta+=eta[i];transomN++;}}
      if(s<.002&&Math.abs(pressureMemory[i])>.020)pReach=Math.max(pReach,Math.hypot(wx-body.pos.x,wz-body.pos.z));
    }
    latest.followError=Math.hypot(body.pos.x-centerX,body.pos.z-centerZ);
    latest.sigmaAttachmentError=sw>1e-8?Math.hypot(sx/sw-body.pos.x,sz/sw-body.pos.z):0;
    latest.wakeDepression=-minWake;latest.wakeLength=wakeLen;latest.pressureReach=pReach;latest.transomExposure=transomN?Math.max(0,-transomEta/transomN):0;
  }

  function solverStep(dt){
    if(!params.enabled)return;const t0=performance.now();shiftWindow();updateOccupancy(dt);tentativeVelocity(dt);const maxP=solvePressure(dt);const c=continuity(dt,maxP);updateContactDisplay(dt);reconstructHydraulicHead();
    let disp=0;for(let i=0;i<NN;i++)disp+=sigma[i]*dx*dx;
    latest={...latest,maxEta:c.maxEta,maxSpeed:c.maxSpeed,maxPressure:c.maxPressure,maxFoam:c.maxFoam,maxSigma:c.maxSigma,cfl:c.cfl,disturbanceVolume:c.volume,displacedVolume:disp,wakeEnergy:c.wakeEnergy,occupiedCells:c.occ};if((state.steps&3)===0)diagnostics();
    state.steps++;lastStepMs=performance.now()-t0;state.finite=[c.maxEta,c.maxSpeed,c.maxPressure,c.volume,disp,lastReactionN,latest.followError,latest.wakeDepression].every(Number.isFinite);
    if(!state.finite){state.lastError="non-finite material-memory field";reset("non-finite");}
  }

  // Field texture: R display surface, G foam, B pressure magnitude, A physical eta.
  const fieldCanvas=document.createElement("canvas");fieldCanvas.width=N;fieldCanvas.height=N;
  const ctx=fieldCanvas.getContext("2d"),image=ctx.createImageData(N,N),px=image.data;
  const fieldTexture=new TextureCtor(fieldCanvas);fieldTexture.flipY=false;fieldTexture.generateMipmaps=false;fieldTexture.minFilter=1006;fieldTexture.magFilter=1006;fieldTexture.wrapS=1001;fieldTexture.wrapT=1001;fieldTexture.unpackAlignment=1;fieldTexture.needsUpdate=true;
  function updateTexture(){
    const amp=params.fieldAmplitudeM,pScale=Math.max(.004,latest.maxPressure*.85);
    for(let z=0;z<N;z++)for(let x=0;x<N;x++){
      const i=idx(x,z),p=((N-1-z)*N+x)*4,rx=(x+.5)-N*.5,rz=(z+.5)-N*.5,rr=Math.hypot(rx,rz)/(N*.5),em=1-smooth(.72,.965,rr);
      px[p]=Math.round(clamp(.5+.5*displayEta[i]/amp,0,1)*255);px[p+1]=Math.round(clamp(foam[i]*em,0,1)*255);px[p+2]=Math.round(clamp(Math.abs(pressureMemory[i])*em/pScale,0,1)*255);px[p+3]=Math.round(clamp(.5+.5*(eta[i]*em)/amp,0,1)*255);
    }
    ctx.putImageData(image,0,0);fieldTexture.needsUpdate=true;state.textureFrames++;
  }

  const commonFragment=`
    precision highp float;uniform float uIor;uniform vec3 uSunDir;uniform float uTime;uniform float uDebug;
    uniform vec3 uCutoutCenter;uniform float uCutoutSize;uniform float uCutoutEnabled;uniform float uInnerCutoutSize;uniform float uInnerCutoutEnabled;
    varying vec3 vWorld;varying vec3 vNormalW;varying vec4 vField;
    float sat(float x){return clamp(x,0.0,1.0);}float fres(float c){float r=(1.0-uIor)/(1.0+uIor);r*=r;return r+(1.0-r)*pow(1.0-sat(c),5.0);}
    vec3 sky(vec3 d){float h=sat(d.y*.5+.5);vec3 c=mix(vec3(.73,.84,.91),vec3(.18,.43,.67),pow(h,.62));float s=max(dot(d,normalize(uSunDir)),0.0);return c+vec3(1.0,.86,.68)*(pow(s,1800.0)*3.4+pow(s,72.0)*.08);}
    void main(){
      if(uInnerCutoutEnabled>.5&&abs(vWorld.x-uCutoutCenter.x)<uInnerCutoutSize*.5&&abs(vWorld.z-uCutoutCenter.z)<uInnerCutoutSize*.5)discard;
      if(uCutoutEnabled>.5){vec2 cuv=(vWorld.xz-(uCutoutCenter.xz-vec2(uCutoutSize*.5)))/uCutoutSize;float ce=min(min(cuv.x,1.0-cuv.x),min(cuv.y,1.0-cuv.y));if(ce>-.006&&cuv.x>-.006&&cuv.x<1.006&&cuv.y>-.006&&cuv.y<1.006)discard;}
      vec3 V=normalize(cameraPosition-vWorld),N=normalize(vNormalW);if(dot(N,V)<0.0)N=-N;float F=fres(max(dot(N,V),.001));
      float foam=sat(vField.g),pressure=sat(vField.b),physicalEta=vField.a*2.0-1.0;
      vec3 deep=vec3(.010,.071,.099),shallow=vec3(.037,.205,.242);vec3 body=mix(deep,shallow,sat(.58+physicalEta*.20));
      vec3 reflected=sky(reflect(-V,N));vec3 L=normalize(uSunDir),H=normalize(L+V);float spec=pow(max(dot(N,H),0.0),210.0)*(1.0+pressure*.55);
      vec3 col=mix(body,reflected,F);col+=vec3(1.0,.90,.72)*spec*.34;col=mix(col,vec3(.91,.97,.99),foam*(.58+.20*F));col=mix(col,vec3(.09,.34,.46),pressure*.075);
      if(uDebug>.5){vec3 dbg=uDebug<1.5?vec3(vField.r,vField.g,vField.b):(uDebug<2.5?vec3(vField.b):vec3(vField.a));col=mix(col,dbg,.82);}
      gl_FragColor=vec4(max(col,vec3(0.0)),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const localVertex=`
    uniform sampler2D uField;uniform float uSize;uniform float uAmp;uniform float uTexel;
    varying vec3 vWorld;varying vec3 vNormalW;varying vec4 vField;
    void main(){vec3 p=position;vec2 q=clamp(vec2(position.x/uSize+.5,position.z/uSize+.5),vec2(.001),vec2(.999));vec4 f=texture2D(uField,q);float h=(f.r*2.0-1.0)*uAmp;
      float l=(texture2D(uField,q-vec2(uTexel,0)).r*2.0-1.0)*uAmp,r=(texture2D(uField,q+vec2(uTexel,0)).r*2.0-1.0)*uAmp,d=(texture2D(uField,q-vec2(0,uTexel)).r*2.0-1.0)*uAmp,u=(texture2D(uField,q+vec2(0,uTexel)).r*2.0-1.0)*uAmp;
      p.y+=h;vec3 n=normalize(vec3(-(r-l)/(2.0*uTexel*uSize),1.0,-(u-d)/(2.0*uTexel*uSize)));vec4 w=modelMatrix*vec4(p,1.0);vWorld=w.xyz;vNormalW=normalize(mat3(modelMatrix)*n);vField=f;gl_Position=projectionMatrix*viewMatrix*w;}`;
  const flatVertex=`varying vec3 vWorld;varying vec3 vNormalW;varying vec4 vField;void main(){vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;vNormalW=normalize(mat3(modelMatrix)*normal);vField=vec4(.5,0.0,0.0,.5);gl_Position=projectionMatrix*viewMatrix*w;}`;
  const oldSun=water.matNear.uniforms.uSunDir,oldTime=water.matNear.uniforms.uTime;
  function sharedUniforms(cutout){return {uIor:{value:1.333},uSunDir:oldSun,uTime:oldTime,uDebug:{value:0},uCutoutCenter:{value:new Vec3()},uCutoutSize:{value:params.sizeM},uCutoutEnabled:{value:cutout?1:0},uInnerCutoutSize:{value:0},uInnerCutoutEnabled:{value:0}};}
  const SKIRT_SIZE=120.0,SKIRT_INNER=params.sizeM*.93;
  const globalNearMat=new ShaderMaterial({name:"Laser2FlatGlobalNearV13",vertexShader:flatVertex,fragmentShader:commonFragment,uniforms:sharedUniforms(true),depthWrite:true,depthTest:true,transparent:false});globalNearMat.toneMapped=true;
  const globalFarMat=new ShaderMaterial({name:"Laser2FlatGlobalFarV13",vertexShader:flatVertex,fragmentShader:commonFragment,uniforms:sharedUniforms(false),depthWrite:true,depthTest:true,transparent:false});globalFarMat.toneMapped=true;
  const skirtUniforms=sharedUniforms(false);skirtUniforms.uInnerCutoutSize.value=SKIRT_INNER;skirtUniforms.uInnerCutoutEnabled.value=1;
  const skirtMat=new ShaderMaterial({name:"Laser2FlatSkirtV13",vertexShader:flatVertex,fragmentShader:commonFragment,uniforms:skirtUniforms,depthWrite:true,depthTest:true,transparent:false});skirtMat.toneMapped=true;skirtMat.polygonOffset=true;skirtMat.polygonOffsetFactor=1;skirtMat.polygonOffsetUnits=1;
  water.meshNear.material=globalNearMat;water.meshFar.material=globalFarMat;water.matNear=globalNearMat;water.matFar=globalFarMat;
  const localUniforms=sharedUniforms(false);Object.assign(localUniforms,{uField:{value:fieldTexture},uSize:{value:params.sizeM},uAmp:{value:params.fieldAmplitudeM},uTexel:{value:1/N}});
  const localMat=new ShaderMaterial({name:"Laser2MaterialMemoryWaterV13",vertexShader:localVertex,fragmentShader:commonFragment,uniforms:localUniforms,depthWrite:true,depthTest:true,transparent:false});localMat.toneMapped=true;localMat.polygonOffset=true;localMat.polygonOffsetFactor=-1;localMat.polygonOffsetUnits=-1;
  const geom=new PlaneGeometry(params.sizeM*1.06,params.sizeM*1.06,N-1,N-1);geom.rotateX(-Math.PI/2);
  const localMesh=new MeshCtor(geom,localMat);localMesh.name="Laser2MaterialMemoryPatchV13";localMesh.frustumCulled=false;localMesh.renderOrder=-2;water.meshNear.add(localMesh);
  const skirtGeom=new PlaneGeometry(SKIRT_SIZE,SKIRT_SIZE,1,1);skirtGeom.rotateX(-Math.PI/2);const skirtMesh=new MeshCtor(skirtGeom,skirtMat);skirtMesh.name="Laser2FlatTransitionSkirtV13";skirtMesh.frustumCulled=false;skirtMesh.renderOrder=-1;water.meshNear.add(skirtMesh);

  const originalV4Update=ocean.original.update;
  function enforceFlat(){
    const U=water.uniforms||{},F=water.uniformsFar||{};for(const o of [U,F]){if(o.uWaveCount)o.uWaveCount.value=0;if(o.uMicroCount)o.uMicroCount.value=0;if(o.uHs)o.uHs.value=0;if(o.uTp)o.uTp.value=0;if(o.uWindSpeed)o.uWindSpeed.value=0;if(o.uBoatSpeed)o.uBoatSpeed.value=0;if(o.uSceneOptics)o.uSceneOptics.value=0;}
    water.comp=[];ocean.state.modes=[];ocean.state.micro=[];ocean.state.physicsModes=[];ocean.state.HsM=0;ocean.state.TpS=0;ocean.params.sceneOptics=false;ocean.params.swellHsM=0;ocean.params.chop=0;
  }
  function updatePatch(){
    localMesh.position.set(centerX-water.meshNear.position.x,0.0,centerZ-water.meshNear.position.z);localMat.uniforms.uSize.value=params.sizeM;localMat.uniforms.uAmp.value=params.fieldAmplitudeM;
    skirtMesh.position.set(centerX-water.meshNear.position.x,-.0007,centerZ-water.meshNear.position.z);skirtMat.uniforms.uCutoutCenter.value.set(centerX,0,centerZ);
    globalNearMat.uniforms.uCutoutCenter.value.set(centerX,0,centerZ);globalNearMat.uniforms.uCutoutSize.value=SKIRT_SIZE*.985;globalNearMat.uniforms.uCutoutEnabled.value=params.enabled?1:0;
  }
  water.height=(x,z)=>params.enabled?sample(x,z).eta:0;
  water.velocity=(x,z,out)=>{out.set(0,0,0);if(params.enabled){const q=sample(x,z);out.set(q.ux,q.w,q.uz);}return out};
  water.update=function(t,camera,center){enforceFlat();originalV4Update(t,camera,center);updatePatch();if(state.steps!==lastTextureStep&&state.steps%params.textureStride===0){updateTexture();lastTextureStep=state.steps;}};
  water.setSea=()=>enforceFlat();ocean.rebuildSpectrum=()=>{enforceFlat();return ocean.metrics();};

  function physicsHook(dt){if(!params.enabled)return;accumulator+=dt;const stepDt=1/params.solverHz;let guard=0;while(accumulator>=stepDt&&guard<4){solverStep(stepDt);accumulator-=stepDt;guard++;}}
  master.physics.forceHooks.push(physicsHook);

  function debugKinematicTransit(speedMps=1.5,durationS=2.0,direction=null){
    const dt=1/params.solverHz,steps=Math.max(1,Math.round(durationS/dt));
    reset('debug-kinematic-transit');
    const dir=direction?tmpForward.set(direction.x,0,direction.z):tmpForward.set(0,0,1).applyQuaternion(body.quat);
    dir.y=0;if(dir.lengthSq()<1e-8)dir.set(0,0,1);dir.normalize();
    body.vel.set(0,0,0);body.omega.set(0,0,0);solverStep(dt);
    for(let i=0;i<steps;i++){body.pos.addScaledVector(dir,speedMps*dt);body.vel.copy(dir).multiplyScalar(speedMps);body.omega.set(0,0,0);solverStep(dt);}
    updateTexture();updatePatch();return metrics();
  }
  function debugRecovery(durationS=2.0){
    const dt=1/params.solverHz,steps=Math.max(1,Math.round(durationS/dt));body.vel.set(0,0,0);body.omega.set(0,0,0);
    for(let i=0;i<steps;i++)solverStep(dt);updateTexture();updatePatch();return metrics();
  }

  function metrics(){
    const coverage=queryCount?queryHits/queryCount:0,gl=master.renderer.getContext();return {version:VERSION,enabled:params.enabled,grid:[N,N],sizeM:params.sizeM,dxM:dx,effectiveDepthM:params.effectiveDepthM,solverHz:params.solverHz,steps:state.steps,windowShifts:state.shifts,resets:state.resets,center:[centerX,centerZ],followErrorM:latest.followError,sigmaCentroidOffsetM:latest.sigmaAttachmentError,maxEtaM:latest.maxEta,maxSpeedMps:latest.maxSpeed,maxPressurePotential:latest.maxPressure,maxFoam:latest.maxFoam,maxSigmaM:latest.maxSigma,cfl:latest.cfl,disturbanceVolumeM3:latest.disturbanceVolume,displacedVolumeM3:latest.displacedVolume,wakeEnergy:latest.wakeEnergy,occupiedCells:latest.occupiedCells,wakeDepressionM:latest.wakeDepression,wakeRecoveryLengthM:latest.wakeLength,pressureReachM:latest.pressureReach,transomExposureM:latest.transomExposure,contactBoundaryErrorM:latest.contactError,reactionForceN:lastReactionN,queryCount,queryHits,queryCoverage:coverage,lastStepMs,finite:state.finite&&!gl.isContextLost(),glError:gl.getError(),contextLost:gl.isContextLost(),incidentWaveCount:0,analyticWake:false,authority:"moving world-window material-memory free surface; exact previous/new hull capacity continuity",continuityIdentity:"h_old=H+eta_old-sigma_old; eta_new=h_old-dt*div(h*u)+sigma_new-H",solidAuthority:"registered exact column interval providers; procedural Laser hull active",renderAuthority:"exact hull contact branch + smoothed physical surface; no analytic wake",hydroAuthority:"cut-cell hydraulic head extrapolated from open water; occupied-column display values never drive buoyancy",externalMomentumImpulseNs:externalImpulseNs,externalMomentumEvents,sourceModified:true,lastError:state.lastError};
  }

  function addUI(){
    const lab=document.querySelector('.laser2-lab');if(!lab||document.getElementById('laser2-v13-panel'))return;
    const sec=document.createElement('section');sec.id='laser2-v13-panel';sec.innerHTML=`<h3>V15 · REACTIVE CUT-CELL HULL HEIGHTFIELD</h3><table><tbody>
      <tr><td>continuity</td><td>previous liquid volume + new hull capacity</td></tr><tr><td>window</td><td>${N}² · ${params.sizeM.toFixed(0)} m · follows hull</td></tr>
      <tr><td>pressure</td><td>screened projection from σ̇ / immersed depth</td></tr><tr><td>contact</td><td>exact lower/upper hull interval branch</td></tr>
      <tr><td>state</td><td id="v13-state">initializing</td></tr><tr><td>wake memory</td><td id="v13-wake">—</td></tr><tr><td>attachment</td><td id="v13-attach">—</td></tr></tbody></table>
      <label>projection <input id="v13-proj" type="range" min="0" max="1" step="0.01" value="${params.pressureProjection}"> <span id="v13-proj-v">${params.pressureProjection.toFixed(2)}</span></label>
      <label>render smoothing <input id="v13-smooth" type="range" min="0" max="1" step="0.01" value="${params.renderSmoothing}"> <span id="v13-smooth-v">${params.renderSmoothing.toFixed(2)}</span></label>
      <label>field <select id="v13-debug"><option value="off">off</option><option value="combined">height/foam/pressure</option><option value="pressure">pressure</option><option value="physical">physical eta</option></select></label>
      <button id="v13-reset" style="width:100%">RESET FLAT EQUILIBRIUM</button><canvas id="v13-canvas" width="${N}" height="${N}" style="width:100%;height:auto;margin-top:7px;border:1px solid rgba(255,255,255,.12);image-rendering:pixelated"></canvas>
      <div class="truth">THE WAKE IS NOT GENERATED. IT IS THE WORLD-SPACE TEMPORAL IMAGE LEFT WHEN SIGMA MOVES: LEADING CELLS GAIN SOLID CAPACITY, TRAILING CELLS LOSE IT, AND THE SAME PRESSURE/VELOCITY/ETA STATE RELAXES BACK TO EQUILIBRIUM.</div>`;
    lab.appendChild(sec);
    const bind=(id,key)=>{const e=sec.querySelector('#'+id),v=sec.querySelector('#'+id+'-v');e.oninput=()=>{params[key]=+e.value;v.textContent=params[key].toFixed(2);};};bind('v13-proj','pressureProjection');bind('v13-smooth','renderSmoothing');
    sec.querySelector('#v13-debug').onchange=e=>{params.debugField=e.target.value;localMat.uniforms.uDebug.value=e.target.value==='off'?0:e.target.value==='combined'?1:e.target.value==='pressure'?2:3;};
    sec.querySelector('#v13-reset').onclick=()=>reset('ui');
  }
  function refreshUI(){
    addUI();const m=metrics(),set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set('v13-state',`${m.finite?'FINITE':'FAULT'} · CFL ${m.cfl.toFixed(3)} · ${m.lastStepMs.toFixed(1)} ms`);
    set('v13-wake',`depression ${m.wakeDepressionM.toFixed(3)} m · recovery ${m.wakeRecoveryLengthM.toFixed(1)} m · transom ${m.transomExposureM.toFixed(3)} m`);
    set('v13-attach',`grid ${m.followErrorM.toFixed(3)} m · σ centroid ${m.sigmaCentroidOffsetM.toFixed(3)} m · contact ${m.contactBoundaryErrorM.toFixed(4)} m`);
    const c=document.getElementById('v13-canvas');if(c)c.getContext('2d').drawImage(fieldCanvas,0,0);
    let hud=document.getElementById('laser2-v13-hud');if(!hud){const a=document.querySelector('#laser2-v12-hud')||document.querySelector('.bottom-left');hud=document.createElement('div');hud.id='laser2-v13-hud';hud.className='rig-state';a.after(hud);}hud.textContent=`REACTIVE CUTCELL V15 · η ${m.maxEtaM.toFixed(3)}m · CAVITY ${m.wakeDepressionM.toFixed(3)}m · RECOVERY ${m.wakeRecoveryLengthM.toFixed(1)}m · FOLLOW ${m.followErrorM.toFixed(2)}m`;
  }

  document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`#laser2-heightfield-v5,#laser2-v12-panel,#laser2-h5-hud,#laser2-v12-hud{display:none!important}#laser2-v13-panel{border-top:1px solid rgba(126,231,135,.42)}`}));
  const oldMetrics=window.__labMetrics;window.__labMetrics=function(){const b=typeof oldMetrics==='function'?oldMetrics():{};return {...b,materialMemoryV13:metrics()};};
  window.LASER2_MATERIAL_MEMORY_V13={VERSION,params,state,fields:{eta,displayEta,hydroEta,hydroUx,hydroUz,ux,uz,sigma,sigmaPrev,sigmaDot,block,solidCoverage,pressure:pressureMemory,foam,hullLo,hullHi,hasHull,wetness,branch,submergedDuX,submergedDuZ},metrics,sample,reset,registerSolid,unregisterSolid,createSphereProvider,injectMomentum,solids,debugKinematicTransit,debugRecovery,fieldCanvas,fieldTexture,localMesh,skirtMesh,enforceFlat,receipt:Object.freeze({reference:"Aqua Phase 7 moving solid capacity and release memory",correction:"continuity uses sigma_old for old liquid volume and sigma_new only during reconstruction",window:"integer-conservative world window follows the boat while wake remains in world coordinates",contact:"exact arbitrary vertical solid intervals with lower/upper branch hysteresis",submergedObjects:"equal-and-opposite foil momentum is depth-attenuated and propagated to the surface by the same pressure/continuity solve",analyticWake:false})};
  reset('startup');enforceFlat();updateTexture();updatePatch();
  let lastUI=0;function frame(t){enforceFlat();if(t-lastUI>240){lastUI=t;refreshUI();}requestAnimationFrame(frame)}requestAnimationFrame(frame);
  document.title='Laser 2 — Reactive Cut-Cell Heightfield V15';console.info(VERSION+' initialized',metrics());
})();
