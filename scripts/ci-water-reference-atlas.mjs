/**
 * Historical THALASSA reference atlas.
 * Every frame is a genuine Playwright Chromium capture of ORIGINAL, unchanged
 * donor HTML. No mock image or new implementation is substituted.
 * Renderability is measured, not assumed; failures remain visible in receipts.
 */
import {chromium} from 'playwright';
import {readdirSync,mkdirSync,writeFileSync,statSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const out='captures/water-reference-atlas';
mkdirSync(out,{recursive:true});
const dir='dist/atlas';
const names=readdirSync(dir).filter(n=>n.toLowerCase().endsWith('.html')).sort();
const BROWSER_ARGS=[
 '--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader',
 '--ignore-gpu-blocklist','--enable-unsafe-webgpu',
 '--enable-webgpu-developer-features','--disable-dev-shm-usage'
];
const browser=await chromium.launch({headless:true,args:BROWSER_ARGS});
const context=await browser.newContext({viewport:{width:1280,height:768},deviceScaleFactor:1,ignoreHTTPSErrors:true});
const all=[];
for(let i=0;i<names.length;i++){
 const name=names[i],id=String(i+1).padStart(2,'0')+'_'+name.replace(/\.html$/i,'').replace(/[^a-zA-Z0-9_-]/g,'_');
 const errors=[],warnings=[],entry={id,name,frames:[],errors,warnings};
 const raw=readFileSync(dir+'/'+name);
 const source=raw.toString('utf8');
 const flag=(pattern)=>pattern.test(source);
 const family= name.startsWith('aqua_')?'Aqua SWE/heightfield':
  name.startsWith('pool_')?'Aqua obstacle/JIT pool':
  name.startsWith('heightfield')?'HeightfieldBEST':
  /^(HybridSplash|hybridsplashFable)/.test(name)?'HybridSplash WebGPU':
  /^(BEST_water|WaterPRO)/.test(name)?'WaterPRO/JIT':
  /^(PoolSimulation|POOL_EXACT)/.test(name)?'Standalone pool/optics':
  'Other original water donor';
 entry.source={
  gitBlobSha1:createHash('sha1').update('blob '+raw.length+'\\0').update(raw).digest('hex'),
  sha256:createHash('sha256').update(raw).digest('hex'),
  bytes:raw.length,family,
  features:{
   webgpu:flag(/navigator\\.gpu|requestAdapter\\s*\\(/),
   webgl2:flag(/webgl2|WebGL2RenderingContext/i),
   mpm:flag(/MLS.MPM|WG_P2G|p2gKernel|\\bMPM\\b/i),
   jit:flag(/\\bJIT\\b|jitEmit/i),
   heightfield:flag(/heightfield|\\bSWE\\b|shallow.water/i),
   fresnel:flag(/fresnel/i),caustics:flag(/caustic/i),
   connectedFluid:flag(/marching.cubes|metaball|tendril|neck|filament/i),
   foam:flag(/foam/i),
  }
 };

 const page=await context.newPage();
 page.setDefaultTimeout(16000);
 page.on('pageerror',e=>{if(errors.length<15)errors.push('page: '+e.message)});
 page.on('console',m=>{if(m.type()==='error'&&errors.length<15)errors.push('console: '+m.text().slice(0,280))});
 page.on('requestfailed',q=>{if(errors.length<15)errors.push('request: '+q.url().slice(0,150))});
 try{
  const resp=await page.goto('http://127.0.0.1:4173/atlas/'+encodeURIComponent(name),
   {waitUntil:'domcontentloaded',timeout:35000});
  entry.http=resp?.status();
  entry.initial=await page.evaluate(()=>({
   title:document.title,webgl2:!!document.createElement('canvas').getContext('webgl2'),
   webgpu:!!navigator.gpu,
   canvasCount:document.querySelectorAll('canvas').length,
   visibleText:document.body?.innerText?.slice(0,360)??'',
  }));
  const snap=async(label)=>{
   const filename=id+'_'+label+'.png';
   await page.screenshot({path:out+'/'+filename,animations:'disabled',timeout:60000});
   const canvas=await page.evaluate(()=>[...document.querySelectorAll('canvas')].map(c=>({
    width:c.width,height:c.height,rect:{width:Math.round(c.getBoundingClientRect().width),height:Math.round(c.getBoundingClientRect().height)}
   })));
   entry.frames.push({file:filename,bytes:statSync(out+'/'+filename).size,canvases:canvas});
  };
  await page.waitForTimeout(900);
  await snap('A_INITIAL');
  await page.waitForTimeout(2800);
  await snap('B_RUNNING');
  // Only click a known simulation-start control, never arbitrary UI.
  const btn=page.locator('button').filter({hasText:/^(start|run|drop|splash|simulate|launch|resume|play)(\s|$)/i}).first();
  if(await btn.count()){
   try{entry.clicked=String(await btn.innerText()).slice(0,60);await btn.evaluate(b=>b.click());await page.waitForTimeout(1400);await snap('C_TRIGGERED')}
   catch(e){warnings.push('optional start action: '+String(e).slice(0,180))}
  }
  entry.final=await page.evaluate(()=>({
   title:document.title,canvases:document.querySelectorAll('canvas').length,
   canvasPixels:[...document.querySelectorAll('canvas')].map(c=>[c.width,c.height]),
  }));
 }catch(e){errors.push('fatal: '+String(e).slice(0,350))}
 finally{all.push(entry);await page.close()}
 console.log('ATLAS',i+1,'/',names.length,name,entry.frames.length,
  'WebGL2',entry.initial?.webgl2,'WebGPU',entry.initial?.webgpu,'errors',errors.length);
}
await context.close();await browser.close();
writeFileSync(out+'/receipt.json',JSON.stringify({
 title:'THALASSA ORIGINAL REFERENCE RENDER ATLAS',
 date:new Date().toISOString(),commit:process.env.GITHUB_SHA,
 caveats:[
  'Each original source is rendered independently; no donor is renamed the best.',
  'Render screenshots are not equivalent physical scenes, nor proof of physical accuracy.',
  'A blank or broken page is recorded as failure, not quietly replaced with an image.',
  'WebGPU support on software runner may differ from user desktop hardware.',
 ],
 total:names.length,uniqueSourceHashes:new Set(all.map(x=>x.source.gitBlobSha1)).size,entries:all
},null,2));
