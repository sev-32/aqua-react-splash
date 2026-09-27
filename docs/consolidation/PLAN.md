# Plan: building the local detail layer (the "magic carpet") from the champions

THALASSA already owns the far field (ocean, optics, sky, globe) at champion level. The plan below builds the **local layer**: a high-detail carpet that follows a body or boat, rides the ocean heightfield, and runs the core law (`CORE_LAW.md`). It is built from the champions in `REFERENCE_MAP.md`.

**Working rules, applied to every stage:**
1. Name the champion first and capture it unmodified in the matched scene before writing code.
2. Verify THALASSA against it side by side (same scale, speed and camera) and against the physics acceptance numbers. "No GL errors" is never a quality pass.
3. Update the docs (`references/*.md`, this plan) in the same commit as the code.
4. Never drop below any champion; a regression blocks the stage.

## Decisions I need from you

1. **Where the references live.** I recommend a **private GitHub repo** (for example `sev-32/water-references`). Upload each piece once, in chunks under 30 MB; I unpack, deduplicate, hash and file them with this map. Every future session clones it, so nothing needs re-uploading. The alternative is `docs/reference/` in this repo, but this repo is **public**.
2. **Backend for the detached-liquid solver** (stage P4). The best particle solvers in your corpus are WebGPU compute (Particles4All, HybridSplash MPM, "Splash"). THALASSA is WebGL2. Options:
   - **(a) Recommended.** A WebGPU compute module for the splash particles, composited into THALASSA's WebGL2 frame through a shared texture, with a WebGL2 fallback at lower counts.
   - (b) Everything in WebGL2 (fragment-shader MPM/PBF, roughly 30–60 k particles).
   - (c) Move THALASSA's renderer to WebGPU now.

   Verification note: in my environment, basic WebGPU compute runs on the software GPU. Particles4All and HybridSplash lose the device there. I can verify my own WebGPU code if I avoid the crashing features, but final performance and look need a run on your GPU.
3. **Optional uploads** that would sharpen specific stages (see `INVENTORY.md`):
   - T4R pool optics (P7);
   - the AQUA source (`pool.zip`, or the pass-13 build) for exact launch/return code (P3, P5);
   - the top HybridSplash HSF candidates plus `ProPool.html` (P6).

## Canonical matched scenes

Captured for references and THALASSA alike:

| ID | Scene | Scale | Champions to compare |
|---|---|---|---|
| S1 | Tow, sphere r = 0.68 m at U = 1.0 / 2.0 / 4.5 m/s, H = 1 m pool | BEST's | heightfieldBEST (captured: `img/best_tow_*`), JIT lab |
| S2 | Tow in deep water, the S1 sphere at U = 1.5 m/s (Fr_L = 0.41; measured in P1), then U = 2 and 5 m/s | open sea | WaveLab analytic Kelvin overlay |
| S3 | Drop, sphere released from 1.15 m | pool | BEST "drop", JIT lab drop (captured), AQUA |
| S4 | Lift-out / void | pool | BEST "lift", JIT lab wet-exit (film ledger) |
| S5 | Plunging breaker on a 1:20 beach, Hs 1.2 m, Tp 9 s | nearshore | WaveLab, HybridSplash v43 |
| S6 | Overtopping a lip into a basin (HybridSplash terrain test T07 "lip-wall") | nearshore | HybridSplash v43 |
| S7 | Laser dinghy at 3 m/s and a motorboat at 8 m/s | open sea | WaveLab Wake Lab, gptwaves boats |
| S8 | Small sphere drop, crown and tendrils (r = 2 cm at 3 m/s) | lab | Particles4All, AQUA ligament lifecycle |

## Stages

### P0 — Organisation (this commit, plus the reference repo once you decide)
- These docs: map, per-reference analyses, core law, plan, inventory with every file hashed.
- Capture harness for the references (headless + Xvfb, WebGL2 and WebGPU lanes) with a receipt per scene.
- **Done when:** the docs are merged and the S1/S3 captures of BEST and the lab are archived with receipts. BEST tows and lab drop/tow already exist in this session.

### P1 — Carpet kernel (the wake): BEST coupling plus dispersion, following the body, riding the ocean

**Status: built.** See `P1_CARPET.md` for the physics, the measured S1/S2 results against BEST, GPU parity and the tests.

- **As built.** Instead of a new staged SWE, THALASSA's eWave tiles were upgraded into the carpet (`CORE_LAW.md` §1):
  - occupancy σ against the moving ocean surface, band-limited, swept by substeps with interpolated poses;
  - BEST's volume-exact source;
  - **the hull's hold** (a stiff penalty pressure where the body pierces the surface, κ ≈ 100, converged) in place of BEST's blocking and push ring;
  - exact dispersion;
  - body-scaled cells (≈12 across a small body);
  - a follow lead (the carpet sits behind the body), whole-cell shifts, absorbing rims;
  - priming for bodies already afloat.
