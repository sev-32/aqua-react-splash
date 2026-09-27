import { buildHullMesh, deckY, cockpitBlend } from '/home/user/aqua-react-splash/laser2/dist/src/sailing/HullGeometry.js';
const m = buildHullMesh();
const P = m.positions;
let rows = [];
for (const z of [-2.0, -1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5]) {
  let maxY = -1e9, minY = 1e9;
  for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i + 2] - z) < 0.12 && Math.abs(P[i]) < 0.15) { maxY = Math.max(maxY, P[i + 1]); minY = Math.min(minY, P[i + 1]); }
  rows.push(`z=${z}: centreline maxY ${maxY.toFixed(3)} minY ${minY.toFixed(3)} deckY(0,z)=${deckY(0, z).toFixed(3)} cockpitBlend=${cockpitBlend(0, z).toFixed(2)}`);
}
console.log(rows.join('\n'));
console.log('stations', m.stations, 'verts/station', m.verticesPerStation, 'volume', m.volume.toFixed(3));
