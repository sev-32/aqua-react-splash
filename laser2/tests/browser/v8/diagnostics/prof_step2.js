(() => { const t0 = performance.now(); window.__sim.stepN(120); return { msPerStep: (performance.now() - t0) / 120 }; })()
