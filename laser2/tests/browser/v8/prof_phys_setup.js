(() => { const f = window.LASER2_FOUNDRY; f.setMode('sailing'); window.__sim.setWind(14, 0); for (let i = 0; i < 10; i++) { window.__sim.stepN(30); f.kernel.frame(0); } return true; })()
