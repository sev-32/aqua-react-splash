(() => { const t0 = performance.now(); window.__sim.stepN(240); return { msPerStep: (performance.now() - t0) / 240 }; })()
