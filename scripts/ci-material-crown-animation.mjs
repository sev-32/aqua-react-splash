/** Genuine WebGL2 time sequence: two render modes of the SAME particle
 * trajectory, not a synthesized animation. V4 was registered at particle
 * birth and uses the original advected MLS-MPM positions each frame.
 */
import fs from 'node:fs';
import {chromium} from 'playwright';
const out='captures/material-v4-frames';
fs.mkdirSync(out,{recursive:true});
const W=960,H=540;
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--use-angle=swiftshader','--ignore-gpu-blocklist',
 '--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
page.setDefaultTimeout(180000);
const errors=[],shots=[];
page.on('pageerror',e=>errors.push('page:'+e));
page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text())});
try{
 await page.goto('http://127.0.0.1:4173/ocean?capture=1&quality=capture&seed=20260925',
  {waitUntil:'domcontentloaded',timeout:180000});
 await page.waitForFunction(()=>window.__THALASSA__?.ready===true,null,{timeout:180000});
 await page.addStyleTag({content:'main > :not(canvas){display:none!important}'});
 await page.evaluate(()=>{
   const a=window.__THALASSA__;
   a.action('lab',{scene:'drop',radius:0.6,depth:5,tileDepth:5});
   a.set('spray.render','fluid');
 });
 await page.evaluate(()=>window.__THALASSA__.simulate(27,1/60));
 for(let frame=0;frame<10;frame++){
   await page.evaluate(()=>window.__THALASSA__.simulate(7,1/60));
   await page.evaluate(()=>{
     const a=window.__THALASSA__,b=window.__THALASSA_MODULES__.bodies.bodies[0];
     if(!b)throw Error('missing physical sphere');
     const [x,y,z]=b.pos,eye=[x-3.3,1.85,z-2.7],target=[x,Math.max(.3,y*.25+.48),z];
     const dx=target[0]-eye[0],dy=target[1]-eye[1],dz=target[2]-eye[2];
     a.engine.camera.setPose({position:eye,
      yawDeg:Math.atan2(dz,dx)*180/Math.PI,
      pitchDeg:Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI,fovDeg:52});
   });
   for(const v of [0,4]){
     const result=await page.evaluate(v=>{
       const a=window.__THALASSA__,m=window.__THALASSA_MODULES__;
       m.splash.renderer.surfaceMeshV3=false;
       m.splash.renderer.morphologyV2=false;
       m.splash.renderer.materialSheetV4=v===4;
       a.step(1,1e-7);
       return {
         time:a.engine.time,glError:a.glError(),variant:v,
         mesh:m.splash.renderer.meshStats,
         materialRings:m.splash.mpm.materialCrown.recordedRings,
         materialReleases:m.splash.mpm.materialCrown.recordedEmissions,
         ledger:m.splash.ledger.audit(m.splash.mpm.stats),
         particleCount:m.splash.mpm.stats.alive,
       };
     },v);
     const filename='F'+String(frame).padStart(2,'0')+'_V'+v+'.png';
     await page.screenshot({path:out+'/'+filename,timeout:180000});
     shots.push({file:filename,frame,...result});
     console.log('FRAME',frame,'V',v,'t',result.time.toFixed(4),
      'faces',result.mesh?.triangles,'rings',result.materialRings,
      'gl',result.glError,'bytes',fs.statSync(out+'/'+filename).size);
     if(result.glError!==0)errors.push('WebGL error '+filename+':'+result.glError);
   }
 }
}catch(e){errors.push('fatal:'+e);console.error(e)}
finally{
 fs.writeFileSync(out+'/receipts.json',JSON.stringify({sha:process.env.GITHUB_SHA,
  width:W,height:H,framePeriodSeconds:7/60,shots,errors},null,2));
 await browser.close();
}
if(shots.length!==20||errors.length)process.exitCode=1;
