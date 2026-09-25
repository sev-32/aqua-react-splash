(()=>{
  "use strict";
  const VERSION="LASER2_COG_FOIL_HYDRODYNAMICS_V15_20260713";
  const master=window.LASER2_CREW_RIGGING_MASTER_V2;
  const field=window.LASER2_MATERIAL_MEMORY_V13;
  const water=window.LASER2_WATER_INTERNAL;
  if(!master?.body||!master?.hydro||!master?.physics||!master?.config||!field||!water){console.error(VERSION+": required V13 runtime unavailable");return;}

  const body=master.body,hydro=master.hydro,cfg=master.config,physics=master.physics;
  const Vec3=body.pos.constructor;
  const G=cfg.env.g||9.81,RHO=cfg.env.rhoWater||1025,NU=1.19e-6;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=(a,b,x)=>{x=clamp((x-a)/Math.max(1e-9,b-a),0,1);return x*x*(3-2*x)};
  const lerp=(a,b,t)=>a+(b-a)*t;

  const params={
    enabled:true,
    centerboardDeployment:1.0,
    rudderDeployment:1.0,
    hydrostaticGain:1.0,
    cogGravityGain:1.0,
    hydraulicHeadBlend:1.0,
    hullHeaveDamping:2200,
    hullTangentialDamping:170,
    pressureReactionGain:0.0,
    maxPressureReactionN:760,
    skinFrictionGain:1.0,
    hullCrossflowCd:0.52,
    foilStrips:9,
    boardAddedMassScale:0.92,
    rudderAddedMassScale:0.72,
    foilRadiationDamping:0.45,
    foilCrossflowCd:1.15,
    foilOswald:0.82,
    ventilationDepthM:0.22,
    stallBlendRad:0.30,
    crewComAbovePelvisM:0.19,
    fixedMassLocalY:0.0,
    fixedMassLocalZ:0.0,
    forceCellClampN:95,
    autoHeaveEquilibrium:true,
    equilibriumIterations:8,
    equilibriumHeaveStiffnessNpm:34000,
    updateInertia:true,
    appendageWaterReactionGain:0.28,
    rudderCpChordFrac:0.27
  };
  const state={steps:0,finite:true,lastError:null,sourceModified:true,oldHydroDisabled:false,settling:false,equilibriumReady:false,equilibriumSolves:0};
  const latest={
    totalMassKg:0,cogLocal:[0,0,0],cogWorld:[0,0,0],cobWorld:[0,0,0],displacedVolumeM3:0,
    buoyancyN:0,weightN:0,buoyancyErrorN:0,heelDeg:0,trimDeg:0,
    pressureReactionN:0,skinDragN:0,hullCrossflowN:0,
    board:{liftN:0,dragN:0,crossflowN:0,maxAlphaDeg:0,immersed01:0,addedMassKg:0,addedRollI:0,addedYawI:0,stalled:false},
    rudder:{liftN:0,dragN:0,crossflowN:0,maxAlphaDeg:0,immersed01:0,addedMassKg:0,addedRollI:0,addedYawI:0,stalled:false},
    inertia:[0,0,0],leewayDeg:0,yawRateDegS:0,rollRateDegS:0,hydroCells:0,lastStepMs:0,equilibriumRatio:0,balanceRollMomentNm:0,balancePitchMomentNm:0,rightingArmRollM:0,rightingArmPitchM:0
  };

  // The original hydro hook used point buoyancy, speed-gated foils, and empirical angular damping.
  // Its arrow hook resolves this instance method at call time, so replacing the method cleanly
  // removes that authority without altering the core solver or UI input path.
  const originalHydroHook=hydro.hook.bind(hydro);
  hydro.hook=function(){};
  state.oldHydroDisabled=true;

  const totalMass=(cfg.hull.massHull||79)+(cfg.hull.massCrew||150)+(cfg.hull.massFoils||6);
  body.invMass=1/totalMass;
  const fixedMass=Math.max(1,totalMass-(cfg.crew.helmMass||75)-(cfg.crew.crewMass||75));
  // Actor pose coordinates are relative to the visible boat group. The rigid body origin is
  // offset from that group by qn=(0, bodyReferenceY, comZ); all mass properties must be
  // converted into the body frame before moments or parallel-axis terms are evaluated.
  const bodyReferenceOffset=new Vec3(0,cfg.hull.bodyReferenceY||0,cfg.hull.comZ||0);
  const fixedCom=new Vec3(0,params.fixedMassLocalY,params.fixedMassLocalZ);
  const helmCom=new Vec3(),crewCom=new Vec3(),cogLocal=new Vec3(),cogWorld=new Vec3();
  const nominalHelm=new Vec3(0,.74,cfg.crew.helmZ||-1.05).sub(bodyReferenceOffset),nominalCrew=new Vec3(0,.74,cfg.crew.crewZ||-.15).sub(bodyReferenceOffset);
  const tmp=new Vec3(),tmp2=new Vec3(),tmp3=new Vec3(),tmp4=new Vec3(),tmp5=new Vec3(),hingeVec=new Vec3();
  const invBodyQuat=body.quat.clone();
  const worldPoint=new Vec3(),bodyPointVel=new Vec3(),waterVel=new Vec3(),force=new Vec3();
  const upW=new Vec3(),rightW=new Vec3(),forwardW=new Vec3(),spanW=new Vec3(),chordW=new Vec3(),normalW=new Vec3(),flow=new Vec3(),flowHat=new Vec3(),liftDir=new Vec3();
  const localX=new Vec3(1,0,0),localY=new Vec3(0,1,0),localZ=new Vec3(0,0,1);
  const gravityForce=new Vec3(0,-totalMass*G,0),foilAddedInertia=new Vec3();
  const pressureSamples=[];

  function validCrewCom(agent,out,fallbackZ){
    const a=agent?.articulatedComLocal;
    if(agent?.comValid&&a&&Number.isFinite(a.x+a.y+a.z)&&a.lengthSq()>.04){out.copy(a).sub(bodyReferenceOffset);return out;}
    const p=agent?.pelvis||agent?.pelvisT;
    if(p&&Number.isFinite(p.x+p.y+p.z)){out.copy(p);out.y+=params.crewComAbovePelvisM;out.sub(bodyReferenceOffset);return out;}
    out.set(0,.74,fallbackZ).sub(bodyReferenceOffset);return out;
  }
  function updateCogAndBaseInertia(foilAdded){
    validCrewCom(master.helm,helmCom,cfg.crew.helmZ||-1.05);
    validCrewCom(master.crew,crewCom,cfg.crew.crewZ||-.15);
    const hm=cfg.crew.helmMass||75,cm=cfg.crew.crewMass||75;
    cogLocal.copy(fixedCom).multiplyScalar(fixedMass).addScaledVector(helmCom,hm).addScaledVector(crewCom,cm).multiplyScalar(1/totalMass);
    cogWorld.copy(cogLocal).applyQuaternion(body.quat).add(body.pos);

    let Ixx=cfg.hull.inertia.pitch||320,Iyy=cfg.hull.inertia.yaw||340,Izz=cfg.hull.inertia.roll||55;
    const addDelta=(p,n,m)=>{
      Ixx+=m*((p.y*p.y+p.z*p.z)-(n.y*n.y+n.z*n.z));
      Iyy+=m*((p.x*p.x+p.z*p.z)-(n.x*n.x+n.z*n.z));
      Izz+=m*((p.x*p.x+p.y*p.y)-(n.x*n.x+n.y*n.y));
    };
    addDelta(helmCom,nominalHelm,hm);addDelta(crewCom,nominalCrew,cm);
    Ixx+=foilAdded.x;Iyy+=foilAdded.y;Izz+=foilAdded.z;
    Ixx=Math.max(45,Ixx);Iyy=Math.max(70,Iyy);Izz=Math.max(22,Izz);
    if(params.updateInertia)body.invI.set(1/Ixx,1/Iyy,1/Izz);
    latest.inertia=[Ixx,Iyy,Izz];

    // Gravity is integrated at body.pos. This torque is the exact equivalent of applying
    // the same total weight through the current composite CoG.
    tmp.copy(cogWorld).sub(body.pos);body.torque.addScaledVector(tmp2.crossVectors(tmp,gravityForce),params.cogGravityGain);
    latest.totalMassKg=totalMass;latest.cogLocal=cogLocal.toArray();latest.cogWorld=cogWorld.toArray();latest.weightN=totalMass*G;
  }

  function foilModel(name,spec,centerLocal,angleRad,deployment,dt){
    const out={liftN:0,dragN:0,crossflowN:0,maxAlphaDeg:0,immersed01:0,addedMassKg:0,addedRollI:0,addedYawI:0,addedPitchI:0,stalled:false,hingeTorqueNm:0,forceWorld:[0,0,0],normalForceN:0};
    deployment=clamp(deployment,0,1);if(deployment<=1e-4)return out;
    const fullSpan=spec.span,span=fullSpan*deployment,chord=spec.area/fullSpan,area=spec.area*deployment,n=Math.max(3,params.foilStrips|0),ds=span/n,stripArea=area/n,cpOffset=name==='rudder'?-params.rudderCpChordFrac*chord:0;
    upW.copy(localY).applyQuaternion(body.quat).normalize();spanW.copy(upW).multiplyScalar(-1);
    chordW.copy(localZ).applyQuaternion(body.quat).normalize();if(angleRad)chordW.applyAxisAngle(upW,-angleRad).normalize();
    normalW.crossVectors(chordW,spanW).normalize();
    const normalLocal=tmp4.copy(normalW).applyQuaternion(invBodyQuat.copy(body.quat).invert()).normalize();
    const AR=span*span/Math.max(area,1e-6),a0=2*Math.PI,liftSlope=a0/(1+a0/(Math.PI*params.foilOswald*Math.max(.25,AR)));
    const finiteAdded=AR/(AR+1.6),addedScale=name==='board'?params.boardAddedMassScale:params.rudderAddedMassScale;
    const addedPerSpan=RHO*Math.PI*.25*chord*chord*finiteAdded*addedScale;
    const stall=(spec.stallDeg||15)*Math.PI/180;
    let immersed=0;
    for(let s=0;s<n;s++){
      const frac=(s+.5)/n-.5;
      tmp.set(centerLocal.x,centerLocal.y-frac*span,centerLocal.z+cpOffset);body.localToWorld(tmp,worldPoint);
      const surface=water.height(worldPoint.x,worldPoint.z),depth=surface-worldPoint.y;
      const wet=smooth(-.03,Math.max(.06,ds*.85),depth);if(wet<=1e-4)continue;immersed+=wet;
      body.worldPointVelocity(worldPoint,bodyPointVel);water.velocity(worldPoint.x,worldPoint.z,waterVel);flow.copy(bodyPointVel).sub(waterVel);
      const vn=flow.dot(normalW);
      const mA=addedPerSpan*ds*wet;out.addedMassKg+=mA;
      // Added rotational inertia from the plate's normal-velocity mode.
      const r=tmp;
      tmp2.crossVectors(localX,r);let kx=normalLocal.dot(tmp2);out.addedPitchI+=mA*kx*kx;
      tmp2.crossVectors(localY,r);let ky=normalLocal.dot(tmp2);out.addedYawI+=mA*ky*ky;
      tmp2.crossVectors(localZ,r);let kz=normalLocal.dot(tmp2);out.addedRollI+=mA*kz*kz;

      const omega0=Math.sqrt(G/Math.max(.12,span));
      const cRad=2*params.foilRadiationDamping*mA*omega0;
      const crossN=-(cRad*vn+.5*RHO*params.foilCrossflowCd*stripArea*wet*vn*Math.abs(vn));
      const crossClamped=clamp(crossN,-900,900);force.copy(normalW).multiplyScalar(crossClamped);body.addForceAt(force,worldPoint);out.crossflowN+=Math.abs(crossClamped);out.normalForceN+=crossClamped;out.forceWorld[0]+=force.x;out.forceWorld[1]+=force.y;out.forceWorld[2]+=force.z;
      if(name==='rudder'){tmp5.set(centerLocal.x,centerLocal.y-frac*span,centerLocal.z);body.localToWorld(tmp5,tmp3);tmp2.copy(worldPoint).sub(tmp3);out.hingeTorqueNm+=hingeVec.crossVectors(tmp2,force).dot(upW);}
      if(field.injectMomentum)field.injectMomentum(worldPoint.x,worldPoint.z,-force.x*params.appendageWaterReactionGain,-force.z*params.appendageWaterReactionGain,Math.max(0,depth),Math.max(chord*.58,ds*.72),dt);

      flow.addScaledVector(spanW,-flow.dot(spanW));const speed=flow.length();if(speed<.035)continue;
      flowHat.copy(flow).multiplyScalar(1/speed);
      const alpha=Math.atan2(flow.dot(normalW),flow.dot(chordW));const aa=Math.abs(alpha);out.maxAlphaDeg=Math.max(out.maxAlphaDeg,aa*180/Math.PI);out.stalled||=aa>=stall;
      let CL;
      if(aa<=stall)CL=liftSlope*alpha;
      else{
        const at=clamp((aa-stall)/params.stallBlendRad,0,1),clStall=liftSlope*stall*Math.sign(alpha);
        const separated=1.05*Math.sin(2*alpha);
        CL=lerp(clStall,separated,at);
      }
      CL=clamp(CL,-1.45,1.45);
      const CD=(spec.cd0||.009)+CL*CL/(Math.PI*params.foilOswald*Math.max(.25,AR))+(aa>stall?.55*(aa-stall):0);
      const vent=smooth(0,params.ventilationDepthM,depth);const q=.5*RHO*speed*speed*stripArea*wet*vent;
      liftDir.crossVectors(spanW,flowHat).normalize();
      const liftN=q*CL,dragN=q*CD;
      force.copy(liftDir).multiplyScalar(liftN).addScaledVector(flowHat,-dragN);body.addForceAt(force,worldPoint);out.forceWorld[0]+=force.x;out.forceWorld[1]+=force.y;out.forceWorld[2]+=force.z;out.normalForceN+=force.dot(normalW);
      if(name==='rudder'){tmp5.set(centerLocal.x,centerLocal.y-frac*span,centerLocal.z);body.localToWorld(tmp5,tmp3);tmp2.copy(worldPoint).sub(tmp3);out.hingeTorqueNm+=hingeVec.crossVectors(tmp2,force).dot(upW);}
      if(field.injectMomentum)field.injectMomentum(worldPoint.x,worldPoint.z,-force.x*params.appendageWaterReactionGain,-force.z*params.appendageWaterReactionGain,Math.max(0,depth),Math.max(chord*.62,ds*.75),dt);
      out.liftN+=Math.abs(liftN);out.dragN+=Math.abs(dragN);
    }
    out.immersed01=immersed/n;return out;
  }

  function integrateHullHydro(dt){
    const f=field.fields,m=field.metrics(),N=m.grid[0],dx=m.dxM,area=dx*dx,originX=m.center[0]-m.sizeM*.5,originZ=m.center[1]-m.sizeM*.5,H=m.effectiveDepthM;
    let volume=0,bx=0,by=0,bz=0,buoyancy=0,pressureFx=0,pressureFz=0,cells=0;pressureSamples.length=0;
    const p=f.pressure,sigma=f.sigma,block=f.block,eta=f.hydroEta,lo=f.hullLo,hi=f.hullHi;
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
      const i=z*N+x,th=sigma[i];if(th<=1e-6)continue;cells++;
      const wx=originX+(x+.5)*dx,wz=originZ+(z+.5)*dx;
      const wetLo=Math.max(-H,lo[i]),wetHi=Math.min(eta[i],hi[i]);
      const cy=Number.isFinite(wetLo+wetHi)&&wetHi>wetLo?.5*(wetLo+wetHi):Math.min(eta[i],-.5*th);
      const dv=th*area,Fb=RHO*G*dv*params.hydrostaticGain;volume+=dv;buoyancy+=Fb;bx+=wx*dv;by+=cy*dv;bz+=wz*dv;
      worldPoint.set(wx,cy,wz);force.set(0,Fb,0);body.addForceAt(force,worldPoint);
      body.worldPointVelocity(worldPoint,bodyPointVel);water.velocity(wx,wz,waterVel);bodyPointVel.sub(waterVel);
      const wetFactor=clamp(block[i],0,1);
      const dampY=clamp(-params.hullHeaveDamping*area*wetFactor*bodyPointVel.y,-params.forceCellClampN,params.forceCellClampN);
      const dampX=clamp(-params.hullTangentialDamping*area*wetFactor*bodyPointVel.x,-params.forceCellClampN*.45,params.forceCellClampN*.45);
      const dampZ=clamp(-params.hullTangentialDamping*area*wetFactor*bodyPointVel.z,-params.forceCellClampN*.45,params.forceCellClampN*.45);
      body.addForceAt(force.set(dampX,dampY,dampZ),worldPoint);

      if(params.pressureReactionGain>0){
        const gsx=(sigma[i+1]-sigma[i-1])/(2*dx),gsz=(sigma[i+N]-sigma[i-N])/(2*dx);
        const pPa=RHO*p[i]/Math.max(dt,.003),fx=clamp(-pPa*gsx*area*params.pressureReactionGain,-params.forceCellClampN,params.forceCellClampN),fz=clamp(-pPa*gsz*area*params.pressureReactionGain,-params.forceCellClampN,params.forceCellClampN);
        pressureFx+=fx;pressureFz+=fz;pressureSamples.push(wx,cy,wz,fx,fz);
      }
    }
    const pm=Math.hypot(pressureFx,pressureFz),pressureScale=pm>params.maxPressureReactionN?params.maxPressureReactionN/pm:1;
    for(let j=0;j<pressureSamples.length;j+=5){worldPoint.set(pressureSamples[j],pressureSamples[j+1],pressureSamples[j+2]);force.set(pressureSamples[j+3]*pressureScale,0,pressureSamples[j+4]*pressureScale);body.addForceAt(force,worldPoint);}
    latest.displacedVolumeM3=volume;latest.buoyancyN=buoyancy;latest.buoyancyErrorN=buoyancy-totalMass*G;latest.pressureReactionN=pm*pressureScale;latest.hydroCells=cells;
    if(volume>1e-8){latest.cobWorld=[bx/volume,by/volume,bz/volume];}else latest.cobWorld=body.pos.toArray();
  }

  function hullResistance(){
    forwardW.copy(localZ).applyQuaternion(body.quat).normalize();rightW.copy(localX).applyQuaternion(body.quat).normalize();
    water.velocity(body.pos.x,body.pos.z,waterVel);flow.copy(body.vel).sub(waterVel);
    const u=flow.dot(forwardW),v=flow.dot(rightW),speed=Math.abs(u),L=cfg.hull.lwl||4.22;
    let skin=0,cross=0;
    if(speed>.02){const Re=Math.max(1e4,speed*L/NU),Cf=.075/Math.pow(Math.log10(Re)-2,2),wetted=(cfg.hydro.wetted||3.1)*Math.pow(clamp(latest.displacedVolumeM3/(totalMass/RHO),.35,1.8),2/3);skin=.5*RHO*Cf*wetted*u*Math.abs(u)*params.skinFrictionGain;body.addForceAt(force.copy(forwardW).multiplyScalar(-skin),body.pos);}
    if(Math.abs(v)>.015){const sideArea=.72*(cfg.hull.lwl||4.22)*clamp(latest.displacedVolumeM3/(totalMass/RHO),.25,1.5);cross=.5*RHO*params.hullCrossflowCd*sideArea*v*Math.abs(v);body.addForceAt(force.copy(rightW).multiplyScalar(-cross),body.pos);}
    latest.skinDragN=Math.abs(skin);latest.hullCrossflowN=Math.abs(cross);
    latest.leewayDeg=Math.atan2(v,Math.max(.05,Math.abs(u)))*180/Math.PI;
  }

  function hook(dt){
    if(!params.enabled)return;const t0=performance.now();
    try{
      const board=foilModel('board',cfg.foils.board,hydro.boardB,0,params.centerboardDeployment,dt);
      const rudder=foilModel('rudder',cfg.foils.rudder,hydro.rudderB,hydro.rudderAngle||0,params.rudderDeployment,dt);
      latest.board=board;latest.rudder=rudder;
      foilAddedInertia.set(board.addedPitchI+rudder.addedPitchI,board.addedYawI+rudder.addedYawI,board.addedRollI+rudder.addedRollI);updateCogAndBaseInertia(foilAddedInertia);
      integrateHullHydro(dt);hullResistance();
      forwardW.copy(localZ).applyQuaternion(body.quat).normalize();upW.copy(localY).applyQuaternion(body.quat).normalize();rightW.copy(localX).applyQuaternion(body.quat).normalize();
      latest.rollRateDegS=body.omega.dot(forwardW)*180/Math.PI;latest.yawRateDegS=body.omega.dot(upW)*180/Math.PI;
      latest.heelDeg=Math.asin(clamp(rightW.y,-1,1))*180/Math.PI;
      latest.trimDeg=Math.asin(clamp(forwardW.y,-1,1))*180/Math.PI;
      tmp.fromArray(latest.cobWorld).sub(body.pos);tmp2.set(0,latest.buoyancyN,0);tmp3.crossVectors(tmp,tmp2);
      tmp.fromArray(latest.cogWorld).sub(body.pos);tmp2.set(0,-latest.weightN,0);tmp3.add(tmp4.crossVectors(tmp,tmp2));
      latest.balanceRollMomentNm=tmp3.dot(forwardW);latest.balancePitchMomentNm=tmp3.dot(rightW);
      latest.rightingArmRollM=latest.balanceRollMomentNm/Math.max(1,latest.weightN);latest.rightingArmPitchM=latest.balancePitchMomentNm/Math.max(1,latest.weightN);
      latest.lastStepMs=performance.now()-t0;latest.finite=Number.isFinite(body.pos.x+body.pos.y+body.pos.z+body.vel.x+body.omega.x+latest.buoyancyN);state.finite=latest.finite;state.steps++;
    }catch(e){state.finite=false;state.lastError=e instanceof Error?e.message:String(e);console.error(VERSION,e);}
  }
  physics.forceHooks.push(hook);

  function metrics(){return {version:VERSION,enabled:params.enabled,oldHydroDisabled:state.oldHydroDisabled,steps:state.steps,finite:state.finite,lastError:state.lastError,equilibriumReady:state.equilibriumReady,equilibriumSolves:state.equilibriumSolves,settling:state.settling,...JSON.parse(JSON.stringify(latest)),boardDeployment:params.centerboardDeployment,rudderDeployment:params.rudderDeployment,foilAuthority:"finite-wing strip lift + correct center-of-pressure application + induced/profile drag + ventilation + equal/opposite heightfield momentum",zeroSpeedAuthority:"immersed flat-plate added rotational inertia and radiation/cross-flow damping",buoyancyAuthority:"V13 exact hull-capacity cells integrated as displaced volume and distributed through the hydraulic head",balanceAuthority:"composite dynamic CoG gravity torque against distributed center of buoyancy",bodyReferenceOffset:bodyReferenceOffset.toArray(),fixedMassComLocal:fixedCom.toArray(),sourceModified:true};}

  function solveHeaveEquilibrium(iterations=params.equilibriumIterations){
    if(state.settling)return metrics();state.settling=true;state.equilibriumReady=false;
    const wasKinematic=body.kinematic,wasPaused=!!master.input?.state?.paused,prevCog=params.cogGravityGain;
    try{
      __sim.pause(true);body.kinematic=true;params.cogGravityGain=0;body.vel.set(0,0,0);body.omega.set(0,0,0);
      let prevY=NaN,prevB=NaN;
      for(let k=0;k<Math.max(2,iterations|0);k++){
        field.reset('v14-heave-equilibrium-'+k);body.vel.set(0,0,0);body.omega.set(0,0,0);__sim.stepN(1);
        const err=latest.buoyancyN-latest.weightN;let dBdy=-Math.max(1,params.equilibriumHeaveStiffnessNpm);
        if(Number.isFinite(prevY)&&Math.abs(body.pos.y-prevY)>1e-5&&Number.isFinite(prevB)){const secant=(latest.buoyancyN-prevB)/(body.pos.y-prevY);if(secant< -1000&&Number.isFinite(secant))dBdy=secant;}
        const dy=clamp(-err/dBdy,-.045,.045);prevY=body.pos.y;prevB=latest.buoyancyN;body.pos.y+=dy;
        if(Math.abs(err)<latest.weightN*.0025&&Math.abs(dy)<2e-4)break;
      }
      field.reset('v14-heave-equilibrium-final');body.vel.set(0,0,0);body.omega.set(0,0,0);__sim.stepN(1);latest.equilibriumRatio=latest.buoyancyN/Math.max(1,latest.weightN);state.equilibriumSolves++;
    }catch(e){state.finite=false;state.lastError=e instanceof Error?e.message:String(e);console.error(VERSION+' equilibrium',e);}
    finally{body.kinematic=wasKinematic;params.cogGravityGain=prevCog;body.vel.set(0,0,0);body.omega.set(0,0,0);__sim.pause(wasPaused);state.settling=false;state.equilibriumReady=true;}
    return metrics();
  }
  function resetHydroState(){state.steps=0;state.lastError=null;state.finite=true;field.reset('v14-hydro-reset');return solveHeaveEquilibrium();}
  function debugRollDecay(initialRate=0.7,durationS=1.5,boards=true){
    const prevB=params.centerboardDeployment,prevR=params.rudderDeployment,prevCog=params.cogGravityGain;params.centerboardDeployment=boards?1:0;params.rudderDeployment=boards?1:0;params.cogGravityGain=0;
    __sim.pause(true);__sim.setWind(0,0);__sim.reset();field.reset('v14-roll-decay');
    forwardW.copy(localZ).applyQuaternion(body.quat).normalize();body.vel.set(0,0,0);body.omega.copy(forwardW).multiplyScalar(initialRate);
    const n=Math.max(1,Math.round(durationS/(cfg.sim.dt||1/60))),samples=[];for(let i=0;i<n;i++){__sim.stepN(1);if(i%6===0){forwardW.copy(localZ).applyQuaternion(body.quat).normalize();samples.push({t:i*(cfg.sim.dt||1/60),rollRate:body.omega.dot(forwardW),heel:metrics().heelDeg});}}
    const result={boards,initialRate,finalRate:samples.at(-1)?.rollRate||0,samples,metrics:metrics()};params.centerboardDeployment=prevB;params.rudderDeployment=prevR;params.cogGravityGain=prevCog;return result;
  }
  function debugLeewayDecay(forwardSpeed=2.5,sideSpeed=.55,durationS=2.0,boards=true){
    const prevB=params.centerboardDeployment,prevR=params.rudderDeployment,prevCog=params.cogGravityGain;params.centerboardDeployment=boards?1:0;params.rudderDeployment=boards?1:0;params.cogGravityGain=0;
    __sim.pause(true);__sim.setWind(0,0);__sim.reset();field.reset('v14-leeway-decay');
    forwardW.copy(localZ).applyQuaternion(body.quat).normalize();rightW.copy(localX).applyQuaternion(body.quat).normalize();body.vel.copy(forwardW).multiplyScalar(forwardSpeed).addScaledVector(rightW,sideSpeed);body.omega.set(0,0,0);
    const n=Math.max(1,Math.round(durationS/(cfg.sim.dt||1/60))),samples=[];for(let i=0;i<n;i++){__sim.stepN(1);if(i%6===0){forwardW.copy(localZ).applyQuaternion(body.quat).normalize();rightW.copy(localX).applyQuaternion(body.quat).normalize();upW.copy(localY).applyQuaternion(body.quat).normalize();samples.push({t:i*(cfg.sim.dt||1/60),forward:body.vel.dot(forwardW),side:body.vel.dot(rightW),yawRate:body.omega.dot(upW)});}}
    const result={boards,initialSide:sideSpeed,finalSide:samples.at(-1)?.side||0,samples,metrics:metrics()};params.centerboardDeployment=prevB;params.rudderDeployment=prevR;params.cogGravityGain=prevCog;return result;
  }

  function addUI(){
    const lab=document.querySelector('.laser2-lab');if(!lab||document.getElementById('laser2-v14-panel'))return;
    const sec=document.createElement('section');sec.id='laser2-v14-panel';sec.innerHTML=`<h3>V15 · CoG / BUOYANCY / FOIL AUTHORITY</h3><table><tbody>
      <tr><td>buoyancy</td><td>exact V13 displaced columns / hydraulic head</td></tr><tr><td>balance</td><td>dynamic crew CoG vs integrated center of buoyancy</td></tr>
      <tr><td>centerboard</td><td>finite-wing lift + added-water roll/yaw inertia</td></tr><tr><td>rudder</td><td>strip lift / drag / stall / low-speed cross-flow</td></tr>
      <tr><td>state</td><td id="v14-state">initializing</td></tr><tr><td>balance</td><td id="v14-balance">—</td></tr><tr><td>foils</td><td id="v14-foils">—</td></tr></tbody></table>
      <label>centerboard <input id="v14-board" type="range" min="0" max="1" step="0.01" value="${params.centerboardDeployment}"> <span id="v14-board-v">${params.centerboardDeployment.toFixed(2)}</span></label>
      <label>rudder depth <input id="v14-rudder" type="range" min="0" max="1" step="0.01" value="${params.rudderDeployment}"> <span id="v14-rudder-v">${params.rudderDeployment.toFixed(2)}</span></label>
      <label>added-water scale <input id="v14-added" type="range" min="0" max="1.6" step="0.02" value="${params.boardAddedMassScale}"> <span id="v14-added-v">${params.boardAddedMassScale.toFixed(2)}</span></label>
      <button id="v14-reset" style="width:100%">RESET HYDRODYNAMIC EQUILIBRIUM</button>
      <div class="truth">THE BOARD DOES NOT CREATE STATIC RIGHTING FORCE. IT RESISTS ROLL AND YAW AT ZERO BOAT SPEED BY ACCELERATING WATER NORMAL TO ITS FLAT PLANE; AT FORWARD SPEED THE SAME IMMERSED SURFACE PRODUCES LIFT, INDUCED DRAG, STALL, AND DIRECTIONAL STABILITY.</div>`;
    lab.appendChild(sec);
    const bind=(id,key)=>{const e=sec.querySelector('#'+id),v=sec.querySelector('#'+id+'-v');e.oninput=()=>{params[key]=+e.value;v.textContent=params[key].toFixed(2);};};bind('v14-board','centerboardDeployment');bind('v14-rudder','rudderDeployment');bind('v14-added','boardAddedMassScale');
    sec.querySelector('#v14-reset').onclick=()=>{__sim.reset();solveHeaveEquilibrium();};
  }
  function refreshUI(){
    addUI();const m=metrics(),set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
    set('v14-state',`${m.finite?'FINITE':'FAULT'} · ${m.lastStepMs.toFixed(2)} ms · ${m.hydroCells} wet cells`);
    set('v14-balance',`B ${(m.buoyancyN/1000).toFixed(2)} kN / W ${(m.weightN/1000).toFixed(2)} kN · GZ ${m.rightingArmRollM.toFixed(3)} m · heel ${m.heelDeg.toFixed(1)}°`);
    set('v14-foils',`board L ${m.board.liftN.toFixed(0)} N / Iroll ${m.board.addedRollI.toFixed(1)} · rudder L ${m.rudder.liftN.toFixed(0)} N · leeway ${m.leewayDeg.toFixed(1)}°`);
    let hud=document.getElementById('laser2-v14-hud');if(!hud){const a=document.querySelector('#laser2-v13-hud')||document.querySelector('.bottom-left');hud=document.createElement('div');hud.id='laser2-v14-hud';hud.className='rig-state';a.after(hud);}hud.textContent=`V15 HYDRO · B/W ${(m.buoyancyN/Math.max(1,m.weightN)).toFixed(3)} · CoB ${m.displacedVolumeM3.toFixed(3)}m³ · BOARD ${m.board.liftN.toFixed(0)}N / ${m.board.crossflowN.toFixed(0)}N · ROLL ${m.rollRateDegS.toFixed(1)}°/s`;
  }

  const oldMetrics=window.__labMetrics;window.__labMetrics=function(){const b=typeof oldMetrics==='function'?oldMetrics():{};return {...b,cogFoilHydroV14:metrics()};};
  window.LASER2_COG_FOIL_HYDRO_V14={VERSION,params,state,metrics,resetHydroState,solveHeaveEquilibrium,debugRollDecay,debugLeewayDecay,originalHydroHook,receipt:Object.freeze({baseline:'V13 material-memory heightfield',hydrostatics:'distributed exact hull-capacity buoyancy',mass:'dynamic composite crew CoG with parallel-axis inertia update',centerboard:'finite-wing lift plus flat-plate added inertia and cross-flow damping at zero surge',rudder:'strip-resolved lift/drag/stall/ventilation and low-speed damping',oldAuthority:'point buoyancy and empirical angular damping disabled',startup:'exact-capacity heave equilibrium before free dynamics'})};
  document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'#laser2-v14-panel{border-top:1px solid rgba(88,166,255,.55)}'}));
  let last=0;function frame(t){if(t-last>220){last=t;refreshUI();}requestAnimationFrame(frame)}requestAnimationFrame(frame);
  document.title='Laser 2 — Reactive Water + Elastic Steering V15';setTimeout(()=>{if(params.autoHeaveEquilibrium)solveHeaveEquilibrium();else state.equilibriumReady=true;},0);console.info(VERSION+' initialized',metrics());
})();
