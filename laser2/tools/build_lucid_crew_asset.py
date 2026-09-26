#!/usr/bin/env python3
"""Export the canonical LUCID female-skin-v4.2 body for the Sailing Foundry crew.

usage: python3 tools/build_lucid_crew_asset.py <LUCID_BIOMECH_CAUSAL_RIG_R1 dir> [out_dir]

Reads the hash-locked inputs of the LUCID Biomechanical Causal Rig package
(R1.5) through its own loader and writes a compact browser asset:

  lucid_female_v4_2.bin   positions, rest normals, skin indices/weights
                           (≤ 8 influences, canonical per-vertex weight-sum
                           division applied), material regions, triangles
  lucid_female_v4_2.json  skeleton (Semantic51 joints, parents, rest joint
                           positions), the 78 cluster names and pivots, the
                           Semantic51 DOF table (axes, hard ranges, families),
                           the declared hand layer DOFs, grip profiles, the 75 kg
                           physical body profile (17 segment masses), provenance.

Nothing is re-derived or edited: VREST, faces, the Skin78 weights and pivots are
the canonical arrays (cast to float32 for the GPU). The canonical cluster driver
rules and LBS are re-implemented in TypeScript (src/crew/lucid/).
"""
from __future__ import annotations

import hashlib
import json
import struct
import sys
from pathlib import Path

import numpy as np

