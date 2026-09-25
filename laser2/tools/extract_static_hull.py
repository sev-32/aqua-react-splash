#!/usr/bin/env python3
from __future__ import annotations
import json, mimetypes, hashlib
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

SOURCE_ROOT = Path('/mnt/data/LASER2_LIGHTING_FOUNDRY_V1')
TARGET_ROOT = Path('/mnt/data/LASER2_LIGHTING_FOUNDRY_V2')
MANIFEST = json.loads((TARGET_ROOT/'public/assets/boat/semantic-manifest.v2.json').read_text())
HULL_BINDINGS = [entry for entry in MANIFEST['bindings']['boatChildren'] if entry[1].startswith('hull.')]
OUT = TARGET_ROOT/'public/assets/boat/hull-static-v2.json'

with sync_playwright() as pw:
    browser = pw.chromium.launch(
        executable_path='/usr/bin/chromium', headless=False,
        args=['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist','--enable-webgl','--enable-unsafe-swiftshader','--use-angle=swiftshader','--use-gl=angle','--disable-gpu-sandbox']
    )
    page = browser.new_page(viewport={'width': 960, 'height': 640}, device_scale_factor=1)
    def serve(route):
        rel = urlparse(route.request.url).path.lstrip('/') or 'index.html'
        target = (SOURCE_ROOT/'dist'/rel).resolve()
        if not target.is_file():
            route.fulfill(status=404, body='not found'); return
        route.fulfill(status=200, body=target.read_bytes(), content_type=mimetypes.guess_type(target.name)[0] or 'application/octet-stream')
    page.route('https://foundry.local/**', serve)
    html=(SOURCE_ROOT/'dist/index.html').read_text().replace('<head>','<head><base href="https://foundry.local/">',1)
    page.set_content(html, wait_until='domcontentloaded')
    page.wait_for_function("document.documentElement.dataset.foundryReady==='true'", timeout=150000)
    page.wait_for_timeout(300)
    data = page.evaluate("""bindings=>{
      const boat=window.LASER2_CREW_RIGGING_MASTER_V2.boat;
      return bindings.map(([index,id,name])=>{
        const source=boat.children[index];
        if(!source?.isMesh||!source.geometry) return {sourceChildIndex:index,id,name,error:'source mesh missing'};
        const geometry=source.geometry;
        const attributes={};
        for(const [key,attribute] of Object.entries(geometry.attributes||{})){
          attributes[key]={arrayType:attribute.array.constructor.name,itemSize:attribute.itemSize,normalized:attribute.normalized,array:Array.from(attribute.array)};
        }
        const indexAttribute=geometry.index?{arrayType:geometry.index.array.constructor.name,itemSize:geometry.index.itemSize,normalized:geometry.index.normalized,array:Array.from(geometry.index.array)}:null;
        return {
          sourceChildIndex:index,id,name,
          sourceGeometryType:geometry.type,
          transform:{position:source.position.toArray(),quaternion:source.quaternion.toArray(),scale:source.scale.toArray()},
          attributes,index:indexAttribute,
          material:{sourceId:source.material?.id??null,sourceType:source.material?.type??null},
          castShadow:source.castShadow===true,receiveShadow:source.receiveShadow===true,renderOrder:source.renderOrder||0
        };
      });
    }""", HULL_BINDINGS)
    browser.close()

payload = {
    'schema':'laser2-native-static-hull-v2',
    'version':'2026-07-15',
    'sourceProject':'LASER2_LIGHTING_FOUNDRY_V1 validated compatibility runtime',
    'sourceEntrypointSha256':hashlib.sha256((SOURCE_ROOT/'dist/index.html').read_bytes()).hexdigest(),
    'coordinateSystem':'legacy boat-local coordinates; native hull root follows master.boat transform',
    'meshes':data,
}
OUT.write_text(json.dumps(payload,separators=(',',':'))+'\n')
print(json.dumps({'output':str(OUT),'meshes':len(data),'bytes':OUT.stat().st_size,'errors':[x for x in data if 'error' in x]},indent=2))
