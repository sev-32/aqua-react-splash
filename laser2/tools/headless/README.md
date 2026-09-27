# Headless harness (V8)

Serves a built `dist/` on a local port, opens it in headless Chromium
(SwiftShader WebGL) and drives the simulation through `window.__sim` and
`window.LASER2_FOUNDRY`.

```bash
cd tools/headless && npm ci          # playwright-core only
cd ../..                             # back to laser2/
npm run build
node tools/headless/film.mjs dist tests/browser/v8/showcase.mjs out/v8 1280 800
```

- `film.mjs <dist> <stages.mjs> <outPrefix> [w] [h]` — runs the stages a
  module default-exports (`{ name, code, shot }`; `code` is evaluated in the
  page), screenshots after each stage unless `shot: false`, and prints each
  stage's result (`RESULT_MAX` raises the 6000-character print limit).
- `shot.mjs <dist> <out.png> [script.js] [waitMs] [w] [h]` — one script, one
  screenshot.
- `profile.mjs <dist> <setup.js> <step.js> [out.json]` — CPU profile of the
  step script; prints the top self-time functions.

Chromium: `CHROMIUM_PATH`, else the sandbox's `/opt/pw-browsers` build, else
playwright's own (`npx playwright install chromium`). Scenarios are in
`tests/browser/v8/`, results in `evidence/browser/v8/`.
