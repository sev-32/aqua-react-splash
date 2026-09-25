(() => {
  "use strict";
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const nativeCAF = window.cancelAnimationFrame.bind(window);
  const queued = new Map();
  let nextId = 1_000_000_000;
  let mode = "hold"; // hold -> static render-on-demand -> dynamic continuous
  let pulseBudget = 0;
  let pulseScheduled = false;

  function scheduleStaticPulse() {
    if (pulseScheduled || mode === "dynamic" || pulseBudget <= 0 || queued.size === 0) return;
    pulseScheduled = true;
    nativeRAF((timestamp) => {
      pulseScheduled = false;
      const callbacks = [...queued.values()];
      queued.clear();
      for (const callback of callbacks) {
        try { callback(timestamp); }
        catch (error) { console.error("LASER2 RAF callback failed", error); }
      }
      pulseBudget = Math.max(0, pulseBudget - 1);
      if (pulseBudget > 0) scheduleStaticPulse();
    });
  }

  window.__LASER2_NATIVE_RAF = nativeRAF;
  window.__LASER2_NATIVE_CAF = nativeCAF;
  window.requestAnimationFrame = (callback) => {
    if (mode === "dynamic") return nativeRAF(callback);
    const id = nextId++;
    queued.set(id, callback);
    scheduleStaticPulse();
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    if (queued.delete(id)) return;
    nativeCAF(id);
  };

  window.__LASER2_PULSE_RAF = (frames = 1) => {
    if (mode === "dynamic") return false;
    if (mode === "hold") mode = "static";
    pulseBudget = Math.max(pulseBudget, Math.max(1, Math.floor(frames)));
    scheduleStaticPulse();
    return true;
  };

  window.__LASER2_SET_RAF_DYNAMIC = (enabled) => {
    const dynamic = !!enabled;
    if (dynamic) {
      if (mode === "dynamic") return false;
      mode = "dynamic";
      pulseBudget = 0;
      const callbacks = [...queued.values()];
      queued.clear();
      for (const callback of callbacks) nativeRAF(callback);
      return true;
    }
    mode = "static";
    return true;
  };

  window.__LASER2_RELEASE_RAF = () => {
    if (mode !== "hold") return false;
    mode = "static";
    window.__LASER2_PULSE_RAF(1);
    return true;
  };

  window.__LASER2_RAF_GATE = {
    get mode() { return mode; },
    get queued() { return queued.size; },
    get pulseBudget() { return pulseBudget; },
  };
})();
