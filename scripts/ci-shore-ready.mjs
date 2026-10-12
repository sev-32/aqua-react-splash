/**
 * T2 shoreline acceptance capture. Source renderer only, no generated imagery.
 * IMPORTANT: do not mark shore coupled until warm-up has finished and fade >0.95.
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
const out='captures/shore-ready-r1';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
page.setDefaultTimeout(180000);
const errors=[],images=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const capture=async (name,n,dt=1/30)=>{
 if(n>1)await page.evaluate(({n,dt})=>window.__THALASSA__.simulate(n-1,dt),{n,dt});
 await page.evaluate(dt=>window.__THALASSA__.step(1,dt),dt);
 const state=await page.evaluate(()=>{
  const api=window.__THALASSA__,mods=window.__THALASSA_MODULES__,sh=mods.shore;
  const ledger=mods.splash.ledger.audit(mods.splash.mpm.stats);
  return {time:api.engine.time,glError:api.glError(),shoreActive:sh.active,hasField:!!sh.field,
   fade:sh.field?.fade??null,warm:sh.field?.warm??null,lag:sh.field?.clock==null?null:api.engine.time-sh.field.clock,
   volume:sh.field?.volume??null,released:sh.field?.releasedVolume??null,events:sh.events.slice(-8),
   water:ledger,renderer:api.telemetry().gpuRenderer};
 });
 await page.screenshot({path:out+'/'+name+'.png',timeout:180000});
 images.push({name,...state});
 console.log('SHORE SHOT',name,JSON.stringify(state).slice(0,1300));
 return state;
};
try{
 await page.goto('http://127.0.0.1:4173/ocean?capture=1&quality=capture&seed=20260925',{waitUntil:'domcontentloaded',timeout:180000});
 await page.waitForFunction(()=>window.__THALASSA__?.ready===true,null,{timeout:180000});
 const e=await page.evaluate(()=>window.__THALASSA__.error);if(e)throw Error(e);
 await page.addStyleTag({content:'main > :not(canvas){display:none!important}'});
 await page.evaluate(()=>{
  const a=window.__THALASSA__;a.set('weather.coupleSea',false);a.set('sea.morph',5.3);a.applySea();
  a.action('goToShore','surf');
 });
 await capture('SHORE_00_UNREADY_CONTROL',2);
 const ready=await capture('SHORE_01_SPUN_UP_SURF',54);
 if(!ready.shoreActive || (ready.fade??0)<0.95) errors.push('shore warm-up not completed: '+JSON.stringify({warm:ready.warm,fade:ready.fade,lag:ready.lag}));
 await page.evaluate(()=>window.__THALASSA__.action('goToShore','beach'));
 await capture('SHORE_02_BEACH_CAMERA',5);
 await page.evaluate(()=>window.__THALASSA__.action('goToShore','aerial'));
 await capture('SHORE_03_ACTIVE_T2_AERIAL',5);
 await page.evaluate(()=>window.__THALASSA__.action('goToShore','surf'));
 await capture('SHORE_04_EVOLVED_SURF',30);
}catch(e){errors.push('fatal: '+String(e));console.error(e);}
finally{fs.writeFileSync(out+'/receipts.json',JSON.stringify({sha:process.env.GITHUB_SHA,images,errors},null,2));await browser.close();}
if(errors.length)process.exitCode=1;
