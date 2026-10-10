/**
 * Non-destructive champion recovery audit: render preserved original pool as-is,
 * then modern ocean lab as-is. Not the same physical initial conditions or
 * equivalent world scales: this is a source/rendering lineage comparison.
 * Never claim an optical/physics winner from screenshots alone.
 *
 * The original six champion files remain byte-identical to the registry.
 */
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync,statSync} from 'node:fs';
const OUT='captures/pool-ocean-champion';
mkdirSync(OUT,{recursive:true});
const base='http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:[
'--no-sandbox','--use-angle=swiftshader','--ignore-gpu-blocklist',
'--enable-unsafe-swiftshader','--disable-dev-shm-usage',
]});
const errors=[],frames=[];
const ctx=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
await ctx.addInitScript(()=>{
 let seed=20260925>>>0;
 Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
});
const page=await ctx.newPage();
page.setDefaultTimeout(180000);
page.on('pageerror',e=>errors.push('page: '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
async function shot(scene,name,extra={}){
 const path=OUT+'/'+name+'.png';
 await page.screenshot({path,timeout:180000,animations:'disabled'});
 frames.push({scene,file:name+'.png',bytes:statSync(path).size,...extra});
 console.log('FRAME',name,statSync(path).size);
}
try {
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:180000});
 await page.locator('canvas').first().waitFor({timeout:180000});
 await page.waitForTimeout(4000);
 await page.addStyleTag({content:'.vignette,.grain,aside,.fixed.z-20{display:none!important}'});
 await shot('preserved_pool','POOL_00_INITIAL');
 const btn=page.getByRole('button',{name:'Splash',exact:true});
 await btn.evaluate(button=>button.click());
 await page.waitForTimeout(180);
 await shot('preserved_pool','POOL_01_SPLASH_EARLY');
 await page.waitForTimeout(320);
 await shot('preserved_pool','POOL_02_SPLASH_MIDDLE');
 await page.waitForTimeout(360);
 await shot('preserved_pool','POOL_03_SPLASH_LATE');
 
 await page.goto(base+'/ocean?capture=1&quality=capture&seed=20260925',
  {waitUntil:'domcontentloaded',timeout:180000});
 await page.waitForFunction(()=>window.__THALASSA__?.ready===true,null,{timeout:180000});
 const failed=await page.evaluate(()=>window.__THALASSA__.error);
 if(failed)throw Error('ocean init: '+failed);
 await page.addStyleTag({content:'main > :not(canvas){display:none!important}'});
 await page.evaluate(()=>window.__THALASSA__.action('lab',
  {scene:'drop',radius:0.6,depth:5,tileDepth:5}));
 for(const [n,name] of [[36,'OCEAN_01_CONTACT'],[54,'OCEAN_02_CROWN'],
                         [72,'OCEAN_03_BREAKUP'],[90,'OCEAN_04_RETURN']]){
   // Regenerate the same initial state so every named simulated time is exact.
   await page.evaluate(()=>window.__THALASSA__.action('lab',
     {scene:'drop',radius:0.6,depth:5,tileDepth:5}));
   const x=await page.evaluate(n=>{
    const a=window.__THALASSA__,m=window.__THALASSA_MODULES__;
    a.simulate(n,1/60);
    a.step(1,1e-7);
    return {simulatedTime:n/60,glError:a.glError(),
      splashParticles:m.splash.mpm.stats.alive,
      splashVolume:m.splash.mpm.stats.emitted,
      mode:'ocean_SSFR_default'};
   },n);
   await shot('modern_ocean',name,x);
   if(x.glError!==0)errors.push('GL '+name+': '+x.glError);
 }
}catch(e){errors.push('fatal: '+e);console.error(e)}
finally{
 writeFileSync(OUT+'/receipt.json',JSON.stringify({
  sha:process.env.GITHUB_SHA,
  originalPool:'/',
  originalPoolSourceFiles:[
   'src/components/SplashParticles.tsx','src/shaders/waterShaders.ts',
   'src/hooks/useMlsMpm.ts','src/lib/mpmConnectivity.ts'],
  ocean:'/ocean?capture=1&quality=capture&seed=20260925',
  caveat:'Source renderer genealogy only. Pool and ocean use different body scale, simulated conditions and timestep controls, so not a controlled physical-quality comparison.',
  frames,errors
 },null,2));
 await browser.close();
}
if(frames.length!==8||errors.length)process.exitCode=1;