- **Limiter change** (needed for the carpet to hold with the limiter on): breaking now spills and mixes (volume exact), and only ballistic separation releases spray. The old per-step release drained the sea at carpet resolution.
- **Acceptance, as measured:**
  - S1: bow pile-up, stern hollow, volume ledger ≈ 1e-14 m³;
  - supercritical wake energy (99 %, measured from the body's shoulders 5–9 m back) inside the Mach wedge at 3.5 and 4.5 m/s, and 3.5° outside at 6 m/s (criterion +3°; restated because BEST's single V is the non-dispersive limit);
  - S2: λ = 2πU²/g within 1 %, and the Kelvin arm converging to 19.5° with distance;
  - recentring seamless (≤ 5 % near the body against a fixed carpet);
  - no drift on a swell;
  - GPU = CPU mirror (correlation ≥ 0.98).
  - 60 fps still has to be measured on real hardware.
- **Still open (P1b):**
  - advect the carpet with the orbital velocity (a body drifting with the swell is still seen as moving);
  - the world hydro memory of Lab R22 for revisited cells;
  - physical rather than numerical damping defaults.

### P2 — Body dynamics
- gptwaves-v7 sphere terms on top of THALASSA column buoyancy:
  - added mass, planing lift/drag, skim-bounce, slam, slope slide;
  - servo control (the pointer moves bodies, never water).
- Hulls through the same σ function. Lab R21 contact receipts.
- **Acceptance:**
  - buoyant equilibrium within 1 % of Archimedes;
  - a skimming stone bounces with the correct angle/speed gates;
  - a planing hull rises onto the plane at the Froude threshold;
  - drop penetration depth vs mass matches the analytic trend.

### P3 — Launch (where, how much, how fast, what shape)
- Detection:
  - representability excess plus **B = u_s/c ≥ 0.85**;
  - material w and flow-map compression;
  - depth-limited breaking γ(bed slope), Fr;
  - WaveLab plunge clock and lip momentum;
  - waterline impact / Wagner.
- Two-threshold lifecycle.
- Events: JIT controller (persistence, budget frozen at birth, hysteresis, cooldown, patches), NMS crest leaders (AQUA), ledger debit (JIT `admit` semantics).
- Material launch velocity, work-bounded body kick, crest ribbons plus temporal ribbons, energy bridge.
- **Acceptance:**
  - calm sea never emits;
  - sustained breaker gives a bounded rate;
  - emission at the crest front;
  - ledger residual < 1e-9 m³ per event;
  - momentum loss equals launch within 1 %;
  - connected sheet within 50 ms (S3, S5, S7).

### P4 — Detached liquid (1–3 cm, surface tension, GPU)
- Side-by-side test of the two solver candidates:
  - PBF with Akinci tension (Particles4All method);
  - MLS-MPM with a cohesive EOS (HybridSplash MPM / "Splash" as bases).
- Carriers split into fine particles on the ribbon sheet; ledger IDs preserved.
- Release by the curvature criterion (`CORE_LAW.md` §4). Breakup by Taylor–Culick, Rayleigh–Plateau and Weber scales.
- Rendering: anisotropic SSFR with the narrow-range filter, lit by POSEIDON optics with THALASSA's sun opacity shadow map.
- **Acceptance:**
  - S8: crown → rim → ligaments → satellite drops in order over 0.2 s;
  - tendrils visible;
  - ≥ 30 k particles in budget (hardware);
  - no overwrites.
- **You judge S3/S7/S8 against Particles4All on your GPU.**

### P5 — Return, air, foam
- JIT return (crossing, normalised footprint, momentum mix, zero-impulse radial pulse).
- AQUA footprint vocabulary: droplet/blob/sheet/pour/rain, zero-mean, budgets.
- Subsurface entrainment: bubbles, plume clouds, surfacing → foam (Foundry storage), fresh-aeration glow.
- Metric body film (Lab R21).
- **Acceptance:**
  - single drop gives a clean ring;
  - slap gives an elongated footprint;
  - spray field gives agitation;
  - basin mean does not drift;
  - plume surfaces to foam in 1–3 s;
  - wet exit retains film with ledger < 1e-12.

### P6 — Nearshore physics terms into T2
- HybridSplash v43 terms on THALASSA's HLL numerics:
  - `∂η_B/∂t` correction;
  - γ(bed slope) plus roller eddy viscosity;
  - longshore current;
  - settled-water infiltration;
  - swash apex foam rope and residue;
  - hard-edge film with overtop/recede/lip.
- WaveLab plunge clock and lip momentum feed P3 launches.
- **Acceptance:**
  - S5: spilling vs plunging by bed slope, runup and backwash asymmetry, apex rope at max reach;
  - S6: water sheets over the lip, drains down the face, pools in the basin with the correct volume.

### P7 — Optics polish and pool receiver
- Compare against T4R (after upload) and POSEIDON close-ups.
- The attached lip is rendered as heightfield surface (no seam at release).
- **Acceptance:** matched close-ups with no shader seam between surface, lip and sheet; caustic receiver parity with T4R.

### P8 — Scheduler and cockpit (M6/M7)
- Managed pages by truth risk (Lab R22), several carpets (a boat plus a swimmer), budgets and unmet-demand reporting.
- AQUA-style cockpit: live alerts, 2D field drawer (height, B, excess, detachment, azimuth, foam), receipts.
- Validation suite covering S1–S8.
- **Acceptance:** all stage gates re-pass together, with S1–S8 captures and receipts.

## Order and dependencies

P1 comes first: great waves and reactions make everything else easy, as you said. P2 runs in parallel with P1. P3 needs P1. P4 needs P3; its solver choice is made by the side-by-side test. P5 needs P4. P6 can start after P1. P7 and P8 close.
