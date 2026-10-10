/**
 * Smoke-test original standalone GPU-fluid donors without editing their
 * byte-preserved source. Lack of WebGPU on SwiftShader is a capability BLOCK,
 * not a failed water simulation. Save authentic browser frames and receipts.
 */
import fs from 'node:fs';
import {chromium} from 'playwright';
const out='captures/donor-gpu-smoke'; fs.mkdirSync(out,{recursive:true});
const names=[
  ['wave_to_3d_splash','/donors/splash-mls-mpm.html'],
  ['wave_to_3d_opus','/donors/OpusMagnusWater.html'],
  ['existing_thalassa_standalone','/mlsmpm-webgpu.html'],
];
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--use-angle=swiftshader',
 '--enable-unsafe-webgpu','--enable-webgpu-developer-features',
 '--enable-unsafe-swiftshader','--ignore-gpu-blocklist',
 '--disable-dev-shm-usage'
]});
const receipt=[];
for(const [id,url] of names){
 const p=await browser.newPage({viewport:{width:1024,height:640},deviceScaleFactor:1});
 const errors=[];
 p.on('pageerror',e=>{if(errors.length<16)errors.push('page: '+e.message)});
 p.on('console',m=>{if(m.type()==='error'&&errors.length<16)errors.push('console: '+m.text())});
 p.on('requestfailed',q=>{if(errors.length<16)errors.push('request: '+q.url()+' :: '+q.failure()?.errorText)});
 const q={id,url,source_sha:process.env.GITHUB_SHA,frames:[],errors};
 try{
  await p.goto('http://127.0.0.1:4173'+url,{waitUntil:'domcontentloaded',timeout:180000});
  q.capability=await p.evaluate(()=>({
   webgl2:!!document.createElement('canvas').getContext('webgl2'),
   webgpu:!!navigator.gpu,
   title:document.title,
   canvases:document.querySelectorAll('canvas').length,
  }));
  for(const delay of [500,1500,3500]){
   await p.waitForTimeout(delay);
   const path=out+'/'+id+'_'+delay+'ms.png';
   await p.screenshot({path,timeout:180000});
   q.frames.push({file:path.slice(out.length+1),bytes:fs.statSync(path).size});
  }
 }catch(e){errors.push('fatal: '+String(e).slice(0,500))}
 finally{receipt.push(q);await p.close()}
 console.log('DONOR',id,JSON.stringify({capability:q.capability,images:q.frames.length,errors:errors.slice(0,2)}));
}
await browser.close();
fs.writeFileSync(out+'/receipt.json',JSON.stringify({
 note:'Real browser smoke only, NOT physically matched donor-versus-ocean validation. Browser software-GPU capabilities can block historical WebGPU apps.',
 donors:receipt
},null,2));
