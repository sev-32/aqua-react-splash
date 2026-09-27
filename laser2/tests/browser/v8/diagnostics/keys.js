(() => {
  const m = window.LASER2_FOUNDRY.legacy.master;
  const out = { master: Object.keys(m) };
  for (const k of Object.keys(m)) { const v = m[k]; if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = Object.keys(v).slice(0, 40); }
  const find = []; for (const k of Object.keys(m)) { const v = m[k]; if (v?.cloth) find.push(k + '.cloth'); if (v?.flat) find.push(k + '.flat'); }
  out.clothHolders = find;
  const main = m.main ?? m.mainSail ?? null;
  out.mainCloth = main?.cloth ? { n: main.cloth.flat?.length, tris: main.cloth.tris?.length, keys: Object.keys(main.cloth).slice(0, 40), p0: Object.keys(main.cloth.flat[0]) , w: main.cloth.flat[5].w } : null;
  return out;
})()
