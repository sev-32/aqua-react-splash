/** A controlled shader probe. All five screenshots are the SAME physical frame
 * to ~10^-6 seconds. Only the SSFR visual output is changed. No synthetic images.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
const out='captures/ssfr-probe';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const manifest={sourceCommit:process.env.GITHUB_SHA,url:'http://127.0.0.1:4173/ocean?capture=1&quality=capture&seed=20260925',images:[],errors};
try {
 await page.goto(manifest.url,{waitUntil:'domcontentloaded',timeout:180000});
 await page.waitForFunction(()=>window.__THALASSA__?.ready===true,null,{timeout:180000});
 const e=await page.evaluate(()=>window.__THALASSA__.error);
 if(e)throw Error(e);
 await page.addStyleTag({content:'main > :not(canvas){display:none!important}'});
 await page.evaluate(()=>{
  const a=window.__THALASSA__,mods=window.__THALASSA_MODULES__;
  a.action('lab',{scene:'tow',speed:4.5,y:0.12,radius:0.6,tileDepth:5});
  a.simulate(34,1/30);
  const b=mods.bodies.bodies[0],speed=Math.hypot(b.vel[0],b.vel[2]);
  const ux=speed>.15?b.vel[0]/speed:1, uz=speed>.15?b.vel[2]/speed:0;
  const sx=-uz,sz=ux;
  const target=[b.pos[0]-ux*.7,.35,b.pos[2]-uz*.7];
  const pos=[b.pos[0]-ux*3.4+sx*1.7,1.65,b.pos[2]-uz*3.4+sz*1.7];
  const dx=target[0]-pos[0],dz=target[2]-pos[2],dy=target[1]-pos[1];
  a.engine.camera.setPose({position:pos,yawDeg:Math.atan2(dz,dx)*180/Math.PI,
   pitchDeg:Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI,fovDeg:62});
 });
 for(const mode of [0,1,2,3,4]){
  const result=await page.evaluate(mode=>{
   const a=window.__THALASSA__,m=window.__THALASSA_MODULES__;
   window.__THALASSA_SSFR_DEBUG__=mode<4?mode:0;
   a.set('spray.render',mode===4?'points':'fluid');
   a.step(1,1e-7);
   return {time:a.engine.time,glError:a.glError(),mode,
    live:m.splash.mpm.stats.alive,water:m.splash.ledger.audit(m.splash.mpm.stats)};
  },mode);
  const file=out+'/SSFR_'+mode+'_'+(['original','coverage','scene','depth','points'][mode])+'.png';
  await page.screenshot({path:file,timeout:180000});
  manifest.images.push({file,...result});
  console.log('PROBE',file,fs.statSync(file).size,result);
 }
}catch(e){errors.push('fatal: '+String(e));console.error('FATAL',e);}
finally{fs.writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2));await browser.close();}
if(manifest.images.length!==5) process.exitCode=1;
