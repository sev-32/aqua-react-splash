# Native static-hull migration V3

The native static hull authority contains 27 hull, deck, cockpit, and fitting meshes reconstructed from the V3 binary asset.

Exact verified totals:

- 5,571 vertices
- 9,256 triangles
- 27 meshes
- 7 pooled material keys and instances

The compatibility objects retain their child indices as empty invisible placeholders only because some still-unmigrated code addresses `boat.children[index]`. Their original geometry is detached and disposed after native parity succeeds. Uniquely owned source materials are also disposed.

The native root follows the compatibility boat transform while geometry ownership remains native.

See `BINARY_HULL_ASSET.md` for the file format and size receipts.
