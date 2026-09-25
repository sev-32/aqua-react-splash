(()=>{
  "use strict";
  const VERSION="LASER2_FLAT_REACTIVE_HULL_HEIGHTFIELD_V12_20260713";
  const master=window.LASER2_CREW_RIGGING_MASTER_V2;
  const water=window.LASER2_WATER_INTERNAL;
  const ocean=window.LASER2_OCEAN_V4;
  if(!master?.body||!master?.hydro||!master?.physics||!master?.config||!water||!ocean){
    console.error(VERSION+": required exposed V4 runtime not found");return;
  }
  const G=master.config.env?.g||9.81;
  const RHO=master.config.env?.rhoWater||1025;
  const Vec3=master.body.pos.constructor;
  const ShaderMaterial=water.matNear.constructor;
  const PlaneGeometry=water.meshNear.geometry.constructor;
  const TextureCtor=master.scene.environment?.constructor || water.meshNear.material.uniforms?.uReflectionTex?.value?.constructor;
  if(!TextureCtor){console.error(VERSION+": texture constructor unavailable");return;}

  const params={
    enabled:true,
    gridN:112,
    sizeM:12.0,
    effectiveDepthM:1.0,
    solverHz:60,
    momentumGain:0.28,
    tangentialGain:0.055,
    displacementGain:1.0,
    viscosity:0.020,
    surfaceSmoothing:0.140,
    momentumDamping:0.996,
    boundarySponge:0.075,
    reactionScale:0.004,
    foamGain:0.48,
    foamPersistence:0.940,
    maxEtaM:0.22,
    maxSpeedMps:3.0,
    maxReactionN:420,
    hullColumnSamples:32,
    textureStride:1,
    fieldAmplitudeM:0.65,
    cutoutFeather:0.035,
    debugField:"off"
  };
  const N=params.gridN, NN=N*N;
  const eta=new Float32Array(NN),etaPrev=new Float32Array(NN),etaNext=new Float32Array(NN);
  const ux=new Float32Array(NN),uz=new Float32Array(NN),uxNext=new Float32Array(NN),uzNext=new Float32Array(NN);
  const sigma=new Float32Array(NN),prevSigma=new Float32Array(NN),sigmaDot=new Float32Array(NN),srcField=new Float32Array(NN),block=new Float32Array(NN);
  const solidVx=new Float32Array(NN),solidVz=new Float32Array(NN);
  const contactEvent=new Float32Array(NN),foam=new Float32Array(NN),foamNext=new Float32Array(NN),penetration=new Float32Array(NN);
  const baseHeightCache=new Float32Array(NN),verticalVelocity=new Float32Array(NN);
  const tempA=new Float32Array(NN),tempB=new Float32Array(NN);
  const idx=(x,z)=>z*N+x;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(a,b,x)=>{x=clamp((x-a)/Math.max(1e-8,b-a),0,1);return x*x*(3-2*x)};
  const body=master.body,cfg=master.config;
  const qn={x:0,y:cfg.hull.bodyReferenceY,z:cfg.hull.comZ};
  const tmpWorld=new Vec3(),tmpVel=new Vec3(),tmpForce=new Vec3(),tmpPoint=new Vec3();
  const invQuat=body.quat.clone();
  const baseHeight=(x,z)=>0;
  const baseVelocity=(x,z,out)=>out.set(0,0,0);
  const originalUpdate=water.update.bind(water);
  let dx=params.sizeM/N,originX=0,originZ=0,centerX=0,centerZ=0,initialized=false;
  let accumulator=0,lastTextureFrame=0,lastReactionN=0,queryCount=0,queryHits=0,lastStepMs=0;
  const state={steps:0,shifts:0,resets:0,textureFrames:0,finite:true,lastError:null,lastStepDt:0,lastPoseTime:0,warmStart:true,sourceModified:true};

  function halfWidth(e){let t;if(e<.45)t=lerp(.775,1,Math.pow(smooth(0,1,e/.45),.9));else t=Math.pow(Math.cos((e-.45)/.55*Math.PI/2),1.18);return Math.max(.016,.71*t)}
  function keelY(e){return e<.42?lerp(-.052,-.165,Math.pow(smooth(0,1,e/.42),.8)):lerp(-.165,.155,Math.pow((e-.42)/.58,2.15))}
  function sheerY(e){return .365+.045*e+.14*e*e*e}
  function sectionPower(e){return e<.45?lerp(3.4,2.5,e/.45):lerp(2.5,1.5,smooth(0,1,(e-.45)/.55))}
  function cockpit(x,z){const e=clamp((z+2.2)/4.4,0,1),i=halfWidth(e)-.175;return (1-smooth(0,1,(Math.abs(x)-(i-.07))/.09))*smooth(0,1,(z+1.78)/.1)*(1-smooth(0,1,(z-.3)/.1))}
  function deckY(x,z){const e=clamp((z+2.2)/4.4,0,1),w=halfWidth(e),s=sheerY(e),n=.045*(1-Math.pow(Math.min(Math.abs(x)/Math.max(w,.01),1),2));return lerp(s+n,.155,cockpit(x,z))}
  function normalizedSectionX(x,w){
    let t=clamp(Math.abs(x)/Math.max(w,1e-6),0,1.15);
    for(let k=0;k<4;k++){
      const t2=t*t,t4=t2*t2,t6=t4*t2;
      const f=w*t*(1+.05*t6)-Math.abs(x);
      const df=w*(1+.35*t6);
      t=clamp(t-f/Math.max(df,1e-6),0,1.05);
    }
    return t;
  }
  function insideHullLocal(x,y,z){
    const e=(z+2.2)/4.4;if(e<0||e>1)return false;
    const w=halfWidth(e),t=normalizedSectionX(x,w);if(t>1.001)return false;
    const bottom=keelY(e)+(sheerY(e)-keelY(e))*Math.pow(Math.abs(t),sectionPower(e));
    const top=deckY(x,z);
    return y>=bottom&&y<=top;
  }
  function inverseQuaternionCoefficients(){
    invQuat.copy(body.quat).invert();
    const x=invQuat.x,y=invQuat.y,z=invQuat.z,w=invQuat.w;
    const x2=x+x,y2=y+y,z2=z+z;
    const xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2;
    return [1-(yy+zz),xy-wz,xz+wy, xy+wz,1-(xx+zz),yz-wx, xz-wy,yz+wx,1-(xx+yy)];
  }
  function worldLineCoefficients(wx,wz,R){
    const bx=wx-body.pos.x,bz=wz-body.pos.z,by0=-body.pos.y;
    return {
      ax:R[1],ay:R[4],az:R[7],
      bx:R[0]*bx+R[1]*by0+R[2]*bz+qn.x,
      by:R[3]*bx+R[4]*by0+R[5]*bz+qn.y,
      bz:R[6]*bx+R[7]*by0+R[8]*bz+qn.z
    };
  }
  function insideLineAt(c,y){return insideHullLocal(c.bx+c.ax*y,c.by+c.ay*y,c.bz+c.az*y)}
  function columnOccupancy(wx,wz,surface,R){
    const radius=2.75;
    if((wx-body.pos.x)*(wx-body.pos.x)+(wz-body.pos.z)*(wz-body.pos.z)>radius*radius)return 0;
    const c=worldLineCoefficients(wx,wz,R);
    const y0=body.pos.y-1.22,y1=Math.min(surface,body.pos.y+1.28);
    if(y1<=y0)return 0;
    const S=params.hullColumnSamples,dy=(y1-y0)/S;
    let sum=0,prev=insideLineAt(c,y0);
    for(let s=1;s<=S;s++){
      const y=y0+s*dy,cur=insideLineAt(c,y);
      if(prev&&cur)sum+=dy;else if(prev||cur)sum+=dy*.5;
      prev=cur;
    }
    return Math.min(1.1,sum);
  }

  function reset(reason="manual"){
    for(const a of [eta,etaPrev,etaNext,ux,uz,uxNext,uzNext,sigma,prevSigma,sigmaDot,srcField,block,solidVx,solidVz,contactEvent,foam,foamNext,penetration,baseHeightCache,verticalVelocity,tempA,tempB])a.fill(0);
    centerX=Math.round(body.pos.x/dx)*dx;centerZ=Math.round(body.pos.z/dx)*dx;originX=centerX-params.sizeM*.5;originZ=centerZ-params.sizeM*.5;
    initialized=true;state.resets++;state.lastResetReason=reason;accumulator=0;
  }
  function shiftArray(a,sx,sz,fill=0){
    tempA.fill(fill);
    for(let z=0;z<N;z++){
      const oz=z+sz;if(oz<0||oz>=N)continue;
      for(let x=0;x<N;x++){
        const ox=x+sx;if(ox<0||ox>=N)continue;
        tempA[idx(x,z)]=a[idx(ox,oz)];
      }
    }
    a.set(tempA);
  }
  function shiftWindow(){
    if(!initialized){reset("initialize");return;}
    const nx=Math.round(body.pos.x/dx)*dx,nz=Math.round(body.pos.z/dx)*dx;
    const sx=Math.round((nx-centerX)/dx),sz=Math.round((nz-centerZ)/dx);
    if(sx===0&&sz===0)return;
    if(Math.abs(sx)>N/3||Math.abs(sz)>N/3){reset("large-window-shift");return;}
    for(const a of [eta,etaPrev,ux,uz,sigma,prevSigma,sigmaDot,srcField,block,solidVx,solidVz,contactEvent,foam,penetration,verticalVelocity])shiftArray(a,sx,sz,0);
    centerX=nx;centerZ=nz;originX=centerX-params.sizeM*.5;originZ=centerZ-params.sizeM*.5;state.shifts++;
  }
  function bilerp(a,wx,wz){
    const gx=(wx-originX)/dx-.5,gz=(wz-originZ)/dx-.5;
    if(gx<0||gz<0||gx>N-1||gz>N-1)return 0;
    const x0=Math.floor(gx),z0=Math.floor(gz),x1=Math.min(N-1,x0+1),z1=Math.min(N-1,z0+1),tx=gx-x0,tz=gz-z0;
    return lerp(lerp(a[idx(x0,z0)],a[idx(x1,z0)],tx),lerp(a[idx(x0,z1)],a[idx(x1,z1)],tx),tz);
  }
  function sampleLocal(wx,wz){
    queryCount++;
    const gx=(wx-originX)/dx-.5,gz=(wz-originZ)/dx-.5;
    if(gx<0||gz<0||gx>N-1||gz>N-1)return {eta:0,ux:0,uz:0,w:0,foam:0,sigma:0,inside:false};
    queryHits++;
    return {eta:bilerp(eta,wx,wz),ux:bilerp(ux,wx,wz),uz:bilerp(uz,wx,wz),w:bilerp(verticalVelocity,wx,wz),foam:bilerp(foam,wx,wz),sigma:bilerp(sigma,wx,wz),inside:true};
  }

  function updateOccupancy(dt){
    prevSigma.set(sigma);sigma.fill(0);sigmaDot.fill(0);srcField.fill(0);penetration.fill(0);block.fill(0);solidVx.fill(0);solidVz.fill(0);tempB.fill(0);
    const R=inverseQuaternionCoefficients();
    const localBaseVel=new Vec3();
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),wx=originX+(x+.5)*dx,wz=originZ+(z+.5)*dx;
      if((wx-body.pos.x)*(wx-body.pos.x)+(wz-body.pos.z)*(wz-body.pos.z)>8.2)continue;
      const bh=baseHeight(wx,wz);baseHeightCache[i]=bh;
      const surface=bh+eta[i];
      const sig=columnOccupancy(wx,wz,surface,R);
      sigma[i]=sig;block[i]=smooth(.018,.145,sig);
      tmpPoint.set(wx,surface,wz);body.worldPointVelocity(tmpPoint,tmpVel);solidVx[i]=tmpVel.x;solidVz[i]=tmpVel.z;
      const ds=clamp(sig-prevSigma[i],-.09,.09);
      sigmaDot[i]=ds/Math.max(dt,1e-5);srcField[i]=ds;penetration[i]=insideLineAt(worldLineCoefficients(wx,wz,R),surface)?Math.min(sig,.25):0;
      tempB[i]=ds*params.displacementGain;
    }
    if(state.warmStart){
      let displaced=0,openArea=0;for(let i=0;i<NN;i++){displaced+=sigma[i]*dx*dx;if(block[i]<.55)openArea+=dx*dx;}
      const level=displaced/Math.max(openArea,1e-6);for(let i=0;i<NN;i++){prevSigma[i]=sigma[i];sigmaDot[i]=0;srcField[i]=0;tempB[i]=0;if(block[i]<.55)eta[i]=level;}
      state.warmStart=false;
    }
    // Project moving-solid capacity onto surrounding liquid cells. The free surface is
    // undefined inside a blocked hull column, so displaced volume must not accumulate there.
    const cardinal=[-1,1,-N,N],spread=[];
    for(let dz=-2;dz<=2;dz++)for(let dxo=-2;dxo<=2;dxo++){if(dxo===0&&dz===0)continue;const r2=dxo*dxo+dz*dz;spread.push({o:dz*N+dxo,g:Math.exp(-.48*r2)});}
    for(let z=3;z<N-3;z++)for(let x=3;x<N-3;x++){
      const i=idx(x,z),ds=tempB[i];if(Math.abs(ds)<1e-7)continue;
      let ws=0;for(const q of spread)ws+=q.g*(.035+1-block[i+q.o]);
      for(const q of spread){const j=i+q.o,w=q.g*(.035+1-block[j])/Math.max(ws,1e-6);eta[j]=clamp(eta[j]+ds*w,-params.maxEtaM,params.maxEtaM);}
    }
    // Keep masked cells pressure-continuous with the surrounding surface instead of storing a spike.
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){const i=idx(x,z);if(block[i]<.55)continue;let s=0,w=0;for(const o of cardinal){const j=i+o,open=1-block[j];s+=eta[j]*open;w+=open;}if(w>.05)eta[i]=lerp(eta[i],s/w,.88*block[i]);}
  }

  function pressureMomentumStep(dt){
    let impulseX=0,impulseZ=0,maxContact=0;
    const inv2dx=.5/dx,invDx2=1/(dx*dx),H=params.effectiveDepthM;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),im=idx(x-1,z),ip=idx(x+1,z),jm=idx(x,z-1),jp=idx(x,z+1);
      const bxm=block[im],bxp=block[ip],bzm=block[jm],bzp=block[jp];
      const eL=bxm>.72?eta[i]:eta[im],eR=bxp>.72?eta[i]:eta[ip],eD=bzm>.72?eta[i]:eta[jm],eU=bzp>.72?eta[i]:eta[jp];
      const gx=(eR-eL)*inv2dx,gz=(eU-eD)*inv2dx;
      const u=ux[i],v=uz[i];
      const dudx=u>=0?(u-ux[im])/dx:(ux[ip]-u)/dx;
      const dudz=v>=0?(u-ux[jm])/dx:(ux[jp]-u)/dx;
      const dvdx=u>=0?(v-uz[im])/dx:(uz[ip]-v)/dx;
      const dvdz=v>=0?(v-uz[jm])/dx:(uz[jp]-v)/dx;
      const lapU=(ux[im]+ux[ip]+ux[jm]+ux[jp]-4*u)*invDx2;
      const lapV=(uz[im]+uz[ip]+uz[jm]+uz[jp]-4*v)*invDx2;
      let nu=u+dt*(-G*gx-u*dudx-v*dudz+params.viscosity*lapU);
      let nv=v+dt*(-G*gz-u*dvdx-v*dvdz+params.viscosity*lapV);
      const ds=sigma[i]-prevSigma[i];
      const gsx=(sigma[ip]-sigma[im])*inv2dx,gsz=(sigma[jp]-sigma[jm])*inv2dx,gsm=Math.hypot(gsx,gsz);
      let nx=0,nz=0;
      if(gsm>1e-5){nx=-gsx/gsm;nz=-gsz/gsm;}else{const wx=originX+(x+.5)*dx,wz=originZ+(z+.5)*dx;nx=wx-body.pos.x;nz=wz-body.pos.z;const nl=Math.hypot(nx,nz)||1;nx/=nl;nz/=nl;}
      const b=block[i],event=clamp(Math.abs(ds)/(dx*.45)+gsm*1.45+b*.14,0,1.25);
      if(event>1e-4){
        baseVelocity(originX+(x+.5)*dx,originZ+(z+.5)*dx,tmpVel);
        const baseVx=tmpVel.x,baseVz=tmpVel.z;
        const relX=solidVx[i]-(baseVx+nu),relZ=solidVz[i]-(baseVz+nv);
        const relN=relX*nx+relZ*nz,relT=-relX*nz+relZ*nx;
        const normalGain=relN>=0?params.momentumGain:params.momentumGain*.54;
        const du=nx*relN*event*normalGain-nz*relT*event*params.tangentialGain;
        const dv=nz*relN*event*normalGain+nx*relT*event*params.tangentialGain;
        const h=Math.max(.03,H+eta[i]-sigma[i]);
        impulseX+=(du*h)*RHO*dx*dx;impulseZ+=(dv*h)*RHO*dx*dx;
        nu+=du;nv+=dv;
        contactEvent[i]=Math.max(contactEvent[i]*Math.exp(-dt*4.8),event*clamp(Math.abs(relN)*.36+.18,0,1.4));
        maxContact=Math.max(maxContact,contactEvent[i]);
      }else contactEvent[i]*=Math.exp(-dt*5.2);
      const blockDamp=1-b*.88;
      uxNext[i]=clamp(nu*params.momentumDamping*blockDamp,-params.maxSpeedMps,params.maxSpeedMps);
      uzNext[i]=clamp(nv*params.momentumDamping*blockDamp,-params.maxSpeedMps,params.maxSpeedMps);
    }
    ux.set(uxNext);uz.set(uzNext);
    const forceScale=params.reactionScale/Math.max(dt,1e-5);
    tmpForce.set(-impulseX*forceScale,0,-impulseZ*forceScale);
    lastReactionN=tmpForce.length();
    if(lastReactionN>params.maxReactionN){tmpForce.multiplyScalar(params.maxReactionN/Math.max(lastReactionN,1e-6));lastReactionN=params.maxReactionN;}
    if(params.reactionScale>0&&Number.isFinite(lastReactionN))body.addForceAt(tmpForce,body.pos);
    return maxContact;
  }

  function continuityFoamStep(dt){
    const H=params.effectiveDepthM,invDx=1/dx;
    etaNext.set(eta);foamNext.set(foam);
    let maxEta=0,maxSpeed=0,maxFoam=0,maxSigma=0,volume=0,sigmaVolume=0,wakeEnergy=0,occCells=0,activeCells=0;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),im=idx(x-1,z),ip=idx(x+1,z),jm=idx(x,z-1),jp=idx(x,z+1);
      const hi=Math.max(.025,H+eta[i]-sigma[i]);
      const hL=Math.max(.025,H+eta[im]-sigma[im]),hR=Math.max(.025,H+eta[ip]-sigma[ip]);
      const hD=Math.max(.025,H+eta[jm]-sigma[jm]),hU=Math.max(.025,H+eta[jp]-sigma[jp]);
      let uR=.5*(ux[i]+ux[ip])*(1-Math.max(block[i],block[ip]));
      let uL=.5*(ux[im]+ux[i])*(1-Math.max(block[im],block[i]));
      let vU=.5*(uz[i]+uz[jp])*(1-Math.max(block[i],block[jp]));
      let vD=.5*(uz[jm]+uz[i])*(1-Math.max(block[jm],block[i]));
      const fxR=uR>=0?hi*uR:hR*uR,fxL=uL>=0?hL*uL:hi*uL;
      const fzU=vU>=0?hi*vU:hU*vU,fzD=vD>=0?hD*vD:hi*vD;
      let hn=hi-dt*invDx*((fxR-fxL)+(fzU-fzD));
      hn=Math.max(.018,hn);
      let en=clamp(hn+sigma[i]-H,-params.maxEtaM,params.maxEtaM);
      const edge=Math.min(x,z,N-1-x,N-1-z),sponge=1-smooth(0,N*.115,edge);
      const sd=clamp(params.boundarySponge*sponge,0,.35);
      en*=1-sd;ux[i]*=1-sd*.8;uz[i]*=1-sd*.8;
      etaNext[i]=en;
      const div=((ux[ip]-ux[im])+(uz[jp]-uz[jm]))*.5*invDx;
      const compression=Math.max(0,-div);
      const ds=Math.abs(sigma[i]-prevSigma[i]);
      const generation=params.foamGain*clamp(compression*.20+contactEvent[i]*.48+ds*5.5+Math.max(0,en)*.08,0,1.6);
      const backX=originX+(x+.5)*dx-ux[i]*dt,backZ=originZ+(z+.5)*dx-uz[i]*dt;
      const advected=bilerp(foam,backX,backZ);
      let fn=clamp(advected*params.foamPersistence+generation*dt,0,1);
      fn*=1-sd*.38;foamNext[i]=fn;
      maxEta=Math.max(maxEta,Math.abs(en));const sp=Math.hypot(ux[i],uz[i]);maxSpeed=Math.max(maxSpeed,sp);maxFoam=Math.max(maxFoam,fn);maxSigma=Math.max(maxSigma,sigma[i]);
      volume+=en*dx*dx;sigmaVolume+=sigma[i]*dx*dx;activeCells++;wakeEnergy+=(en*en+.025*sp*sp)*dx*dx;if(sigma[i]>.012)occCells++;
    }
    // Conservative free-surface regularization: suppress cell-scale sawtooth modes while
    // retaining the long bow/stern wave and the integrated displaced volume.
    tempA.set(etaNext);
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=idx(x,z),avg=.25*(tempA[i-1]+tempA[i+1]+tempA[i-N]+tempA[i+N]);
      const k=params.surfaceSmoothing*(1-.72*block[i]);
      etaNext[i]=clamp(tempA[i]+(avg-tempA[i])*k,-params.maxEtaM,params.maxEtaM);
    }
    volume=0;maxEta=0;wakeEnergy=0;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){const i=idx(x,z),en=etaNext[i],sp=Math.hypot(ux[i],uz[i]);volume+=en*dx*dx;maxEta=Math.max(maxEta,Math.abs(en));wakeEnergy+=(en*en+.025*sp*sp)*dx*dx;}
    // Enforce the cut-cell liquid-volume identity integral(eta)=integral(sigma).
    // This removes source drift while preserving the spatial wake solution.
    const correction=clamp((sigmaVolume-volume)/Math.max(activeCells*dx*dx,1e-6),-.006,.006);
    if(Math.abs(correction)>1e-8){for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++)etaNext[idx(x,z)]=clamp(etaNext[idx(x,z)]+correction,-params.maxEtaM,params.maxEtaM);volume+=correction*activeCells*dx*dx;}
    etaPrev.set(eta);eta.set(etaNext);foam.set(foamNext);
    for(let i=0;i<NN;i++)verticalVelocity[i]=(eta[i]-etaPrev[i])/Math.max(dt,1e-5);
    return {maxEta,maxSpeed,maxFoam,maxSigma,volume,wakeEnergy,occCells,cfl:maxSpeed*dt/dx};
  }

  let latest={maxEta:0,maxSpeed:0,maxFoam:0,maxSigma:0,volume:0,wakeEnergy:0,occCells:0,cfl:0,maxContact:0,displacedVolume:0};
  function solverStep(dt){
    if(!params.enabled)return;
    const t0=performance.now();state.lastStepDt=dt;shiftWindow();
    updateOccupancy(dt);
    const maxContact=pressureMomentumStep(dt);
    latest=continuityFoamStep(dt);latest.maxContact=maxContact;
    let displaced=0;for(let i=0;i<NN;i++)displaced+=sigma[i]*dx*dx;latest.displacedVolume=displaced;
    state.steps++;lastStepMs=performance.now()-t0;
    state.finite=[latest.maxEta,latest.maxSpeed,latest.maxFoam,latest.maxSigma,latest.volume,latest.wakeEnergy,lastReactionN].every(Number.isFinite);
    if(!state.finite){state.lastError="non-finite field state";reset("non-finite");}
  }

  const fieldCanvas=document.createElement('canvas');fieldCanvas.width=N;fieldCanvas.height=N;
  const fieldCtx=fieldCanvas.getContext('2d',{willReadFrequently:false}),fieldImage=fieldCtx.createImageData(N,N),fieldPixels=fieldImage.data;
  const fieldTexture=new TextureCtor(fieldCanvas);fieldTexture.flipY=false;fieldTexture.generateMipmaps=false;fieldTexture.minFilter=1006;fieldTexture.magFilter=1006;fieldTexture.wrapS=1001;fieldTexture.wrapT=1001;fieldTexture.unpackAlignment=1;fieldTexture.needsUpdate=true;
  function updateFieldTexture(){
    const amp=params.fieldAmplitudeM;
    for(let z=0;z<N;z++)for(let x=0;x<N;x++){
      const i=idx(x,z),p=((N-1-z)*N+x)*4;
      const xm=Math.max(0,x-1),xp=Math.min(N-1,x+1),zm=Math.max(0,z-1),zp=Math.min(N-1,z+1);
      const renderEta=(eta[i]*4+(eta[idx(xm,z)]+eta[idx(xp,z)]+eta[idx(x,zm)]+eta[idx(x,zp)])*2+eta[idx(xm,zm)]+eta[idx(xp,zm)]+eta[idx(xm,zp)]+eta[idx(xp,zp)])/16;
      const renderFoam=(foam[i]*4+(foam[idx(xm,z)]+foam[idx(xp,z)]+foam[idx(x,zm)]+foam[idx(x,zp)])*2+foam[idx(xm,zm)]+foam[idx(xp,zm)]+foam[idx(xm,zp)]+foam[idx(xp,zp)])/16;
      fieldPixels[p]=Math.round(clamp(.5+.5*renderEta/amp,0,1)*255);
      fieldPixels[p+1]=Math.round(clamp(renderFoam,0,1)*255);
      fieldPixels[p+2]=Math.round(clamp(Math.max(Math.hypot(ux[i],uz[i])/params.maxSpeedMps,block[i]),0,1)*255);
      fieldPixels[p+3]=255;
    }
    fieldCtx.putImageData(fieldImage,0,0);fieldTexture.needsUpdate=true;state.textureFrames++;
  }

  function patchLocalShaders(){
    const baseVS=water.matNear.vertexShader,baseFS=water.matNear.fragmentShader;
    if(!baseVS.includes('vec3 base=(modelMatrix*vec4(position,1.0)).xyz;'))throw new Error('V4 vertex shader marker missing');
    const localDecl=`\n      uniform sampler2D uLocalField;\n      uniform vec2 uLocalCenter;\n      uniform float uLocalSize;\n      uniform float uLocalTexel;\n      uniform float uLocalAmplitude;\n      uniform float uLocalEnabled;\n      varying vec4 vLocalField;\n      float localMask(vec2 uv){float e=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));return smoothstep(0.0,0.035,e)*step(0.0,uv.x)*step(uv.x,1.0)*step(0.0,uv.y)*step(uv.y,1.0);}\n      vec4 localSample(vec2 worldXZ){vec2 uv=(worldXZ-(uLocalCenter-vec2(uLocalSize*.5)))/uLocalSize;return texture2D(uLocalField,clamp(uv,vec2(.001),vec2(.999)))*localMask(uv)*uLocalEnabled;}\n    `;
    let vs=baseVS.replace('uniform mat4 uMainVP;','uniform mat4 uMainVP;'+localDecl);
    vs=vs.replace('      vec3 N=normalize(cross(dPz,dPx));',`      vec4 lf=localSample(base.xz);\n      float localEta=(lf.r*2.0-1.0)*uLocalAmplitude*localMask((base.xz-(uLocalCenter-vec2(uLocalSize*.5)))/uLocalSize)*uLocalEnabled;\n      vec2 luv=(base.xz-(uLocalCenter-vec2(uLocalSize*.5)))/uLocalSize;\n      float eL=(texture2D(uLocalField,clamp(luv-vec2(uLocalTexel,0.0),vec2(.001),vec2(.999))).r*2.0-1.0)*uLocalAmplitude;\n      float eR=(texture2D(uLocalField,clamp(luv+vec2(uLocalTexel,0.0),vec2(.001),vec2(.999))).r*2.0-1.0)*uLocalAmplitude;\n      float eD=(texture2D(uLocalField,clamp(luv-vec2(0.0,uLocalTexel),vec2(.001),vec2(.999))).r*2.0-1.0)*uLocalAmplitude;\n      float eU=(texture2D(uLocalField,clamp(luv+vec2(0.0,uLocalTexel),vec2(.001),vec2(.999))).r*2.0-1.0)*uLocalAmplitude;\n      float lm=localMask(luv)*uLocalEnabled;\n      P.y+=localEta;dPx.y+=(eR-eL)/(2.0*uLocalTexel*uLocalSize)*lm;dPz.y+=(eU-eD)/(2.0*uLocalTexel*uLocalSize)*lm;\n      vLocalField=lf;\n      vec3 N=normalize(cross(dPz,dPx));`);
    let fs=`
    precision highp float;
    #define MICRO_COUNT 10
    uniform vec4 uMicroA[MICRO_COUNT];
    uniform vec4 uMicroB[MICRO_COUNT];
    uniform int uMicroCount;
    uniform float uTime;
    uniform vec3 uSunDir;
    uniform vec3 uCamPos;
    uniform float uHs;
    uniform float uTp;
    uniform float uWindSpeed;
    uniform float uIor;
    uniform float uClarity;
    uniform vec3 uAbsorption;
    uniform vec3 uScatterColor;
    uniform vec3 uBoatPos;
    uniform vec3 uBoatForward;
    uniform float uBoatSpeed;
    uniform float uFar;
    uniform float uSceneOptics;
    uniform sampler2D uReflectionTex;
    uniform sampler2D uRefractionTex;
    uniform float uLocalDebug;
    varying vec3 vWorld;
    varying vec3 vNormalW;
    varying float vJacobian;
    varying float vHeight;
    varying vec4 vReflectionClip;
    varying vec4 vMainClip;
    varying vec4 vLocalField;
    const float PI=3.141592653589793;
    float sat(float x){return clamp(x,0.0,1.0);}
    vec3 sky(vec3 d){
      float h=sat(d.y*.5+.5);
      vec3 horizon=vec3(.74,.84,.91),zenith=vec3(.18,.43,.68);
      vec3 c=mix(horizon,zenith,pow(h,.62));
      float sun=max(dot(d,normalize(uSunDir)),0.0);
      c+=vec3(1.0,.84,.62)*(pow(sun,5200.0)*7.0+pow(sun,96.0)*.13);
      return c;
    }
    float fresnelDielectric(float c){float r0=(1.0-uIor)/(1.0+uIor);r0*=r0;return r0+(1.0-r0)*pow(1.0-sat(c),5.0);}
    float ggxD(float ndh,float a){float a2=a*a;float d=ndh*ndh*(a2-1.0)+1.0;return a2/max(PI*d*d,1e-6);}
    float smithG1(float nd,float a){float k=(a+1.0)*(a+1.0)/8.0;return nd/max(nd*(1.0-k)+k,1e-5);}
    vec2 projectedUV(vec4 c){return c.xy/max(c.w,1e-5)*.5+.5;}
    float edgeMask(vec2 uv){float e=min(min(uv.x,1.0-uv.x),min(uv.y,1.0-uv.y));return smoothstep(.008,.055,e);}
    void main(){
      vec3 V=normalize(uCamPos-vWorld);
      vec2 microSlope=vec2(0.0);
      for(int i=0;i<MICRO_COUNT;i++){
        if(i>=uMicroCount)break;
        vec4 A=uMicroA[i],B=uMicroB[i];
        float ph=A.z*dot(A.xy,vWorld.xz)-A.w*uTime+B.y;
        float fp=max(fwidth(ph),1e-5),aa=1.0-smoothstep(.72,1.9,fp);
        microSlope+=A.xy*(B.x*cos(ph)*aa);
      }
      float localSpeed=vLocalField.b;
      vec3 N=normalize(vNormalW+vec3(-microSlope.x*.62,0.0,-microSlope.y*.62));
      if(dot(N,V)<0.0)N=-N;
      float ndv=max(dot(N,V),.001),F=fresnelDielectric(ndv);
      float rough=clamp(.05+.0062*uWindSpeed+localSpeed*.038,.058,.23);
      vec3 R=reflect(-V,N),reflected=sky(R);
      vec2 reflUV=projectedUV(vReflectionClip),refrUV=projectedUV(vMainClip);
      vec2 distortion=N.xz*(.035+min(.024,uHs*.022));
      reflUV+=vec2(distortion.x,-distortion.y);refrUV-=distortion*.34;
      float rb=edgeMask(reflUV),tb=edgeMask(refrUV);
      vec2 rs=clamp(reflUV,.002,.998),axis=normalize(uMicroA[0].xy+vec2(1e-5,0.0)),perp=vec2(-axis.y,axis.x);
      float br=.0012+rough*.008;
      vec3 sceneRefl=texture2D(uReflectionTex,rs).rgb*.46;
      sceneRefl+=texture2D(uReflectionTex,clamp(rs+axis*br,.002,.998)).rgb*.18;
      sceneRefl+=texture2D(uReflectionTex,clamp(rs-axis*br,.002,.998)).rgb*.18;
      sceneRefl+=texture2D(uReflectionTex,clamp(rs+perp*br*.7,.002,.998)).rgb*.09;
      sceneRefl+=texture2D(uReflectionTex,clamp(rs-perp*br*.7,.002,.998)).rgb*.09;
      reflected=mix(reflected,sceneRefl,rb*uSceneOptics*.88);

      float localEta=(vLocalField.r*2.0-1.0);
      vec3 deep=vec3(.006,.052,.078),mid=vec3(.012,.105,.142),shallow=vec3(.024,.19,.235);
      vec3 body=mix(deep,mid,sat(.58+localEta*.32));
      body=mix(body,shallow,sat(.24+vHeight*.75)*(.30+.45*uClarity));
      float path=mix(8.5,2.2,1.0-uClarity)/max(ndv,.16);
      vec3 trans=exp(-uAbsorption*path);
      vec3 sceneRefr=texture2D(uRefractionTex,clamp(refrUV,.002,.998)).rgb;
      float nearBoat=exp(-length(vWorld.xz-uBoatPos.xz)*.38)*tb*uSceneOptics;
      vec3 transmitted=sceneRefr*trans+uScatterColor*(1.0-trans);
      body=mix(body,transmitted,nearBoat*.38);

      vec3 L=normalize(uSunDir),H=normalize(L+V);
      float ndl=max(dot(N,L),0.0),ndh=max(dot(N,H),0.0);
      float spec=ggxD(ndh,rough)*smithG1(ndv,rough)*smithG1(max(ndl,.001),rough)*fresnelDielectric(max(dot(V,H),0.0))/max(4.0*ndv*max(ndl,.001),1e-4);
      vec3 sunGlitter=vec3(1.0,.89,.72)*spec*ndl*2.7;
      float compression=1.0-smoothstep(.10,.70,vJacobian);
      float crest=smoothstep(max(.018,uHs*.025),max(.09,uHs*.36),vHeight);
      float breaking=compression*crest;
      vec2 forward=normalize(uBoatForward.xz+vec2(1e-6,0.0)),right=vec2(forward.y,-forward.x),rel=vWorld.xz-uBoatPos.xz;
      float aft=-dot(rel,forward),lat=dot(rel,right),wakeOn=step(0.0,aft)*smoothstep(1.0,4.0,uBoatSpeed);
      float wedge=abs(abs(lat)-aft*.352),arms=exp(-wedge*wedge/max(.14,.045*aft+.09)),churn=exp(-lat*lat/.36)*exp(-aft/14.0);
      float analyticWake=wakeOn*exp(-aft/38.0)*max(arms*.35,churn*.25);
      float foam=sat(breaking*.64+analyticWake+vLocalField.g*1.08);
      float foamDetail=.73+.27*sin(13.0*vWorld.x+9.0*vWorld.z-uTime*1.7)*sin(8.0*vWorld.z-uTime*.9);
      foam*=foamDetail;
      vec3 col=mix(body,reflected,F);
      col+=sunGlitter;
      col=mix(col,vec3(.91,.96,.98),foam*(.78+.16*F));
      float dist=length(vWorld.xz-uCamPos.xz),haze=1.0-exp(-dist*.00072);
      col=mix(col,vec3(.74,.83,.90),haze);
      if(uLocalDebug>.5){vec3 dbg=uLocalDebug<1.5?vec3(vLocalField.r,vLocalField.g,vLocalField.b):(uLocalDebug<2.5?vec3(vLocalField.g):vec3(vLocalField.b));col=mix(col,dbg,.82);}
      gl_FragColor=vec4(max(col,vec3(0.0)),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
    `;
    return {vs,fs};
  }
  function patchBackgroundCutout(){
    const mat=water.matNear;if(mat.fragmentShader.includes('uLocalCutoutSize'))return;
    mat.uniforms.uLocalCutoutCenter={value:new Vec3()};mat.uniforms.uLocalCutoutSize={value:params.sizeM};mat.uniforms.uLocalCutoutEnabled={value:1};
    mat.fragmentShader=mat.fragmentShader.replace('uniform sampler2D uRefractionTex;','uniform sampler2D uRefractionTex;\n    uniform vec3 uLocalCutoutCenter;\n    uniform float uLocalCutoutSize;\n    uniform float uLocalCutoutEnabled;');
    mat.fragmentShader=mat.fragmentShader.replace('    void main(){','    void main(){\n      vec2 cuv=(vWorld.xz-(uLocalCutoutCenter.xz-vec2(uLocalCutoutSize*.5)))/uLocalCutoutSize;\n      float ce=min(min(cuv.x,1.0-cuv.x),min(cuv.y,1.0-cuv.y));\n      if(uLocalCutoutEnabled>.5 && ce>-.012 && cuv.x>-.012 && cuv.x<1.012 && cuv.y>-.012 && cuv.y<1.012) discard;');
    mat.needsUpdate=true;
  }

  let localMesh=null,localMat=null;
  function createLocalPatch(){
    patchBackgroundCutout();
    const {vs,fs}=patchLocalShaders();
    const uniforms={};
    for(const [k,v] of Object.entries(water.matNear.uniforms))uniforms[k]=v;
    uniforms.uLocalField={value:fieldTexture};uniforms.uLocalCenter={value:new Vec3()};uniforms.uLocalSize={value:params.sizeM};uniforms.uLocalTexel={value:1/N};uniforms.uLocalAmplitude={value:params.fieldAmplitudeM};uniforms.uLocalEnabled={value:1};uniforms.uLocalDebug={value:0};
    localMat=new ShaderMaterial({name:"Laser2CoupledHeightfieldLocalV5",vertexShader:vs,fragmentShader:fs,uniforms,depthWrite:true,depthTest:true,transparent:false});
    localMat.toneMapped=true;
    const geom=new PlaneGeometry(params.sizeM*1.04,params.sizeM*1.04,N-1,N-1);geom.rotateX(-Math.PI/2);
    const MeshCtor=water.meshNear.constructor;
    localMesh=new MeshCtor(geom,localMat);localMesh.name="Laser2CoupledHeightfieldPatchV5";localMesh.frustumCulled=false;localMesh.renderOrder=-1;
    water.meshNear.add(localMesh);
  }
  createLocalPatch();

  function updatePatchTransform(){
    if(!localMesh)return;
    localMesh.position.set(centerX-water.meshNear.position.x,.006,centerZ-water.meshNear.position.z);
    localMat.uniforms.uLocalCenter.value.set(centerX,0,centerZ);
    localMat.uniforms.uLocalSize.value=params.sizeM;localMat.uniforms.uLocalAmplitude.value=params.fieldAmplitudeM;
    water.matNear.uniforms.uLocalCutoutCenter.value.set(centerX,0,centerZ);water.matNear.uniforms.uLocalCutoutSize.value=params.sizeM*.985;
  }

  water.height=function(x,z){return params.enabled?sampleLocal(x,z).eta:0};
  water.velocity=function(x,z,out){out.set(0,0,0);if(params.enabled){const q=sampleLocal(x,z);out.x=q.ux;out.y=q.w;out.z=q.uz;}return out};
  water.update=function(t,camera,center){originalUpdate(t,camera,center);updatePatchTransform();if((state.steps-lastTextureFrame)>=params.textureStride){updateFieldTexture();lastTextureFrame=state.steps;}};

  function physicsHook(subdt){
    if(!params.enabled)return;
    accumulator+=subdt;
    const stepDt=1/params.solverHz;
    let guard=0;
    while(accumulator>=stepDt&&guard<3){solverStep(stepDt);accumulator-=stepDt;guard++;}
  }
  master.physics.forceHooks.push(physicsHook);

  function metrics(){
    const bodySpeed=body.vel.length();
    const coverage=queryCount?queryHits/queryCount:0;
    return {version:VERSION,enabled:params.enabled,grid:[N,N],sizeM:params.sizeM,dxM:dx,effectiveDepthM:params.effectiveDepthM,solverHz:params.solverHz,steps:state.steps,windowShifts:state.shifts,resets:state.resets,center:[centerX,centerZ],maxEtaM:latest.maxEta,maxSpeedMps:latest.maxSpeed,maxSigmaM:latest.maxSigma,maxFoam:latest.maxFoam,maxContact:latest.maxContact,cfl:latest.cfl,residualVolumeM3:latest.volume,displacedVolumeM3:latest.displacedVolume,wakeEnergy:latest.wakeEnergy,occupiedCells:latest.occCells,reactionForceN:lastReactionN,bodySpeedMps:bodySpeed,queryCount,queryHits,queryCoverage:coverage,textureFrames:state.textureFrames,lastStepMs,finite:state.finite,lastError:state.lastError,authority:"strictly flat zero-incident surface + Phase-7-style conservative hull-capacity heightfield",buoyancyCoupling:"existing hydrostatic points query combined height and velocity fields",sourceModified:true};
  }
  const previousMetrics=window.__labMetrics;
  window.__labMetrics=function(){const b=typeof previousMetrics==='function'?previousMetrics():{};return {...b,heightfieldV5:metrics()};};

  function addUI(){
    const panel=document.querySelector('.laser2-lab');if(!panel||panel.querySelector('#laser2-heightfield-v5'))return;
    const title=panel.querySelector('h2');if(title)title.textContent='BIOMECH + RIG + FLAT REACTIVE WATER LAB V12';
    const sec=document.createElement('section');sec.id='laser2-heightfield-v5';sec.innerHTML=`<h3>FLAT REACTIVE HEIGHTFIELD · HULL AUTHORITY</h3><table><tbody>
      <tr><td>authority</td><td>flat zero incident + hull reaction only</td></tr><tr><td>solver</td><td id="h5-grid">${N}² · ${params.sizeM.toFixed(0)} m</td></tr>
      <tr><td>enabled</td><td><label><input id="h5-enable" type="checkbox" checked> conservative hull coupling</label></td></tr>
      <tr><td>depth</td><td><input id="h5-depth" type="range" min="0.55" max="3.0" step="0.05" value="${params.effectiveDepthM}"> <span id="h5-depth-v">${params.effectiveDepthM.toFixed(2)} m</span></td></tr>
      <tr><td>momentum</td><td><input id="h5-momentum" type="range" min="0" max="1.5" step="0.01" value="${params.momentumGain}"> <span id="h5-momentum-v">${params.momentumGain.toFixed(2)}</span></td></tr>
      <tr><td>reaction</td><td><input id="h5-reaction" type="range" min="0" max="0.5" step="0.01" value="${params.reactionScale}"> <span id="h5-reaction-v">${params.reactionScale.toFixed(2)}</span></td></tr>
      <tr><td>foam</td><td><input id="h5-foam" type="range" min="0" max="2.5" step="0.01" value="${params.foamGain}"> <span id="h5-foam-v">${params.foamGain.toFixed(2)}</span></td></tr>
      <tr><td>field view</td><td><select id="h5-debug"><option value="off">off</option><option value="combined">height/foam/speed</option><option value="foam">foam</option><option value="solid">solid capacity</option></select></td></tr>
      <tr><td>state</td><td id="h5-state">initializing</td></tr><tr><td>wake</td><td id="h5-wake">—</td></tr><tr><td>coupling</td><td id="h5-coupling">—</td></tr>
      </tbody></table><button id="h5-reset" style="width:100%">RESET LOCAL FIELD</button>
      <canvas id="h5-canvas" width="${N}" height="${N}" style="width:100%;height:auto;margin-top:7px;border:1px solid rgba(255,255,255,.12);image-rendering:pixelated"></canvas>
      <div class="truth">NO SPECTRAL, GERSTNER, JONSWAP OR ANALYTIC WAKE EXISTS IN THIS BUILD. SIGMA IS THE TRANSFORMED LASER HULL OCCUPANCY. ETA, VELOCITY, PRESSURE, CAVITY RELEASE AND FOAM ARE GENERATED ONLY BY HULL/WATER REACTION AND FEED BACK INTO THE EXISTING BUOYANCY AND FOIL QUERIES.</div>`;
    panel.appendChild(sec);
    const bind=(id,key,fmt=v=>String(v))=>{const e=sec.querySelector('#'+id),o=sec.querySelector('#'+id+'-v');e.addEventListener('input',()=>{params[key]=+e.value;if(o)o.textContent=fmt(params[key]);});};
    bind('h5-depth','effectiveDepthM',v=>v.toFixed(2)+' m');bind('h5-momentum','momentumGain',v=>v.toFixed(2));bind('h5-reaction','reactionScale',v=>v.toFixed(2));bind('h5-foam','foamGain',v=>v.toFixed(2));
    sec.querySelector('#h5-enable').addEventListener('change',e=>{params.enabled=e.target.checked;localMesh.visible=params.enabled;water.matNear.uniforms.uLocalCutoutEnabled.value=params.enabled?1:0;if(!params.enabled)reset('disabled');});
    sec.querySelector('#h5-debug').addEventListener('change',e=>{params.debugField=e.target.value;localMat.uniforms.uLocalDebug.value=e.target.value==='off'?0:e.target.value==='combined'?1:e.target.value==='foam'?2:3;});
    sec.querySelector('#h5-reset').addEventListener('click',()=>reset('ui'));
  }
  function refreshUI(){
    addUI();const m=metrics(),set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set('h5-state',`${m.finite?'FINITE':'FAULT'} · CFL ${m.cfl.toFixed(3)} · ${m.lastStepMs.toFixed(1)} ms`);
    set('h5-wake',`η ${m.maxEtaM.toFixed(3)} m · U ${m.maxSpeedMps.toFixed(2)} m/s · E ${m.wakeEnergy.toFixed(2)}`);
    set('h5-coupling',`σ ${m.displacedVolumeM3.toFixed(3)} m³ · ${m.queryHits}/${m.queryCount} hydro hits · R ${m.reactionForceN.toFixed(0)} N`);
    let hud=document.getElementById('laser2-h5-hud');if(!hud){const a=document.querySelector('.bottom-left .rig-state:last-of-type')||document.querySelector('.bottom-left');if(a){hud=document.createElement('div');hud.id='laser2-h5-hud';hud.className='rig-state';a.after(hud);}}
    if(hud)hud.textContent=`HYDRO V5 · ${N}²/${params.sizeM.toFixed(0)}m · η ${m.maxEtaM.toFixed(2)}m · U ${m.maxSpeedMps.toFixed(1)}m/s · σ ${m.displacedVolumeM3.toFixed(2)}m³ · CFL ${m.cfl.toFixed(2)}`;
    const c=document.getElementById('h5-canvas');if(c){const cx=c.getContext('2d');cx.clearRect(0,0,N,N);cx.drawImage(fieldCanvas,0,0);}
  }
  window.LASER2_HEIGHTFIELD_V5={VERSION,params,state,fields:{eta,ux,uz,sigma,sigmaDot,src:srcField,penetration,block,foam,contactEvent},metrics,sample:sampleLocal,reset,baseHeight,baseVelocity,fieldCanvas,fieldTexture,localMesh,receipt:Object.freeze({sourceBaseline:"LASER2 V5 hull-capacity solver with all incident waves removed",references:["Aqua Phase 7 occupancy SWE/FSS","Aqua Phase 8 body-coupled profiler cockpit"],globalAuthority:"flat zero-height zero-velocity water",nearAuthority:"Phase-7-style moving-solid-capacity SWE driven only by the procedural Laser hull",bodyCoupling:"exact exposed rigid body pose/velocity and existing hydro point queries",hullCapacity:"closed procedural Laser 2 hull section evaluated under full rigid-body orientation",truthBoundary:"2.5D non-overturning near field; separated spray/air entrainment still reduced to foam"})};
  reset('startup');updateFieldTexture();updatePatchTransform();
  let lastUI=0;function frame(t){if(t-lastUI>240){refreshUI();lastUI=t}requestAnimationFrame(frame)}requestAnimationFrame(frame);
  document.title='Laser 2 — Flat Reactive Hull Heightfield V12';
  console.info(VERSION+' initialized',metrics());
})();
