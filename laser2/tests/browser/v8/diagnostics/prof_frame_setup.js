(() => { const f = window.LASER2_FOUNDRY; window.__sim.setWind(12, 0); for (let i = 0; i < 20; i++) f.kernel.frame(1 / 60); return true; })()
