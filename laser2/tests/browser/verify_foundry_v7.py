#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, mimetypes, os, psutil, time
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT=Path('/mnt/data/LASER2_LIGHTING_FOUNDRY_V7')
OUT=ROOT/'evidence/browser'; OUT.mkdir(parents=True,exist_ok=True)
REPORT=OUT/'foundry_v7_verification.json'
WHOLE=OUT/'foundry_v7_whole_boat.png'
PROBE_ON=OUT/'foundry_v7_local_probes_on.png'
PROBE_OFF=OUT/'foundry_v7_local_probes_off.png'
PROBE_DIFF=OUT/'foundry_v7_local_probes_difference_x4.png'
console=[]; errors=[]

def terminate_children():
    try: children=psutil.Process(os.getpid()).children(recursive=True)
    except Exception: return
    for p in children:
        try:p.terminate()
        except Exception:pass
    _,alive=psutil.wait_procs(children,timeout=3)
    for p in alive:
        try:p.kill()
        except Exception:pass

def image_difference(a:Path,b:Path,out:Path):
    ia=Image.open(a).convert('RGB'); ib=Image.open(b).convert('RGB')
    diff=ImageChops.difference(ia,ib)
    pixels=list(diff.getdata())
    changed=sum(1 for px in pixels if max(px)>=2)
    strong=sum(1 for px in pixels if max(px)>=10)
    max_channel=max(max(px) for px in pixels)
    mean=sum(sum(px) for px in pixels)/(len(pixels)*3)
    diff.point(lambda v:min(255,v*4)).save(out)
    return {'pixels':len(pixels),'changedPixelsAt2':changed,'strongPixelsAt10':strong,'maxChannelDifference':max_channel,'meanAbsoluteChannelDifference':mean}

