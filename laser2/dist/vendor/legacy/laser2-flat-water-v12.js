(()=>{
  "use strict";
  const VERSION="LASER2_FLAT_REACTIVE_HULL_HEIGHTFIELD_V12_20260713";
  const master=window.LASER2_CREW_RIGGING_MASTER_V2,water=window.LASER2_WATER_INTERNAL,ocean=window.LASER2_OCEAN_V4,hf=window.LASER2_HEIGHTFIELD_V5;
  if(!master?.renderer||!water||!ocean||!hf){console.error(VERSION+': required runtime unavailable');return;}
  const state={guards:0,lastGuard:0,sourceModified:true,finite:true,lastError:null};
  function zeroVecAmplitude(v){if(v&&typeof v.set==='function')v.set(v.x||0,v.y||0,v.z||0,0);}
  function enforceFlat(){
    try{
      const U=water.uniforms||{},UF=water.uniformsFar||{};
      for(const set of [U.uWaveB?.value,UF.uWaveB?.value])if(Array.isArray(set))for(const v of set){v.x=0;v.y=0;v.z=0;v.w=0;}
      for(const set of [U.uMicroB?.value,UF.uMicroB?.value])if(Array.isArray(set))for(const v of set){v.x=0;v.y=0;v.z=0;v.w=0;}
      for(const obj of [U,UF]){
        if(obj.uWaveCount)obj.uWaveCount.value=0;if(obj.uMicroCount)obj.uMicroCount.value=0;
        if(obj.uHs)obj.uHs.value=0;if(obj.uTp)obj.uTp.value=0;if(obj.uWindSpeed)obj.uWindSpeed.value=0;
        if(obj.uSceneOptics)obj.uSceneOptics.value=0;
      }
      water.comp=[];
      ocean.state.modes=[];ocean.state.micro=[];ocean.state.physicsModes=[];ocean.state.HsM=0;ocean.state.TpS=0;ocean.state.windHsM=0;ocean.state.spectrumVariance=0;ocean.state.physicsVarianceCoverage=0;
      ocean.params.sceneOptics=false;ocean.params.swellHsM=0;ocean.params.chop=0;
      state.guards++;state.lastGuard=performance.now();
    }catch(e){state.finite=false;state.lastError=String(e);console.error(VERSION,e);}
  }
  enforceFlat();

  function unifyLocalMaterial(){
    const lm=hf.localMesh?.material;if(!lm)return;
    lm.fragmentShader=water.matNear.fragmentShader;
    lm.uniforms.uLocalCutoutCenter=water.matNear.uniforms.uLocalCutoutCenter;
    lm.uniforms.uLocalCutoutSize=water.matNear.uniforms.uLocalCutoutSize;
    lm.uniforms.uLocalCutoutEnabled={value:0};
    lm.needsUpdate=true;
  }
  unifyLocalMaterial();
  water.setSea=function(){enforceFlat();};
  ocean.rebuildSpectrum=function(){enforceFlat();return ocean.metrics();};
  document.head.appendChild(Object.assign(document.createElement('style'),{textContent:`
    #laser2-ocean-v4,#laser2-o4-hud{display:none!important}
    #laser2-v12-panel{border-top:1px solid rgba(126,231,135,.35)}
  `}));
  function metrics(){
    enforceFlat();const h=hf.metrics(),gl=master.renderer.getContext();
    const waveCount=water.uniforms?.uWaveCount?.value||0,microCount=water.uniforms?.uMicroCount?.value||0;
    let maxSigmaDot=0,maxPen=0;for(let i=0;i<hf.fields.sigmaDot.length;i++){maxSigmaDot=Math.max(maxSigmaDot,Math.abs(hf.fields.sigmaDot[i]));maxPen=Math.max(maxPen,hf.fields.penetration[i]);}
    return {version:VERSION,incidentHeightM:0,incidentVelocityMps:[0,0,0],waveCount,microCount,flatAuthority:waveCount===0&&microCount===0,spectrumDisabled:true,grid:h.grid,sizeM:h.sizeM,dxM:h.dxM,effectiveDepthM:h.effectiveDepthM,solverHz:h.solverHz,steps:h.steps,maxEtaM:h.maxEtaM,maxSpeedMps:h.maxSpeedMps,maxSigmaM:h.maxSigmaM,maxSigmaDotMps:maxSigmaDot,maxPenetrationM:maxPen,displacedVolumeM3:h.displacedVolumeM3,residualVolumeM3:h.residualVolumeM3,reactionForceN:h.reactionForceN,queryCoverage:h.queryCoverage,cfl:h.cfl,finite:h.finite&&state.finite&&!gl.isContextLost(),glError:gl.getError(),contextLost:gl.isContextLost(),hydrodynamicAuthority:'Phase-7-style occupancy SWE: m = H + eta - sigma; transformed procedural Laser hull replaces sphere',wakeAuthority:'none analytic; all disturbance is solver reaction',buoyancyAuthority:'existing Laser hydro/foil samples query eta and velocity from this field only',sourceModified:true,lastError:state.lastError||h.lastError};
  }
  const previous=window.__labMetrics;window.__labMetrics=function(){const b=typeof previous==='function'?previous():{};return {...b,flatReactiveV12:metrics()};};
  window.LASER2_FLAT_REACTIVE_V12={VERSION,state,params:hf.params,fields:hf.fields,metrics,reset:hf.reset,enforceFlat,reference:'Aqua Phase 7 occupancy SWE/FSS with the procedural Laser hull substituted for the sphere'};
  function addPanel(){const lab=document.querySelector('.laser2-lab');if(!lab||document.getElementById('laser2-v12-panel'))return;const sec=document.createElement('section');sec.id='laser2-v12-panel';sec.innerHTML=`<h3>V12 · PURE REACTION CONTRACT</h3><table><tbody><tr><td>incident sea</td><td>0.000 m / 0.000 m·s⁻¹</td></tr><tr><td>wave generators</td><td>disabled: spectrum / Gerstner / Kelvin</td></tr><tr><td>solid</td><td>full transformed Laser hull columns</td></tr><tr><td>coupling</td><td>same eta/u field drives render, buoyancy and foils</td></tr><tr><td>state</td><td id="v12-state">initializing</td></tr></tbody></table><button id="v12-reset" style="width:100%">RESET TO PERFECTLY FLAT WATER</button>`;lab.appendChild(sec);sec.querySelector('#v12-reset').onclick=()=>{hf.reset('v12-flat-reset');enforceFlat();};}
  let hud=null,last=0;function frame(t){if(t-last>300){last=t;enforceFlat();addPanel();const m=metrics(),e=document.getElementById('v12-state');if(e)e.textContent=`${m.finite?'FINITE':'FAULT'} · η ${m.maxEtaM.toFixed(3)}m · σ ${m.displacedVolumeM3.toFixed(3)}m³ · CFL ${m.cfl.toFixed(3)}`;if(!hud){const a=document.querySelector('#laser2-h5-hud')||document.querySelector('.bottom-left');hud=document.createElement('div');hud.id='laser2-v12-hud';hud.className='rig-state';a.after(hud);}hud.textContent=`FLAT REACTIVE V12 · NO INCIDENT WAVES · η ${m.maxEtaM.toFixed(3)}m · U ${m.maxSpeedMps.toFixed(2)}m/s · σ ${m.displacedVolumeM3.toFixed(3)}m³`; }requestAnimationFrame(frame)}requestAnimationFrame(frame);
  document.title='Laser 2 — Flat Reactive Hull Heightfield V12';console.info(VERSION+' initialized',metrics());
})();
