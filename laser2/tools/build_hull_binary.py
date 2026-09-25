#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/assets/boat/hull-static-v2.json'
MANIFEST = ROOT / 'public/assets/boat/hull-static-v3.manifest.json'
BINARY = ROOT / 'public/assets/boat/hull-static-v3.bin'

FORMATS = {
    'Float32Array': ('f', 4),
    'Uint16Array': ('H', 2),
    'Uint32Array': ('I', 4),
    'Int16Array': ('h', 2),
    'Uint8Array': ('B', 1),
}


def align(blob: bytearray, alignment: int) -> None:
    while len(blob) % alignment:
        blob.append(0)


def encode_attribute(attribute: dict, blob: bytearray) -> dict:
    array_type = attribute['arrayType']
    if array_type not in FORMATS:
        raise ValueError(f'Unsupported typed array {array_type}')
    fmt, alignment = FORMATS[array_type]
    values = attribute['array']
    align(blob, alignment)
    byte_offset = len(blob)
    if values:
        blob.extend(struct.pack(f'<{len(values)}{fmt}', *values))
    return {
        'arrayType': array_type,
        'itemSize': attribute['itemSize'],
        'normalized': attribute['normalized'],
        'byteOffset': byte_offset,
        'elementCount': len(values),
        'byteLength': len(values) * alignment,
    }


def main() -> None:
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    blob = bytearray()
    meshes = []
    for mesh in source['meshes']:
        encoded = {
            key: value
            for key, value in mesh.items()
            if key not in {'attributes', 'index'}
        }
        encoded['attributes'] = {
            name: encode_attribute(attribute, blob)
            for name, attribute in mesh['attributes'].items()
        }
        encoded['index'] = encode_attribute(mesh['index'], blob) if mesh.get('index') else None
        meshes.append(encoded)

    binary_bytes = bytes(blob)
    BINARY.write_bytes(binary_bytes)
    manifest = {
        'schema': 'laser2-native-static-hull-binary-v3',
        'version': '2026-07-15',
        'sourceProject': source.get('sourceProject'),
        'sourceEntrypointSha256': source.get('sourceEntrypointSha256'),
        'coordinateSystem': source.get('coordinateSystem'),
        'sourceJson': SOURCE.name,
        'sourceJsonBytes': len(source_bytes),
        'sourceJsonSha256': hashlib.sha256(source_bytes).hexdigest(),
        'binary': {
            'file': BINARY.name,
            'bytes': len(binary_bytes),
            'sha256': hashlib.sha256(binary_bytes).hexdigest(),
            'endianness': 'little',
        },
        'meshes': meshes,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({
        'manifest': MANIFEST.name,
        'binary': BINARY.name,
        'sourceJsonBytes': len(source_bytes),
        'manifestBytes': MANIFEST.stat().st_size,
        'binaryBytes': len(binary_bytes),
        'combinedBytes': MANIFEST.stat().st_size + len(binary_bytes),
        'reductionRatio': (MANIFEST.stat().st_size + len(binary_bytes)) / len(source_bytes),
        'meshes': len(meshes),
    }, indent=2))


if __name__ == '__main__':
    main()