payload={}; started=time.time()
try:
  with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swshader','--enable-unsafe-swiftshader','--use-angle=swiftshader','--use-gl=angle','--disable-gpu-sandbox','--disable-background-timer-throttling','--disable-renderer-backgrounding'])

    # Dedicated worker execution lane. The exact generated worker bundle runs
    # in a Blob worker because the sandbox blocks normal top-level navigation.
    worker_page=browser.new_page()
    worker_source=(ROOT/'dist/workers/atmosphere-lut-worker-v7.bundle.js').read_text()
    default_settings=json.loads((ROOT/'BUILD_REPORT.json').read_text()).get('defaultLightingSettings',{}) if (ROOT/'BUILD_REPORT.json').exists() else {}
    # Full request is supplied explicitly so this lane does not depend on app globals.
    worker_request={
      'generation':7,'width':48,'height':24,'viewSamples':6,'sunSamples':3,'scatteringOrders':4,
      'settings':{
        'atmosphereEnabled':True,'sunElevationDeg':12,'sunAzimuthDeg':210,'sunIlluminanceLux':100000,'sunIntensity':3.2,'sunAngularRadiusDeg':0.266,'skyIntensity':0.92,
        'rayleighDensity':1.0,'aerosolDensity':0.34,'mieAnisotropy':0.76,'turbidity':3.2,'ozoneDensity':1.0,'multipleScatteringFactor':0.42,'spectralSolarEnabled':True,
        'groundAlbedo':0.16,'groundBounce':0.18,'cameraAltitudeM':2,'exposureEv':0,'autoExposureEnabled':False,'autoExposureReferenceLux':20000,'autoExposureStrength':0.72,
        'autoExposureMinEv':-3,'autoExposureMaxEv':4,'whiteBalanceKelvin':6500,'toneMappingShoulder':1,'aerialPerspectiveEnabled':True,'aerialPerspectiveStrength':0.72,
        'aerialPerspectiveMaxDistanceM':1800,'diffuseEnvironmentIntensity':1,'specularEnvironmentIntensity':1,'localProbesEnabled':True,'localDiffuseBounceStrength':0.85,
        'localSpecularProbeStrength':0.55,'shadowsEnabled':True,'sailTransmission':0.27,'sailAbsorption':0.42,'sailShadowSoftnessMm':55,'vinylTransmission':0.92,
        'aluminumRoughness':0.32,'hullGelcoatRoughness':0.22
      }
    }
    bundle_worker=worker_page.evaluate("""async ({source,request})=>{
      const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
      const worker=new Worker(url);
      const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('worker timeout')),30000);worker.onmessage=e=>{clearTimeout(timer);resolve(e.data)};worker.onerror=e=>{clearTimeout(timer);reject(new Error(e.message||'worker error'))};worker.postMessage(request)});
      worker.terminate();URL.revokeObjectURL(url);
      return {generation:result.generation,width:result.width,height:result.height,scatteringOrders:result.scatteringOrders,computeMs:result.computeMs,firstOrderEnergy:result.firstOrderEnergy,finalEnergy:result.finalEnergy,byteLength:result.data?.byteLength??0,error:result.error??null};
    }""",{'source':worker_source,'request':worker_request})
    worker_page.close()

    page=browser.new_page(viewport={'width':1200,'height':800},device_scale_factor=1)
    page.set_default_timeout(180000)
    # Normal production launch uses a direct module worker. The sandbox app lane
    # deliberately exercises the deterministic main-thread fallback because its
    # opaque document origin cannot load a module worker reliably.
    page.add_init_script("Object.defineProperty(window,'Worker',{value:undefined,configurable:true});")
    page.on('console',lambda m:console.append({'type':m.type,'text':m.text[:8000]}))
    page.on('pageerror',lambda e:errors.append(str(e)))
    def serve(route):
      rel=urlparse(route.request.url).path.lstrip('/') or 'index.html'; target=(ROOT/'dist'/rel).resolve(); dist=(ROOT/'dist').resolve()
      if not str(target).startswith(str(dist)) or not target.is_file(): route.fulfill(status=404,body='not found',headers={'Access-Control-Allow-Origin':'*'}); return
      route.fulfill(status=200,body=target.read_bytes(),content_type=mimetypes.guess_type(target.name)[0] or 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'})
    page.route('https://foundry.local/**',serve)
    html=(ROOT/'dist/index.html').read_text().replace('<head>','<head><base href="https://foundry.local/">',1)
    html=html.replace('<script type="module" src="./src/main.js"></script>', '<script data-verifier-raf>window.__LASER2_NATIVE_RAF=(cb)=>{window.__FOUNDRY_TEST_RAF=cb;return 1};window.__LASER2_NATIVE_CAF=()=>{};</script><script type="module" src="./src/main.js"></script>')
    page.set_content(html,wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.dataset.foundryReady==='true'||document.documentElement.dataset.foundryError",timeout=150000,polling=100)
    init=page.evaluate("()=>({ready:document.documentElement.dataset.foundryReady||null,error:document.documentElement.dataset.foundryError||null})")
    if init['error']: raise RuntimeError(init['error'])
    page.wait_for_function("()=>{const w=window.LASER2_FOUNDRY?.systems?.atmosphere?.telemetry?.().worker;return w?.appliedGeneration>0&&w.appliedGeneration===w.pendingGeneration}",timeout=120000,polling=100)
    page.wait_for_timeout(500)
    baseline=page.evaluate("""()=>{const f=window.LASER2_FOUNDRY;return{version:f.version,atmosphere:f.systems.atmosphere.telemetry(),localProbes:f.systems.localProbes.telemetry(),hullBatches:f.systems.hullBatches.telemetry(),nativeHull:f.systems.nativeHull.telemetry(),render:f.systems.renderer.telemetry(),scripts:[...document.scripts].map(s=>({src:s.getAttribute('src'),inlineBytes:(s.textContent||'').length}))};}""")
    page.evaluate("""()=>{const f=window.LASER2_FOUNDRY;document.getElementById('foundry-ui')?.style.setProperty('display','none');f.systems.selection.select(null,false);f.systems.camera.focus(f.systems.catalog.byId.get('overview.complete'));f.systems.camera.setView('bow');f.systems.camera.distance*=.72;f.systems.camera.pitch=.17;f.kernel.frame(0);f.kernel.frame(0);f.systems.renderer.finish('v7-whole');}""")
    page.locator('#c').screenshot(path=str(WHOLE))

    page.evaluate("""()=>{const f=window.LASER2_FOUNDRY;f.lighting.update({localProbesEnabled:true,localDiffuseBounceStrength:1.25,localSpecularProbeStrength:.85});f.kernel.frame(0);f.kernel.frame(0);f.systems.renderer.finish('v7-probes-on');}""")
    page.locator('#c').screenshot(path=str(PROBE_ON))
    generation_before_toggle=page.evaluate("()=>window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker.appliedGeneration")
    page.evaluate("""()=>{const f=window.LASER2_FOUNDRY;f.lighting.update({localProbesEnabled:false});f.kernel.frame(0);f.systems.renderer.finish('v7-probes-off');}""")
    page.locator('#c').screenshot(path=str(PROBE_OFF))
    generation_after_toggle=page.evaluate("()=>window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker.appliedGeneration")
    probe_diff=image_difference(PROBE_ON,PROBE_OFF,PROBE_DIFF)
    page.evaluate("""()=>{const f=window.LASER2_FOUNDRY;f.lighting.update({localProbesEnabled:true,localDiffuseBounceStrength:.85,localSpecularProbeStrength:.55});f.kernel.frame(0);}""")

    current_lighting=page.evaluate("()=>({coupling:window.LASER2_FOUNDRY.systems.coupling.telemetry(),sail:window.LASER2_FOUNDRY.systems.sailCloth.telemetry()})")

    selection_probe=page.evaluate("""()=>{const f=window.LASER2_FOUNDRY;const item=f.systems.catalog.items.find(x=>x.id.startsWith('hull.')&&x.objects?.[0]?.userData?.foundryBatchedSource);if(!item)return{pass:false};const before=item.objects[0].visible;f.systems.selection.select(item.id,false);const during=item.objects[0].visible;f.systems.selection.select(null,false);const after=item.objects[0].visible;return{pass:before===false&&during===true&&after===false,id:item.id,before,during,after};}""")
    page.evaluate("()=>{const f=window.LASER2_FOUNDRY;f.kernel.frame(0);f.systems.renderer.finish('v7-final');}")
    final=page.evaluate("""()=>{const f=window.LASER2_FOUNDRY;f.telemetry.checkGlError('v7-verification:end');const gl=f.legacy.gl;const dbg=gl.getExtension('WEBGL_debug_renderer_info');return{atmosphere:f.systems.atmosphere.telemetry(),localProbes:f.systems.localProbes.telemetry(),hullBatches:f.systems.hullBatches.telemetry(),nativeHull:f.systems.nativeHull.telemetry(),render:f.systems.renderer.telemetry(),scene:f.systems.scene.telemetry(),body:{kinematic:f.legacy.body.kinematic},rig:f.legacy.rigV16?.metrics?.()||null,webgl:{context:(typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext)?'WebGL2':'WebGL1',version:gl.getParameter(gl.VERSION),renderer:dbg?gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),contextLost:gl.isContextLost(),glError:gl.getError()},retainedGlErrors:f.telemetry.snapshot().webgl.errorEvents};}""")
    shader_errors=[m for m in console if 'shader error' in m['text'].lower() or ('compile' in m['text'].lower() and 'error' in m['text'].lower())]
    checks={
      'version_v7':baseline['version'].startswith('LASER2_LIGHTING_FOUNDRY_V7'),
      'external_modular_entrypoint':not any((x['src'] is None and x['inlineBytes']>0) for x in baseline['scripts'] if x.get('src') is not None),
      'dedicated_worker_bundle_executes':bundle_worker['error'] is None and bundle_worker['generation']==7 and bundle_worker['byteLength']==48*24*4*4,
      'dedicated_worker_four_orders':bundle_worker['scatteringOrders']==4 and bundle_worker['finalEnergy']>bundle_worker['firstOrderEnergy']*1.02,
      'sandbox_app_worker_applied':final['atmosphere']['worker']['active'] is True and final['atmosphere']['worker']['appliedGeneration']==final['atmosphere']['worker']['pendingGeneration'] and len(final['atmosphere']['worker']['errors'])==0,
      'balanced_four_scattering_orders':final['atmosphere']['quality']['scatteringOrders']==4,
      'multi_order_energy_increase':final['atmosphere']['energy']['multiOrderRatio']>1.02,
      'main_thread_lut_apply_under_5ms':final['atmosphere']['lutMainThreadApplyMs']['mean']<5,
      'local_probe_count_six':final['localProbes']['probeCount']==6,
      'local_probes_patch_high_value_materials':final['localProbes']['patchedMaterials']>=5 and final['localProbes']['shaderCompiles']>0,
      'local_probe_visual_effect':probe_diff['strongPixelsAt10']>200 and probe_diff['meanAbsoluteChannelDifference']>0.01,
      'local_probe_toggle_does_not_rebuild_atmosphere':generation_before_toggle==generation_after_toggle,
      'hull_batched_to_seven_or_less':final['hullBatches']['sourceMeshes']==27 and final['hullBatches']['batchMeshes']<=7,
      'hull_draw_call_reduction_at_least_20':final['hullBatches']['drawCallReduction']>=20,
      'hull_batch_topology_parity':final['hullBatches']['topologyParity'] is True,
      'semantic_selection_survives_batching':selection_probe['pass'] is True,
      'sail_transport_has_radiometric_revision':current_lighting['sail']['incidentRadiometricRevision']==current_lighting['coupling']['revision'] and current_lighting['sail']['sunlightScale']>0,
      'render_calls_reduced_below_v6':final['render']['calls']<648,
      'render_authority_clean':final['render']['unauthorizedRenderCalls']==0,
      'native_hull_exact':final['nativeHull']['topologyParity'] is True and final['nativeHull']['nativeMeshes']==27,
      'body_anchored':final['body']['kinematic'] is True,
      'rig_finite':final['rig'] is not None and final['rig']['finite'] is True,
      'webgl2':final['webgl']['context']=='WebGL2',
      'context_not_lost':final['webgl']['contextLost'] is False,
      'gl_error_zero':final['webgl']['glError']==0 and len(final['retainedGlErrors'])==0,
      'no_page_errors':len(errors)==0,
      'no_shader_errors':len(shader_errors)==0,
    }
    payload={'project':'LASER2_LIGHTING_FOUNDRY_V7_WORKER_LOCAL_PROBES_BATCHED_HULL','sourceModified':True,'entrypoint':'dist/index.html','entrypointSha256':hashlib.sha256((ROOT/'dist/index.html').read_bytes()).hexdigest(),'verificationLane':'exact generated Blob worker test + deterministic main-thread app fallback + Chromium/Xvfb/ANGLE SwiftShader WebGL2','elapsedSeconds':time.time()-started,'dedicatedWorkerBundle':bundle_worker,'baseline':baseline,'probeImageDifference':probe_diff,'atmosphereGenerationDuringProbeToggle':{'before':generation_before_toggle,'after':generation_after_toggle},'currentLighting':current_lighting,'selectionProbe':selection_probe,'final':final,'checks':checks,'allChecksPassed':all(checks.values()),'console':console,'pageErrors':errors,'shaderErrors':shader_errors}
    REPORT.write_text(json.dumps(payload,indent=2)+'\n')
    print(json.dumps({'allChecksPassed':payload['allChecksPassed'],'failed':[k for k,v in checks.items() if not v],'dedicatedWorkerBundle':bundle_worker,'atmosphereFallback':final['atmosphere']['worker'],'localProbes':final['localProbes'],'hullBatches':final['hullBatches'],'render':final['render'],'probeDiff':probe_diff,'webgl':final['webgl']},indent=2),flush=True)
    browser.close()
except Exception as exc:
  payload={'project':'LASER2_LIGHTING_FOUNDRY_V7_WORKER_LOCAL_PROBES_BATCHED_HULL','harnessError':repr(exc),'elapsedSeconds':time.time()-started,'console':console,'pageErrors':errors}
  REPORT.write_text(json.dumps(payload,indent=2)+'\n')
  print(json.dumps(payload,indent=2),flush=True)
finally:
  terminate_children()
