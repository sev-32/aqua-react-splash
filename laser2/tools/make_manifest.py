#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]
exclude = {'PROJECT_MANIFEST.json'}
files = []
for path in sorted(item for item in root.rglob('*') if item.is_file()):
    relative = path.relative_to(root).as_posix()
    if relative in exclude or relative.endswith('.pyc') or '/__pycache__/' in f'/{relative}/':
        continue
    data = path.read_bytes()
    files.append({'path': relative, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})

manifest = {
    'project': 'LASER2_LIGHTING_FOUNDRY_V7_WORKER_LOCAL_PROBES_BATCHED_HULL',
    'version': '7.0.0-worker-local-probes-batched-hull-checkpoint',
    'entrypoint': 'dist/index.html',
    'source_entrypoint': 'public/index.html',
    'architecture': 'external ES modules + fixed-step/exclusive-render authority + cancellable atmosphere worker + retained-error telemetry + semantic scene + binary native static hull + seven static material batches + ozone-aware spectral sunlight + RGBA32F environment + order-2 SH global probe + six atmosphere-fed local probes + ACES response + aerial perspective + quarantined dynamic compatibility backend',
    'file_count': len(files),
    'total_bytes': sum(entry['bytes'] for entry in files),
    'files': files,
}
(root / 'PROJECT_MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: manifest[key] for key in ['project', 'version', 'entrypoint', 'file_count', 'total_bytes']}, indent=2))
