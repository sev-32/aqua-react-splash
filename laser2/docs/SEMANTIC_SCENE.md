# Semantic scene

The scene catalog contains 116 stable semantic entities spanning the hull, deck, fittings, steering, rig, sails, ropes, crew, and complete assemblies.

Primary selection and review identity does not depend on fuzzy scene-name searches. `BoatSceneBindings` maps semantic IDs to explicit source indices or native asset IDs.

The 27 migrated static hull entities bind to binary-backed native meshes. Unmigrated dynamic entities continue to resolve through the compatibility adapter.

Material pooling is compatible with independent selection because `SelectionSystem` creates temporary per-selected-object highlight materials rather than mutating the shared production material.
