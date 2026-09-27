(()=>{
  "use strict";
  const VERSION="LASER2_ELASTIC_STEERING_GEOMETRY_V15_20260713";
  const master=window.LASER2_CREW_RIGGING_MASTER_V2,hydroV15=window.LASER2_COG_FOIL_HYDRO_V14,field=window.LASER2_MATERIAL_MEMORY_V13;
  if(!master?.boat||!master?.body||!master?.hydro||!master?.input||!master?.physics||!hydroV15||!field){console.error(VERSION+': missing runtime');return;}
  const body=master.body,hydro=master.hydro,input=master.input,cfg=master.config,Vec3=body.pos.constructor;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),maxAngle=(cfg.foils.rudder.maxDeg||38)*Math.PI/180;
  const params={targetRateDegS:72,holdStrength:.62,maxHandTorqueNm:82,minHandTorqueNm:8,springMinNmRad:22,springMaxNmRad:125,dampingRatio:1.18,pivotDampingNms:5.2,tillerInertiaKgm2:.55,maxTillerRateDegS:115,visualBoardRotationDeg:90,visualRudderRotationDeg:90};
  const state={targetAngleRad:0,angleRad:hydro.rudderAngle||0,rateRadS:0,handTorqueNm:0,hydroHingeTorqueNm:0,requiredHoldTorqueNm:0,holdUtilization:0,inputActive:false,finite:true,steps:0,lastError:null};
  const rightW=new Vec3(),forwardW=new Vec3(),upW=new Vec3(),flow=new Vec3(),waterVel=new Vec3(),pointVel=new Vec3(),normalW=new Vec3(),chordW=new Vec3(),spanW=new Vec3(),liftDir=new Vec3(),tmp=new Vec3();

  function bounds(o){if(!o?.geometry)return null;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;return [b.max.x-b.min.x,b.max.y-b.min.y,b.max.z-b.min.z];}
  function findGeometry(){
    let board=null,rudderPivot=null;
    for(const o of master.boat.children){const e=bounds(o);if(e&&e[1]>.95&&e[2]<.08&&Math.abs(o.position.z-.25)<.2)board=o;if(o.type==='Group'&&o.position.z<-1.8&&o.children.length>=3)rudderPivot=o;}
    let rudder=null,tiller=null;if(rudderPivot){for(const o of rudderPivot.children){const e=bounds(o);if(!e)continue;if(e[1]>.85&&e[2]<.08&&e[0]>.12)rudder=o;else if(e[1]>.85&&e[0]<.08&&e[2]<.08)tiller=o;}}
    return {board,rudderPivot,rudder,tiller};
  }
  const visual=findGeometry();
  if(visual.board){visual.board.name='centerboard-blade-v15';visual.board.rotation.y=Math.PI/2;}
  if(visual.rudder){visual.rudder.name='rudder-blade-v15';visual.rudder.rotation.y=Math.PI/2;visual.rudder.position.z=-.14;}
  if(visual.rudderPivot)visual.rudderPivot.name='rudder-stock-pivot-v15';
  if(visual.tiller){visual.tiller.name='tiller-v15';visual.tiller.rotation.x=Math.PI/2-.12;visual.tiller.position.set(0,.16,.56);}

  // Preserve every original control except steering. A/D or arrows now move a retained
  // target angle; releasing the keys does not command recentering.
  const originalInputUpdate=input.update.bind(input);
  input.update=function(dt){
    const codes=['ArrowRight','KeyD','ArrowLeft','KeyA'],saved=codes.map(c=>!!this.keys[c]);for(const c of codes)this.keys[c]=false;
    originalInputUpdate(dt);for(let i=0;i<codes.length;i++)this.keys[codes[i]]=saved[i];
    const dir=(saved[0]||saved[1]?1:0)-(saved[2]||saved[3]?1:0);state.inputActive=dir!==0;
    if(dir)state.targetAngleRad=clamp(state.targetAngleRad-dir*params.targetRateDegS*Math.PI/180*dt,-maxAngle,maxAngle);
    // The legacy core converts normalized tiller back to rudderAngle with a minus sign.
    this.state.tiller=-state.angleRad/maxAngle;
  };

  function computeIndependentHinge(){
    upW.set(0,1,0).applyQuaternion(body.quat).normalize();forwardW.set(0,0,1).applyQuaternion(body.quat).normalize();rightW.set(1,0,0).applyQuaternion(body.quat).normalize();
    const stock=hydro.rudderB,tmpLocal=tmp.set(stock.x,stock.y,stock.z-.27*(cfg.foils.rudder.area/cfg.foils.rudder.span));body.localToWorld(tmpLocal,pointVel);
    body.worldPointVelocity(pointVel,flow);master.water.velocity(pointVel.x,pointVel.z,waterVel);flow.sub(waterVel);
    spanW.copy(upW).multiplyScalar(-1);chordW.copy(forwardW).applyAxisAngle(upW,-state.angleRad).normalize();normalW.crossVectors(chordW,spanW).normalize();
    flow.addScaledVector(spanW,-flow.dot(spanW));const speed=flow.length();if(speed<.02)return 0;
    const alpha=Math.atan2(flow.dot(normalW),flow.dot(chordW)),stall=(cfg.foils.rudder.stallDeg||16)*Math.PI/180,aa=Math.abs(alpha),AR=cfg.foils.rudder.span**2/cfg.foils.rudder.area;
    const a0=2*Math.PI,slope=a0/(1+a0/(Math.PI*.82*AR));let CL=aa<=stall?slope*alpha:Math.sign(alpha)*Math.min(1.2,slope*stall)*(1-.48*clamp((aa-stall)/.35,0,1));CL=clamp(CL,-1.45,1.45);
    const q=.5*(cfg.env.rhoWater||1025)*speed*speed*cfg.foils.rudder.area*clamp(hydroV15.params.rudderDeployment,0,1),normalForce=q*CL;
    return -normalForce*(cfg.foils.rudder.area/cfg.foils.rudder.span)*.27;
  }

  function advanceSteering(dt,hingeOverride){
    try{
      const m=hydroV15.metrics(),measured=m.rudder?.hingeTorqueNm;
      const hinge=Number.isFinite(hingeOverride)?hingeOverride:(Number.isFinite(measured)?measured:computeIndependentHinge());state.hydroHingeTorqueNm=hinge;
      const strength=clamp(params.holdStrength,0,1),k=params.springMinNmRad+(params.springMaxNmRad-params.springMinNmRad)*strength,maxHand=params.minHandTorqueNm+(params.maxHandTorqueNm-params.minHandTorqueNm)*strength;
      const c=2*params.dampingRatio*Math.sqrt(Math.max(.001,k*params.tillerInertiaKgm2)),err=state.targetAngleRad-state.angleRad;
      // A retained command behaves like a sailor's arm/extension system: elastic position
      // authority plus velocity damping, both limited by finite available hand torque.
      // Semi-implicit integration and a physical rate bound prevent high-load chatter.
      const requested=k*err-c*state.rateRadS,hand=clamp(requested,-maxHand,maxHand),passive=-params.pivotDampingNms*state.rateRadS;
      const net=hand+hinge+passive;state.rateRadS+=net/params.tillerInertiaKgm2*dt;
      const maxRate=params.maxTillerRateDegS*Math.PI/180;state.rateRadS=clamp(state.rateRadS,-maxRate,maxRate);
      state.angleRad+=state.rateRadS*dt;
      if(state.angleRad>maxAngle){state.angleRad=maxAngle;if(state.rateRadS>0)state.rateRadS=0;}if(state.angleRad<-maxAngle){state.angleRad=-maxAngle;if(state.rateRadS<0)state.rateRadS=0;}
      hydro.rudderAngle=state.angleRad;input.state.tiller=-state.angleRad/maxAngle;state.handTorqueNm=hand;state.requiredHoldTorqueNm=Math.abs(hinge+passive);state.holdUtilization=Math.abs(hand)/Math.max(1e-6,maxHand);state.finite=Number.isFinite(state.angleRad+state.rateRadS+hand+hinge);state.steps++;return state.angleRad;
    }catch(e){state.finite=false;state.lastError=e instanceof Error?e.message:String(e);console.error(VERSION,e);return state.angleRad;}
  }
  function steeringHook(dt){advanceSteering(dt);}
  master.physics.forceHooks.push(steeringHook);

  const originalReset=window.__sim?.reset?.bind(window.__sim);if(originalReset)window.__sim.reset=function(){const r=originalReset();state.targetAngleRad=0;state.angleRad=0;state.rateRadS=0;hydro.rudderAngle=0;input.state.tiller=0;return r;};
  function setTargetDeg(deg){state.targetAngleRad=clamp(deg*Math.PI/180,-maxAngle,maxAngle);return metrics();}
  function resetSteering(deg=0){const a=clamp(deg*Math.PI/180,-maxAngle,maxAngle);state.targetAngleRad=a;state.angleRad=a;state.rateRadS=0;state.handTorqueNm=0;state.hydroHingeTorqueNm=0;hydro.rudderAngle=a;input.state.tiller=-a/maxAngle;return metrics();}
  function diagnosticSettle({holdStrength=params.holdStrength,targetDeg=0,initialDeg=0,hingeTorqueNm=0,seconds=3,dt=1/360}={}){const saved=params.holdStrength;params.holdStrength=clamp(holdStrength,0,1);resetSteering(initialDeg);setTargetDeg(targetDeg);const n=Math.max(1,Math.ceil(seconds/dt));for(let i=0;i<n;i++)advanceSteering(dt,hingeTorqueNm);const out=metrics();params.holdStrength=saved;return out;}
  function metrics(){return {version:VERSION,targetDeg:state.targetAngleRad*180/Math.PI,actualDeg:state.angleRad*180/Math.PI,rateDegS:state.rateRadS*180/Math.PI,handTorqueNm:state.handTorqueNm,hydroHingeTorqueNm:state.hydroHingeTorqueNm,requiredHoldTorqueNm:state.requiredHoldTorqueNm,holdUtilization:state.holdUtilization,holdStrength:params.holdStrength,maxAngleDeg:maxAngle*180/Math.PI,inputActive:state.inputActive,finite:state.finite,steps:state.steps,lastError:state.lastError,geometry:{boardCorrect:!!visual.board,rudderCorrect:!!visual.rudder,tillerCorrect:!!visual.tiller,boardRotationYDeg:visual.board?visual.board.rotation.y*180/Math.PI:null,rudderRotationYDeg:visual.rudder?visual.rudder.rotation.y*180/Math.PI:null,rudderAft:visual.rudder?visual.rudder.position.z<-.08:null,tillerForward:visual.tiller?visual.tiller.position.z>0:null},water:{incidentWaveCount:field.metrics().incidentWaveCount,analyticWake:field.metrics().analyticWake,externalMomentumEvents:field.metrics().externalMomentumEvents,externalMomentumImpulseNs:field.metrics().externalMomentumImpulseNs},sourceModified:true};}

  function addUI(){const lab=document.querySelector('.laser2-lab');if(!lab||document.getElementById('laser2-v15-steering'))return;const sec=document.createElement('section');sec.id='laser2-v15-steering';sec.innerHTML=`<h3>V15 · ELASTIC TILLER / REACTIVE APPENDAGES</h3><table><tbody><tr><td>target</td><td id="v15-target">—</td></tr><tr><td>actual</td><td id="v15-actual">—</td></tr><tr><td>hinge / hand</td><td id="v15-load">—</td></tr><tr><td>geometry</td><td>board + rudder planes fore–aft</td></tr></tbody></table><label>tiller hold <input id="v15-hold" type="range" min="0" max="1" step="0.01" value="${params.holdStrength}"> <span id="v15-hold-v">${params.holdStrength.toFixed(2)}</span></label><label>target <input id="v15-target-slider" type="range" min="-${maxAngle*180/Math.PI}" max="${maxAngle*180/Math.PI}" step="0.5" value="0"> <span id="v15-target-v">0.0°</span></label><div class="truth">A/D MOVES THE DESIRED TILLER POSITION. RELEASING THE KEY RETAINS THAT POSITION. THE RUDDER MAY DEFLECT AWAY FROM IT WHEN HYDRODYNAMIC HINGE LOAD EXCEEDS THE SELECTED ELASTIC HAND-HOLD TORQUE.</div>`;lab.appendChild(sec);const h=sec.querySelector('#v15-hold'),hv=sec.querySelector('#v15-hold-v');h.oninput=()=>{params.holdStrength=+h.value;hv.textContent=params.holdStrength.toFixed(2);};const t=sec.querySelector('#v15-target-slider'),tv=sec.querySelector('#v15-target-v');t.oninput=()=>{setTargetDeg(+t.value);tv.textContent=(+t.value).toFixed(1)+'°';};}
  function refresh(){addUI();const m=metrics(),set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};set('v15-target',m.targetDeg.toFixed(1)+'° retained');set('v15-actual',m.actualDeg.toFixed(1)+'° · '+m.rateDegS.toFixed(1)+'°/s');set('v15-load',m.hydroHingeTorqueNm.toFixed(1)+' / '+m.handTorqueNm.toFixed(1)+' N·m · '+(100*m.holdUtilization).toFixed(0)+'%');let hud=document.getElementById('laser2-v15-hud');if(!hud){const a=document.getElementById('laser2-v14-hud')||document.querySelector('.bottom-left');hud=document.createElement('div');hud.id='laser2-v15-hud';hud.className='rig-state';a.after(hud);}hud.textContent=`V15 TILLER · TARGET ${m.targetDeg.toFixed(1)}° · ACTUAL ${m.actualDeg.toFixed(1)}° · LOAD ${m.requiredHoldTorqueNm.toFixed(1)} N·m · HOLD ${(100*m.holdStrength).toFixed(0)}%`;}
  const oldMetrics=window.__labMetrics;window.__labMetrics=function(){const b=typeof oldMetrics==='function'?oldMetrics():{};return {...b,elasticSteeringV15:metrics()};};
  window.LASER2_ELASTIC_STEERING_V15={VERSION,params,state,metrics,setTargetDeg,resetSteering,diagnosticSettle,advanceSteering,visual,receipt:Object.freeze({geometry:'centerboard and rudder broad faces rotated into the vertical fore-aft plane',control:'retained commanded tiller angle with elastic-damped finite hand torque',load:'hydrodynamic rudder hinge moment scales with water-relative speed and may deflect the tiller',water:'appendage forces deposit equal-and-opposite depth-attenuated momentum into the reactive heightfield'})};
  document.head.appendChild(Object.assign(document.createElement('style'),{textContent:'#laser2-v15-steering{border-top:1px solid rgba(255,190,92,.55)}'}));let last=0;function frame(t){if(t-last>180){last=t;refresh();}requestAnimationFrame(frame)}requestAnimationFrame(frame);document.title='Laser 2 — Reactive Cut-Cell Water + Elastic Tiller V15';console.info(VERSION+' initialized',metrics());
})();
