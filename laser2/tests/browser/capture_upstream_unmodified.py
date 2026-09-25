from __future__ import annotations
import json, time
from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

SRC=Path('/mnt/data/LASER2_RIGGING_LAB_V17_SAIL_OPTICS_STANDALONE(1).html')
OUT=Path('/mnt/data/LASER2_LIGHTING_FOUNDRY_V1/evidence/upstream_unmodified')
OUT.mkdir(parents=True, exist_ok=True)
html=SRC.read_text(encoding='utf-8', errors='replace')
console=[]; page_errors=[]; request_failures=[]
result={}
with sync_playwright() as p:
    browser=p.chromium.launch(
        executable_path='/usr/bin/chromium', headless=False,
        args=[
            '--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist',
            '--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader',
            '--use-gl=angle','--disable-gpu-sandbox','--disable-background-timer-throttling',
            '--disable-renderer-backgrounding','--disable-features=UseSkiaRenderer'
        ])
    context=browser.new_context(viewport={'width':1440,'height':900}, device_scale_factor=1)
    page=context.new_page(); page.set_default_timeout(240000)
    page.on('console', lambda msg: console.append({'type':msg.type,'text':msg.text[:8000]}))
    page.on('pageerror', lambda err: page_errors.append(str(err)))
    page.on('requestfailed', lambda req: request_failures.append({'url':req.url,'failure':req.failure}))
    try:
        page.evaluate("""html => {
          const u=URL.createObjectURL(new Blob([html],{type:'text/html'}));
          setTimeout(()=>{ location.href=u; },0); return true;
        }""", html)
    except Exception:
        pass
    init_error=None
    try:
        page.wait_for_function("window.LASER2_SAIL_OPTICS_V17 && window.LASER2_SAIL_OPTICS_V17.state && window.LASER2_SAIL_OPTICS_V17.state.initialized === true", timeout=180000, polling=100)
    except PlaywrightTimeoutError as e:
        init_error=str(e)
    if init_error is None:
        page.wait_for_timeout(3500)
        page.screenshot(path=str(OUT/'upstream_v17_optics_viewport.png'))
        page.locator('#c').screenshot(path=str(OUT/'upstream_v17_optics_canvas.png'))
    telemetry=page.evaluate("""async (sourcePath) => {
      const canvas=document.getElementById('c');
      const gl=canvas?.getContext('webgl2') || canvas?.getContext('webgl');
      const dbg=gl?.getExtension('WEBGL_debug_renderer_info');
      let frames=0; const t0=performance.now();
      if (gl) await new Promise(resolve=>{function step(){frames++; if(performance.now()-t0>=1000)resolve(); else requestAnimationFrame(step)} requestAnimationFrame(step)});
      const m=window.LASER2_CREW_RIGGING_MASTER_V2;
      const o17=window.LASER2_SAIL_OPTICS_V17;
      const o16=window.LASER2_SAIL_OPTICS_V16;
      const rig=window.LASER2_RIGGING_V16;
      const hw=window.LASER2_ROPE_HARDWARE_V16;
      const sailInfo=(o17?.sails||[]).map((s,i)=>({i, kind:s.kind||null, keys:Object.keys(s).slice(0,40), meshName:s.mesh?.name||null, materialType:s.material?.type||s.mesh?.material?.type||null}));
      const vinylInfo=(o17?.vinylMeshes||[]).map((v,i)=>({i,name:v?.name||null,visible:v?.visible??null,materialType:v?.material?.type||null,renderOrder:v?.renderOrder??null}));
      return {
        sourceFile:sourcePath, sourceModified:false, title:document.title, readyState:document.readyState, href:location.href,
        canvas:{width:canvas?.width||0,height:canvas?.height||0,clientWidth:canvas?.clientWidth||0,clientHeight:canvas?.clientHeight||0},
        webgl:{context:gl?(gl instanceof WebGL2RenderingContext?'WebGL2':'WebGL1'):'none',version:gl?.getParameter(gl.VERSION)||null,shadingLanguage:gl?.getParameter(gl.SHADING_LANGUAGE_VERSION)||null,vendor:gl?.getParameter(gl.VENDOR)||null,renderer:gl?.getParameter(gl.RENDERER)||null,unmaskedVendor:dbg?gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL):null,unmaskedRenderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):null,contextLost:gl?.isContextLost?.()??null,glError:gl?.getError?.()??null},
        frameProbe:{frames,elapsedMs:performance.now()-t0,fps:frames/Math.max(0.001,(performance.now()-t0)/1000)},
        runtime:{master:!!m,rig:!!rig,hardware:!!hw,opticsV17:!!o17,opticsV16Alias:o16===o17,rigFinite:rig?.state?.finite??null,hardwareFinite:hw?.state?.finite??null,opticsFinite:o17?.state?.finite??null,opticsInitialized:o17?.state?.initialized??null,opticsFrame:o17?.state?.frame??null,opticsVersion:o17?.VERSION||o17?.version||null,opticsState:{...o17?.state},receipt:o17?.receipt||null,paramKeys:Object.keys(o17?.params||{}),sails:sailInfo,vinyl:vinylInfo},
        hudText:document.body.innerText.slice(0,10000)
      }
    }""", str(SRC))
    telemetry['initializationError']=init_error
    telemetry['console']=console
    telemetry['pageErrors']=page_errors
    telemetry['requestFailures']=request_failures
    (OUT/'upstream_v17_optics_telemetry.json').write_text(json.dumps(telemetry,indent=2,default=str)+'\n',encoding='utf-8')
    result={'init_error':init_error,'webgl':telemetry.get('webgl'),'frameProbe':telemetry.get('frameProbe'),'runtime':telemetry.get('runtime'),'consoleCount':len(console),'pageErrors':page_errors}
    browser.close()
print(json.dumps(result,indent=2,default=str))
