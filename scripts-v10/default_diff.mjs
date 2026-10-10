const get = async (v) => { const m = await import(`/workspace/econ-sim/repo-${v}/packages/core/dist/config/registry.js`); return m; };
const a = await get('v6'), b = await get('v7');
const reg = (m) => { const r = m.SLIDERS || m.sliders || m.REGISTRY || Object.values(m).find((x) => Array.isArray(x) && x[0]?.id); return Object.fromEntries(r.map((s) => [s.id, s])); };
const A = reg(a), B = reg(b);
for (const id of new Set([...Object.keys(A), ...Object.keys(B)])) {
  const x = A[id], y = B[id];
  const dv = (s) => s ? JSON.stringify(s.default ?? s.defaultValue) : 'absent';
  const mn = (s) => s ? JSON.stringify(s.min) : '';
  if (dv(x) !== dv(y) || mn(x) !== mn(y)) console.log(`${id}\t${dv(x)} -> ${dv(y)}\tmin ${mn(x)} -> ${mn(y)}`);
}
