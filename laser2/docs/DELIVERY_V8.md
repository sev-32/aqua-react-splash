# Laser 2 Sailing Foundry V8 — delivery

## Run it

The `laser2/dist` folder is a ready-to-serve build (it includes the LUCID
female-skin-v4.2 crew body built from your LUCID package):

```bash
cd laser2
python3 tools/serve.py          # then open http://127.0.0.1:4173
```

To rebuild from source: `npm install && npm run build` (Node 18+, Python 3),
or `run_linux.sh` / `run_windows.bat`. The LUCID body asset lives in
`laser2/public/assets/lucid/` in this zip only — it is git-ignored and not in
the public repository. Rebuild it with
`python3 tools/build_lucid_crew_asset.py <LUCID_BIOMECH_CAUSAL_RIG_R1 dir>`.

Headless checks: `cd tools/headless && npm ci`, then from `laser2/`
`node tools/headless/film.mjs dist tests/browser/v8/<scenario> out/<prefix>`
(`tests/browser/v8/README.md` lists the scenarios; the showcase renders and
trial logs are in `evidence/browser/v8/`).

Keys: A/D tiller, W/S main, Q/E jib, X/Z hike, C trapeze, **O knockdown
squall**, I auto-recovery on/off, U heave harder on the board, V camera,
N reset.

## Since the first V8 zip

- Physics step ~20% cheaper (rig block refactorised once per sub-step,
  ocean slices shared by two steps, sails rebuilt per rendered frame,
  hull windage sampled once per sub-step).
- Sailable in 18 kn: the main is played against the heel instead of being
  dumped and re-trimmed (45/60/90/135° TWA: 3.3/4.7/6.6/6.0 kn at 13–14°
  heel), and after a recovery the sheets come in slowly against a low heel
  limit.
- Recovery refinements: stalled rightings are judged on the heel trend and
  resolved (climb in over the high gunwale, or back to the board); no dead
  band between 28° and 34°; a righter whose boat stops coming up leans all
  the way out. Headless trials (knockdown → recovery → sailing): 10 kn wet
  32 s, 12 kn dry 29 s, 14 kn dry 26 s, 14 kn wet 33–50 s, 18 kn dry 30 s.
  18 kn with the crew in the water is the known limit: with the mast lying
  downwind the wind holds the rig down, and the boat can go back over and
  turtle before they finish (real crews first swing the bow into the wind;
  the crew AI does not yet). Documented in docs/SAILING_V8.md.

## What to look at

- `showcase/` — frames from one continuous run in 14 kn: sailing, then an
  O-key knockdown, the helm's dry capsize onto the centreboard, righting,
  the crew scooped in, the helm climbing in, both back to windward and
  sailing again (~10 s from going over to sailing).
- `laser2/docs/SAILING_V8.md` — how every system works, measured numbers
  and the exact boundaries of what is and is not simulated.
- `laser2/RELEASE_NOTES_V8.md` — the change list.
