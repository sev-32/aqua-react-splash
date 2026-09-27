(()=>{
  "use strict";
  const master=window.LASER2_CREW_RIGGING_MASTER_V2||window.LASER2_CREW_RIGGING_MASTER_V1;
  if(!master) return;
  const originalMetrics=window.__labMetrics;
  const Vec3=master.boat.position.constructor;
  const tempBoat=new Vec3(), tempQuat=master.boat.quaternion.clone(), tempOffset=new Vec3();
  const history={helm:{point:null,time:performance.now(),velocity:[0,0]},crew:{point:null,time:performance.now(),velocity:[0,0]}};
  const cameraAudit={guardCorrections:0,lastDistanceM:0,finite:true};
  const receipt=Object.freeze({
    release:"3.0.0",
    sourceBaseline:"LASER2 Biomechanics + Rigging Lab V2",
    camera:"bounded-dt-first-frame-snap-plus-runtime-finite-guard",
    sideSwitch:"role-phased-seat-transfer-with-continuous-minimum-one-foot-contact",
    supportAudit:"contact-ledger-convex-support-polygon-com-and-capture-point-proxy",
    physicalMainsheet:"preserved-frictionless-four-segment-force-coupled-reeved-xpbd",
    ropeVisuals:"bidirectional-constraint-projection-with-target-jump-reset",
    avatarPresets:"bundled-local-vrm-presets-with-validated-retarget-and-procedural-fallback",
    certifiedDesignModel:false
  });

  master.tuning?.set?.("boomSafetyMm",150);
  master.tuning?.set?.("cableDecay",16);
  master.tuning?.set?.("cableFollow",56);

  function finitePoint(p){return p&&Number.isFinite(p.x+p.y+p.z)}
  function dist2(a,b){const x=a[0]-b[0],y=a[1]-b[1];return x*x+y*y}
  function convexHull(points){
    const pts=points.map(p=>[p[0],p[1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    if(pts.length<=1) return pts;
    const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const lo=[]; for(const p of pts){while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
    const hi=[]; for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(hi.length>=2&&cross(hi[hi.length-2],hi[hi.length-1],p)<=0)hi.pop();hi.push(p)}
    lo.pop();hi.pop();return lo.concat(hi);
  }
  function pointSegmentDistance(p,a,b){
    const vx=b[0]-a[0],vy=b[1]-a[1],wx=p[0]-a[0],wy=p[1]-a[1],d=vx*vx+vy*vy;
    const t=d>1e-12?Math.max(0,Math.min(1,(wx*vx+wy*vy)/d)):0;
    return Math.hypot(p[0]-(a[0]+vx*t),p[1]-(a[1]+vy*t));
  }
  function signedMargin(poly,p){
    if(poly.length===0)return null;
    if(poly.length===1)return -Math.sqrt(dist2(poly[0],p));
    if(poly.length===2)return -pointSegmentDistance(p,poly[0],poly[1]);
    let inside=false,min=Infinity;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const a=poly[j],b=poly[i];
      if(((a[1]>p[1])!==(b[1]>p[1]))&&(p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1]+1e-12)+a[0]))inside=!inside;
      min=Math.min(min,pointSegmentDistance(p,a,b));
    }
    return inside?min:-min;
  }
  function actorAudit(role,actor){
    const contacts=[];
    if(actor.seatContactActive&&finitePoint(actor.pelvis))contacts.push({kind:"seat",point:[actor.pelvis.x,actor.pelvis.z],height:actor.pelvis.y});
    for(let i=0;i<2;i++)if((actor.feetPlant?.[i]||0)>.5&&finitePoint(actor.feet?.[i]))contacts.push({kind:`foot${i}`,point:[actor.feet[i].x,actor.feet[i].z],height:actor.feet[i].y});
    const hull=convexHull(contacts.map(c=>c.point));
    const com=actor.articulatedComLocal;
    const comPoint=finitePoint(com)?[com.x,com.z]:[0,0];
    const now=performance.now(), h=history[role], dt=Math.max(1/240,Math.min(.1,(now-h.time)/1000));
    if(h.point){h.velocity[0]=(comPoint[0]-h.point[0])/dt;h.velocity[1]=(comPoint[1]-h.point[1])/dt}
    h.point=[...comPoint];h.time=now;
    const supportY=contacts.length?contacts.reduce((a,c)=>a+c.height,0)/contacts.length:0;
    const omega=Math.sqrt(9.81/Math.max(.35,Math.abs((com?.y||1)-supportY)));
    const capture=[comPoint[0]+h.velocity[0]/omega,comPoint[1]+h.velocity[1]/omega];
    const sheetN=Math.max(0,master.rig?.sheetC?.tailTensionN||0);
    const supportPenalty=contacts.length>=3?0:contacts.length===2?.12:.35;
    const effort=Math.max(0,Math.min(1,sheetN/350+(actor.crouch||0)*.18+(actor.lean||0)*.12+supportPenalty));
    return {
      contactCount:contacts.length,contacts,supportPolygon:hull,supportMode:hull.length>=3?"polygon":hull.length===2?"line":hull.length===1?"point":"none",
      comXZ:comPoint,capturePointXZ:capture,comMarginM:signedMargin(hull,comPoint),captureMarginM:signedMargin(hull,capture),
      horizontalComVelocityMps:[...h.velocity],effortProxy01:effort,seatContact:!!actor.seatContactActive,plantedFeet:actor.feetPlant?.filter(v=>v>.5).length||0,
      crossingProgress01:actor.crossing?.t??null,boomAvoidance01:actor.boomAvoidance||0
    };
  }
  function rigAudit(){
    const r=master.rig?.sheetC, tension=Math.max(0,r?.workingTensionN||0), wraps=Array.from(r?.wrapAngles||[]);
    return {tailGripLoadN:Math.max(0,r?.tailTensionN||0),boomTackleResultantN:tension*(r?.segmentLengths?.length||0),sheaveBearingLoadsN:wraps.map(a=>2*tension*Math.sin(Math.abs(a)/2)),capstanFrictionMode:"not modeled; ideal frictionless sheaves preserved"};
  }
  function enhancedMetrics(){
    const base=typeof originalMetrics==="function"?originalMetrics():{};
    return {...base,v3:{helm:actorAudit("helm",master.helm),crew:actorAudit("crew",master.crew),rig:rigAudit(),camera:{...cameraAudit},avatar:window.LASER2_VRM_RUNTIME?.status?.()||null,receipt}};
  }
  window.__labMetrics=enhancedMetrics;

  async function loadBundledAvatar(role,fileName){
    const runtime=window.LASER2_VRM_RUNTIME;
    if(!runtime)throw new Error("VRM runtime is not initialized.");
    const response=await fetch(`models/${fileName}`,{cache:"force-cache"});
    if(!response.ok)throw new Error(`Bundled avatar ${fileName} returned HTTP ${response.status}. Start the included local server.`);
    const blob=await response.blob();
    const file=new File([blob],fileName,{type:"model/gltf-binary",lastModified:Date.now()});
    return runtime.loadFile(role,file);
  }
  async function waitForPoseReady(timeoutMs=30000){
    const start=performance.now();
    while(performance.now()-start<timeoutMs){
      const h=master.helm?.articulatedComLocal,c=master.crew?.articulatedComLocal;
      if(master.helm?.comValid&&master.crew?.comValid&&finitePoint(h)&&finitePoint(c)&&h.lengthSq()>.1&&c.lengthSq()>.1&&master.helm.seatContactActive&&master.crew.seatContactActive)return true;
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    return false;
  }
  async function loadPresetPair(){
    const results=await Promise.allSettled([loadBundledAvatar("helm","Seed-san.vrm"),loadBundledAvatar("crew","VRM1_Constraint_Twist_Sample.vrm")]);
    const failed=results.filter(r=>r.status==="rejected");
    if(failed.length)throw new Error(failed.map(r=>r.reason?.message||String(r.reason)).join(" | "));
    return results.map(r=>r.value);
  }
  function proceduralFallback(){window.LASER2_VRM_RUNTIME?.fallback?.("helm");window.LASER2_VRM_RUNTIME?.fallback?.("crew")}

  function cameraGuard(){
    const camera=master.camera;
    if(!camera)return;
    master.boat.getWorldPosition(tempBoat);master.boat.getWorldQuaternion(tempQuat);
    const finite=finitePoint(camera.position),distance=finite?camera.position.distanceTo(tempBoat):Infinity;
    cameraAudit.finite=finite;cameraAudit.lastDistanceM=distance;
    if(!finite||distance>80){
      tempOffset.set(-7,3,-7).applyQuaternion(tempQuat).add(tempBoat);camera.position.copy(tempOffset);camera.lookAt(tempBoat.x,tempBoat.y+1.15,tempBoat.z);cameraAudit.guardCorrections++;
    }
  }

  function td(row,label,id){const a=document.createElement("td"),b=document.createElement("td");a.textContent=label;b.id=id;row.append(a,b)}
  function addAuditUI(){
    const panel=document.querySelector(".laser2-lab");if(!panel||panel.querySelector("#laser2-v3-section"))return false;
    const title=panel.querySelector("h2");if(title)title.textContent="BIOMECH + RIG LAB V3";
    const section=document.createElement("section");section.id="laser2-v3-section";
    section.innerHTML=`<h3>BUNDLED VALIDATED AVATARS</h3><div class="role"><strong>PAIR</strong><span class="status" id="v3-avatar-status">procedural fallback active</span><span><button id="v3-load-pair">LOAD VRM PAIR</button> <button id="v3-fallback">FALLBACK</button></span></div><div class="truth">HTTP LOCAL SERVER REQUIRED FOR BUNDLED PRESETS · MANUAL LOCAL FILE LOADING REMAINS AVAILABLE ABOVE</div>`;
    panel.appendChild(section);
    const audit=document.createElement("section");audit.innerHTML=`<h3>WHOLE-BODY SUPPORT / RIG AUDIT</h3><table><tbody>
      <tr><td>helm support</td><td id="v3-helm-support">—</td></tr><tr><td>helm COM margin</td><td id="v3-helm-com">—</td></tr><tr><td>helm capture margin</td><td id="v3-helm-cp">—</td></tr>
      <tr><td>crew support</td><td id="v3-crew-support">—</td></tr><tr><td>crew COM margin</td><td id="v3-crew-com">—</td></tr><tr><td>crew capture margin</td><td id="v3-crew-cp">—</td></tr>
      <tr><td>tail grip load</td><td id="v3-grip">—</td></tr><tr><td>camera guard</td><td id="v3-camera">—</td></tr></tbody></table><div class="truth">CAPTURE POINT AND EFFORT ARE EXPLICIT DYNAMIC PROXIES; MAIN SHEET TENSION REMAINS THE XPBD AUTHORITY.</div>`;panel.appendChild(audit);
    const status=section.querySelector("#v3-avatar-status");
    section.querySelector("#v3-load-pair").addEventListener("click",async()=>{status.textContent="loading bundled VRM pair…";try{await loadPresetPair();status.textContent="VRM pair active"}catch(e){status.textContent=e.message;status.classList.add("error")}});
    section.querySelector("#v3-fallback").addEventListener("click",()=>{proceduralFallback();status.classList.remove("error");status.textContent="procedural fallback active"});
    return true;
  }
  function fmtMargin(v){return Number.isFinite(v)?`${(v*1000).toFixed(0)} mm`:"—"}
  function refreshUI(){
    addAuditUI();const m=enhancedMetrics(),v=m.v3;if(!v)return;
    const set=(id,text)=>{const e=document.getElementById(id);if(e)e.textContent=text};
    set("v3-helm-support",`${v.helm.contactCount} · ${v.helm.supportMode}`);set("v3-helm-com",fmtMargin(v.helm.comMarginM));set("v3-helm-cp",fmtMargin(v.helm.captureMarginM));
    set("v3-crew-support",`${v.crew.contactCount} · ${v.crew.supportMode}`);set("v3-crew-com",fmtMargin(v.crew.comMarginM));set("v3-crew-cp",fmtMargin(v.crew.captureMarginM));
    set("v3-grip",`${v.rig.tailGripLoadN.toFixed(0)} N`);set("v3-camera",`${v.camera.guardCorrections} corrections`);
    const s=document.getElementById("v3-avatar-status"),st=v.avatar;if(s&&st){s.textContent=`helm ${st.helm.state} · crew ${st.crew.state}`;s.classList.toggle("error",st.helm.state==="error"||st.crew.state==="error")}
    let hud=document.getElementById("laser2-v3-hud");if(!hud){const anchor=document.querySelector(".bottom-left .rig-state");if(anchor){hud=document.createElement("div");hud.id="laser2-v3-hud";hud.className="rig-state";anchor.after(hud)}}
    if(hud)hud.textContent=`WHOLE BODY · H ${v.helm.contactCount} / C ${v.crew.contactCount} CONTACTS · GRIP ${v.rig.tailGripLoadN.toFixed(0)} N`;
  }

  window.LASER2_EVOLUTION_V3={receipt,metrics:enhancedMetrics,loadBundledAvatar,loadPresetPair,waitForPoseReady,proceduralFallback,cameraAudit};
  let last=0;function frame(now){cameraGuard();if(now-last>120){refreshUI();last=now}requestAnimationFrame(frame)}requestAnimationFrame(frame);
  if(/^https?:$/.test(location.protocol)&&!new URLSearchParams(location.search).has("procedural"))setTimeout(()=>waitForPoseReady().then(()=>loadPresetPair()).catch(e=>console.warn("LASER2 V3 bundled avatar autoload fell back:",e)),900);
})();
