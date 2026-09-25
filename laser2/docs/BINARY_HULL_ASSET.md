# Binary static-hull asset

## Motivation

The V2 asset encoded every vertex, normal, UV, and index as numeric JSON. It was readable but slow to transfer and parse, and it required conversion into typed arrays at runtime.

## V3 format

`tools/build_hull_binary.py` converts the source asset into:

- `hull-static-v3.manifest.json`
- `hull-static-v3.bin`

The manifest records:

- source and binary hashes;
- source and binary byte counts;
- endianness;
- mesh IDs and source child indices;
- transforms and material metadata;
- typed-array constructors;
- byte offsets, byte lengths, item sizes, normalization flags, and element counts.

The binary payload is aligned for each typed-array constructor. `NativeHullAssetSystem` creates direct views over the fetched `ArrayBuffer` and validates every byte range before constructing geometry.

## Verified size

- Original numeric JSON: 873,828 bytes
- V3 manifest: 40,377 bytes
- Binary payload: 233,008 bytes
- Combined runtime transfer: 273,385 bytes
- Combined/original ratio: 0.312859
- Reduction: approximately 68.7%

## Verified topology

- Meshes: 27
- Vertices: 5,571
- Triangles: 9,256
- Source/native topology parity: exact
- Manifest and binary hashes: passed
- Attribute and index ranges: passed

## Runtime resource retirement

After native construction:

- 27 legacy geometry resources were retired;
- 5 uniquely owned source material resources were retired;
- approximately 233,008 bytes of source geometry buffers were released;
- seven pooled native material instances serve the 27 native meshes.

Receipts:

- `evidence/cpu/hull-binary-asset.json`
- `evidence/browser/foundry_v5_verification.json`
