// quick CPU calibration: float math loop similar to XPBD distance constraint
const N = 200000; const x = new Float64Array(N*3).map(()=>Math.random());
let t0 = performance.now(); let s = 0;
for (let it = 0; it < 50; it++) for (let i = 0; i < N-1; i++) { const a=i*3,b=a+3; const dx=x[b]-x[a],dy=x[b+1]-x[a+1],dz=x[b+2]-x[a+2]; const l=Math.sqrt(dx*dx+dy*dy+dz*dz); s+=l; }
console.log('10M constraint-like ops ms', (performance.now()-t0).toFixed(1), s>0);