CANONICAL_SKIN_SHA = "88b6cacd2f7ad7fad0c5c9d9c731afcbc1388e09c5f0e817d181a62f11844a10"
MAX_INFLUENCES = 8


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    pkg = Path(sys.argv[1]).resolve()
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[1] / "public" / "assets" / "lucid"
    out_dir.mkdir(parents=True, exist_ok=True)
    sys.path.insert(0, str(pkg))
    from lucid_bcr.assets import load_character, verify_sources, load_json  # noqa: E402
    from lucid_bcr.semantic import compiler  # noqa: E402
    from lucid_bcr.anatomy import HandLayer  # noqa: E402

    report = verify_sources()  # raises on any hash mismatch
    a = load_character(verify=False)
    if a.skin_sha256 != CANONICAL_SKIN_SHA:
        raise SystemExit(f"canonical skin hash mismatch: {a.skin_sha256}")

    V = a.vrest.astype(np.float64)
    F = a.faces.astype(np.int64)
    nv, nf = len(V), len(F)
    if nv >= 65536:
        raise SystemExit("vertex count exceeds uint16 indices")

    # Rest normals (area weighted), for the GPU; LBS transforms them at runtime.
    e1 = V[F[:, 1]] - V[F[:, 0]]
    e2 = V[F[:, 2]] - V[F[:, 0]]
    fn = np.cross(e1, e2)
    N = np.zeros_like(V)
    for k in range(3):
        np.add.at(N, F[:, k], fn)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)

    # Skin influences: canonical weights divided by the per-vertex sum (the
    # canonical runtime division), sorted by weight.
    W = a.W.tocsr()
    counts = np.diff(W.indptr)
    if counts.max() > MAX_INFLUENCES:
        raise SystemExit(f"vertex with {counts.max()} influences exceeds {MAX_INFLUENCES}")
    skin_index = np.zeros((nv, MAX_INFLUENCES), np.uint8)
    skin_weight = np.zeros((nv, MAX_INFLUENCES), np.float32)
    for v in range(nv):
        s, e = W.indptr[v], W.indptr[v + 1]
        idx = W.indices[s:e]
        w = W.data[s:e] / a.weight_sum[v]
        order = np.argsort(-w)
        skin_index[v, : e - s] = idx[order]
        skin_weight[v, : e - s] = w[order]

    # Material regions from the dominant cluster (0 suit, 1 head skin, 2 hand, 3 foot, 4 neck).
    names = a.cluster_names
    dom = np.asarray(W.argmax(axis=1)).ravel()
    region = np.zeros(nv, np.uint8)
    for v in range(nv):
        n = names[dom[v]]
        if n in ("Head", "JawRoot", "NeckTwist02"):
            region[v] = 1
        elif n.endswith("_Hand") or any(n[2:].startswith(f) for f in ("Index", "Mid", "Ring", "Pinky", "Thumb")):
            region[v] = 2
        elif n.endswith("_Foot") or "Toe1" in n:
            region[v] = 3
        elif n == "NeckTwist01":
            region[v] = 4

    sections = []
    blob = bytearray()

    def add(name: str, arr: np.ndarray, dtype: str) -> None:
        while len(blob) % 4:
            blob.append(0)
        data = np.ascontiguousarray(arr).tobytes()
        sections.append({"name": name, "offset": len(blob), "bytes": len(data), "dtype": dtype, "shape": list(arr.shape)})
        blob.extend(data)

    add("position", V.astype("<f4"), "float32")
    add("normal", N.astype("<f4"), "float32")
    add("skinIndex", skin_index, "uint8")
    add("skinWeight", skin_weight.astype("<f4"), "float32")
    add("region", region, "uint8")
    add("index", F.astype("<u2"), "uint16")

    comp = compiler()
    defs = comp.definitions()
    joint_index = {n: i for i, n in enumerate(a.joint_names)}
    semantic = [
        {
            "id": d["id"], "joint": joint_index[d["joint"]], "family": d["family"],
            "axis": [float(x) for x in d["axisRestTarget"]],
            "min": float(d["minDeg"]), "max": float(d["maxDeg"]),
        }
        for d in defs["dofs"]
    ]
    hand = HandLayer()
    hand_dofs = [
        {
            "id": did, "joint": joint_index[d["joint"]], "dof": d["dof"],
            "axis": [float(x) for x in d["axis"]],
            "min": d["lo"], "max": d["hi"], "comfortMin": d["comfortLo"], "comfortMax": d["comfortHi"],
        }
        for did, d in hand.dofs.items()
    ]
    grips = load_json("config/hand_grip_profiles_v1.json")["profiles"]
    profile = a.physical_profile
    bodies = [
        {"body": b["body"], "joint": profile["jointMap"][b["body"]], "massKg": b["massKg"],
         "centerWorldRestM": [b["centerWorldRestM"][k] for k in "xyz"]}
        for b in profile["bodies"]
    ]
    header = {
        "schema": "sailing-foundry.lucid-crew-asset.v1",
        "character": "female-skin-v4.2 (LUCID Biomechanical Causal Rig R1.5)",
        "status": "CANDIDATE body asset used unchanged; not owner-approved for production",
        "provenance": {
            "canonicalSkinSha256": a.skin_sha256,
            "sourceLocks": {k: v["actual"] for k, v in report.items()},
            "statement": "VREST, faces, Skin78 weights and cluster pivots are the canonical arrays (float32 on the GPU). "
                         "Weights are divided by the canonical per-vertex weight sum, as the canonical runtime does. "
                         "The canonical helper-cluster driver rules and LBS are re-implemented in TypeScript; nothing edits weights.",
        },
        "vertexCount": nv,
        "triangleCount": nf,
        "maxInfluences": MAX_INFLUENCES,
        "sections": sections,
        "regions": {"0": "suit", "1": "head", "2": "hand", "3": "foot", "4": "neck"},
        "joints": a.joint_names,
        "parents": [int(p) for p in a.parents],
        "restJoints": [[float(x) for x in b] for b in a.Brest],
        "clusters": names,
        "clusterPivots": [[float(x) for x in p] for p in a.cluster_pivots],
        "frame": defs["targetFrame"],
        "semantic51": semantic,
        "handDofs": hand_dofs,
        "gripProfiles": grips,
        "body": {"massKg": profile["totalMassKg"], "segments": bodies,
                 "centerOfMassRestM": [profile["globalCenterOfMassRestM"][k] for k in "xyz"]},
    }
    (out_dir / "lucid_female_v4_2.bin").write_bytes(bytes(blob))
    (out_dir / "lucid_female_v4_2.json").write_text(json.dumps(header, indent=1))
    print(json.dumps({
        "bin": str(out_dir / "lucid_female_v4_2.bin"), "bytes": len(blob),
        "binSha256": sha256(out_dir / "lucid_female_v4_2.bin"),
        "vertices": nv, "triangles": nf, "influencesHistogram": np.bincount(counts).tolist(),
        "regions": np.bincount(region).tolist(),
    }, indent=1))


if __name__ == "__main__":
    main()
