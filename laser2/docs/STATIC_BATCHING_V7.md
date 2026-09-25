# Static Hull Batching — V7

## Input

The V3 native hull asset contains 27 static hull, deck, cockpit, and fitting meshes with stable semantic IDs.

## Batch authority

`NativeHullBatchSystem` groups those meshes by the seven pooled native material instances and creates one indexed `BufferGeometry` batch per material group.

Verified parity:

- source meshes: 27;
- batch meshes: 7;
- vertices: 5,571 source / 5,571 batch;
- triangles: 9,256 source / 9,256 batch;
- topology parity: exact.

The direct batching authority removes 20 source submissions. In the complete diagnostic renderer, total calls fell from V6's 648 to 608 because the same consolidation also affects shadow submissions.

## Semantic compatibility

Source semantic objects remain in the catalog but are hidden. Selecting one temporarily makes its source mesh visible for the current material-swap highlight and restores it afterward. This preserves the existing inspector without fragmenting the normal render path.

## Boundary

Hidden semantic source geometry remains allocated on the CPU. A future ID-buffer or geometry-group picking system should map batch primitive/group IDs directly back to semantic entities, allowing the duplicate source geometry to be released.
