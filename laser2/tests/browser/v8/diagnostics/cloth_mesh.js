(() => {
  const m = window.LASER2_FOUNDRY.legacy.master;
  const out = {};
  for (const k of ['main', 'jib', 'spin']) {
    const c = m.sails[k].cloth; const g = c.mesh.geometry;
    const uv = g.attributes.uv; const idx = g.index;
    const flatIndexOf = (p) => c.flat.indexOf(p);
    out[k] = {
      rows: c.rows, cols: c.cols, attrs: Object.keys(g.attributes), vcount: g.attributes.position.count, index: idx ? idx.count : null,
      partsShape: [c.parts.length, c.parts[0].length], partsRowMajor: flatIndexOf(c.parts[0][1]) === 1 && flatIndexOf(c.parts[1][0]) === c.cols,
      uv0: uv ? [uv.getX(0), uv.getY(0), uv.getX(1), uv.getY(1), uv.getX(c.cols), uv.getY(c.cols), uv.getX(c.flat.length - 1), uv.getY(c.flat.length - 1)] : null,
      firstTris: idx ? Array.from(idx.array.slice(0, 12)) : null,
      triFirst: c.tris.slice(0, 4),
      meshName: c.mesh.name, parentName: c.mesh.parent?.name, materialType: c.mesh.material.type,
      syncMeshSrc: c.syncMesh.toString().slice(0, 300),
      p0: c.flat[0].x.toArray().map(v => +v.toFixed(3)), pTop: c.flat[c.flat.length - 1].x.toArray().map(v => +v.toFixed(3)),
      row0: c.parts[0].map(p => p.x.toArray().map(v => +v.toFixed(2)).join(',')).join(' | '),
      rowTop: c.parts[c.rows - 1].map(p => p.x.toArray().map(v => +v.toFixed(2)).join(',')).join(' | '),
    };
  }
  const who = []; // find callers of syncMesh in the legacy bundle? not accessible; count calls instead
  return out;
})()
