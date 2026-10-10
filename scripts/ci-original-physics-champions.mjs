/** Independent real-render benchmarking of original archived standalone
 * BEST heightfield and AQUA Phase6 sphere-film sources.
 * No donor code edits, matching canonical button/scenario/time controls.
 */
import fs from 'node:fs';
import {chromium} from 'playwright';
const out='captures/historical-physics-champions';fs.mkdirSync(out,{recursive:true});
const urls=[
 {id:'HEIGHTFIELD_BEST',url:'/donors/heightfieldBEST.html'},
 {id:'AQUA_PHASE6_FILM',url:'/donors/pool_obstacle_phase6_runup_film.html'},
];
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--use-angle=swiftshader','--ignore-gpu-blocklist',
 '--enable-unsafe-swiftshader','--disable-dev-shm-usage'
]});
const pages=[],records=[];
for(const obj of urls){
 const page=await browser.newPage({viewport:{width:1440,height:850},deviceScaleFactor:1});
 page.setDefaultTimeout(180000);
 const errors=[];
 page.on('pageerror',e=>errors.push('page:'+e.message));
 page.on('console',m=>{if(m.type()==='error'&&errors.length<20)errors.push('console:'+m.text())});
 const rec={...obj,sha:process.env.GITHUB_SHA,frames:[],errors};
 try {
   await page.goto('http://127.0.0.1:4173'+obj.url,{waitUntil:'domcontentloaded',timeout:180000});
   await page.locator('canvas#gl').waitFor({timeout:60000});
   await page.waitForTimeout(900);
   const sequences=[
    ['FAST', 'testSideFast',350,900],
    ['DROP', 'testDrop',300,850],
    ['LIFT', 'testLift',300,850],
   ];
   for(const [tag,btn,early,late] of sequences){
     await page.evaluate(id=>document.getElementById(id)?.click(),btn);
     for(const [i,ms] of [early,late].entries()){
       await page.waitForTimeout(i===0?ms:late-early);
       const file=obj.id+'_'+tag+'_'+i+'.png';
       await page.screenshot({path:out+'/'+file,timeout:180000});
       let report=await page.evaluate(()=>({
         scenario:document.getElementById('sceneName')?.textContent,
         particles:document.getElementById('particleCount')?.textContent,
         filmMass:document.getElementById('filmMass')?.textContent,
         shaderErrorsObservedByPage: false
       }));
       rec.frames.push({file,bytes:fs.statSync(out+'/'+file).size,report});
       console.log('CHAMPION',obj.id,tag,i,JSON.stringify(report));
     }
   }
 }catch(e){errors.push('fatal:'+e);console.error(e)}
 finally{records.push(rec);await page.close()}
}
await browser.close();
fs.writeFileSync(out+'/receipts.json',JSON.stringify({
 note:'Unmodified donor implementations, canonical button tests at measured wall time; not matched scale or proof of physics accuracy.',
 source_paths:[
  'docs/champions/donors/library/heightfieldBEST.html',
  'docs/champions/donors/library/pool_obstacle_phase6_runup_film.html'],
 results:records},null,2));
if(records.some(r=>r.errors.length)||records.some(r=>r.frames.length!==6))process.exitCode=1;
