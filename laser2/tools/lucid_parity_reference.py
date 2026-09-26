#!/usr/bin/env python3
"""Reference poses for the LUCID crew parity test (tests/cpu/lucid-crew.test.mjs).

usage: python3 tools/lucid_parity_reference.py <LUCID_BIOMECH_CAUSAL_RIG_R1 dir> [out.json]

Compiles lawful Semantic51 + hand-layer commands with the package's own
compiler, canonical cluster drivers and LBS, and writes the joint poses and a
vertex sample so the TypeScript re-implementation can be checked against it.
"""
import json
import sys
from pathlib import Path

import numpy as np

pkg = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[1] / "public" / "assets" / "lucid" / "parity_reference.json"
sys.path.insert(0, str(pkg))
from lucid_bcr.semantic import compiler  # noqa: E402
from lucid_bcr.anatomy import HandLayer  # noqa: E402
from lucid_bcr.drivers import drivers  # noqa: E402
from lucid_bcr.skinning import Skinner  # noqa: E402

comp = compiler()
hand = HandLayer()
drv = drivers()
skin = Skinner()
rng = np.random.default_rng(7)
poses = []
for k in range(4):
    cmds = {}
    for d in comp.DEFS:
        if d.family == "root_orientation":
            continue
        lo, hi = d.minDeg, d.maxDeg
        cmds[d.id] = float(rng.uniform(lo, hi) * (0.35 + 0.15 * k))
        cmds[d.id] = float(np.clip(cmds[d.id], lo, hi))
    hd = {}
    for did, d in hand.dofs.items():
        hd[did] = float(np.clip(rng.uniform(d["lo"], d["hi"]) * 0.6, d["lo"], d["hi"]))
    pose = comp.compile(cmds, extra_local=hand.local_rotations(hd))
    D, T = drv.transforms(pose, "canonical")
    V = skin.lbs(D, T)
    sample = list(range(0, len(V), 37))
    poses.append({
        "semantic": cmds, "hand": hd,
        "P": pose["P"].tolist(),
        "twist": pose["physicalTissueTwistDegBySide"],
        "sample": sample, "V": V[sample].tolist(),
    })
out.write_text(json.dumps({"poses": poses}))
print(out, len(poses))
