function besselJ0(x) {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const a1 = 57568490574.0 + y * (-13362590354.0 + y * (651619640.7 + y * (-11214424.18 + y * (77392.33017 + y * (-184.9052456)))));
    const a2 = 57568490411.0 + y * (1029532985.0 + y * (9494680.718 + y * (59272.64853 + y * (267.8532712 + y * 1.0))));
    return a1 / a2;
  }
  const z = 8 / ax, y = z * z, xx = ax - 0.785398164;
  const a1 = 1.0 + y * (-0.1098628627e-2 + y * (0.2734510407e-4 + y * (-0.2073370639e-5 + y * 0.2093887211e-6)));
  const a2 = -0.1562499995e-1 + y * (0.1430488765e-3 + y * (-0.6911147651e-5 + y * (0.7621095161e-6 - y * 0.934935152e-7)));
  return Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a1 - z * Math.sin(xx) * a2);
}
function kernel(P, sigma) {
  const dq = 0.001, N = 10000;
  const G = [];
  for (let k = 0; k <= P; k++) { G.push([]); for (let l = 0; l <= P; l++) {
    const r = Math.hypot(k, l);
    let sum = 0;
    for (let n = 1; n <= N; n++) { const q = n * dq; sum += q * q * Math.exp(-sigma * q * q) * besselJ0(q * r); }
    G[k].push(sum * dq);
  } }
  return G;
}
function response(G, P, kappa, dir = [1, 0]) {
  let s = 0;
  for (let k = -P; k <= P; k++) for (let l = -P; l <= P; l++) s += G[Math.abs(k)][Math.abs(l)] * Math.cos(kappa * (k * dir[0] + l * dir[1]));
  return s;
}
for (const [P, sigma] of [[6, 1], [4, 1], [6, 0.5], [6, 1.5], [8, 1]]) {
  const G = kernel(P, sigma);
  // Enforce zero DC response by adjusting the centre.
  let total = 0; for (let k = -P; k <= P; k++) for (let l = -P; l <= P; l++) total += G[Math.abs(k)][Math.abs(l)];
  G[0][0] -= total;
  // Least squares scale on kappa in [0.15, 1.2]
  let num = 0, den = 0;
  for (let kap = 0.15; kap <= 1.2; kap += 0.05) { const r = response(G, P, kap); num += r * kap; den += r * r; }
  const scale = num / den;
  const rows = [];
  for (const kap of [0.05, 0.1, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0, 2.5, 3.0]) rows.push(`${kap}:${(scale * response(G, P, kap) / kap).toFixed(3)}/${(scale * response(G, P, kap, [Math.SQRT1_2, Math.SQRT1_2]) / kap).toFixed(3)}`);
  console.log(`P=${P} sigma=${sigma} scale=${scale.toFixed(4)} ratio(axis/diag): ${rows.join(' ')}`);
}
