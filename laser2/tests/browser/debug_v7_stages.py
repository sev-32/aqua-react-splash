from pathlib import Path
from urllib.parse import urlparse
import mimetypes, json
from playwright.sync_api import sync_playwright
ROOT=Path('/mnt/data/LASER2_LIGHTING_FOUNDRY_V7')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=False,args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader','--use-gl=angle','--disable-gpu-sandbox'])
 p=b.new_page(viewport={'width':900,'height':600});p.set_default_timeout(120000)
 p.on('console',lambda m: print('CONSOLE',m.type,m.text[:300],flush=True) if m.type in ['error','warning'] else None)
 p.on('pageerror',lambda e: print('PAGEERROR',e,flush=True))
 def serve(route):
  rel=urlparse(route.request.url).path.lstrip('/') or 'index.html';t=(ROOT/'dist'/rel).resolve();d=(ROOT/'dist').resolve()
  if not str(t).startswith(str(d)) or not t.is_file():route.fulfill(status=404,body='x',headers={'Access-Control-Allow-Origin':'*'});return
  route.fulfill(status=200,body=t.read_bytes(),content_type=mimetypes.guess_type(t.name)[0] or 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
 p.route('https://foundry.local/**',serve)
 html=(ROOT/'dist/index.html').read_text().replace('<head>','<head><base href="https://foundry.local/">',1)
 print('set content',flush=True);p.set_content(html,wait_until='domcontentloaded')
 print('wait ready',flush=True);p.wait_for_function("document.documentElement.dataset.foundryReady==='true'||document.documentElement.dataset.foundryError",timeout=150000)
 print('ready',p.evaluate("()=>({r:document.documentElement.dataset.foundryReady,e:document.documentElement.dataset.foundryError,a:window.LASER2_FOUNDRY?.systems?.atmosphere?.telemetry?.()})"),flush=True)
 print('initial worker wait',flush=True);p.wait_for_function("()=>{const w=window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker;return w.appliedGeneration>0&&w.appliedGeneration===w.pendingGeneration}")
 print('worker initial',p.evaluate("()=>window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker"),flush=True)
 old=p.evaluate("()=>window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker.appliedGeneration")
 print('update noon old',old,flush=True)
 p.evaluate("()=>{const f=window.LASER2_FOUNDRY;f.lighting.update({sunElevationDeg:60,sunAzimuthDeg:165,aerosolDensity:.16,turbidity:2.4});f.kernel.frame(0);}")
 print('after frame',p.evaluate("()=>window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker"),flush=True)
 p.wait_for_function("g=>{const w=window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker;return w.appliedGeneration>g&&w.appliedGeneration===w.pendingGeneration}",arg=old,timeout=120000,polling=100)
 print('noon done',p.evaluate("()=>window.LASER2_FOUNDRY.systems.atmosphere.telemetry()"),flush=True)
 old=p.evaluate("()=>window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker.appliedGeneration")
 print('update sunset old',old,flush=True)
 p.evaluate("()=>{const f=window.LASER2_FOUNDRY;f.lighting.update({sunElevationDeg:2,sunAzimuthDeg:270,aerosolDensity:.34,turbidity:4});f.kernel.frame(0);}")
 print('after sunset frame',p.evaluate("()=>window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker"),flush=True)
 p.wait_for_function("g=>{const w=window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker;return w.appliedGeneration>g&&w.appliedGeneration===w.pendingGeneration}",arg=old,timeout=120000,polling=100)
 print('sunset done',p.evaluate("()=>window.LASER2_FOUNDRY.systems.atmosphere.telemetry().worker"),flush=True)
 b.close()
