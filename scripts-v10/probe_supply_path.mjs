const { loadScenario, runSimulation } = await import('../repo-v10/packages/core/dist/index.js');
const { World } = await import('../repo-v10/packages/core/dist/sim/world.js');
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const out = {};
for (const [st, sl] of [['S0', {}], ['S2', { 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' }], ['S2flhOff', { 'production.demandWeight': 1, 'labor.firmLevelHiring': 'off' }], ['S2rig0', { 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on', 'wage.nominalRigidity': 0 }]]) for (const regime of ['fiat', 'bitcoin']) {
  const acc = new Array(36).fill(0); const gl = []; let n = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const run = (shock) => { const c = loadScenario({ name: 'x', seed, ticks: 144, sliders: { ...NOAI, ...sl, 'regime.type': regime } }); return runSimulation(c, new World(c, shock).handlers()); };
    try { const b = run(null), s = run({ tick: 60, kind: 'productivity', size: -0.1 });
      for (let k = 0; k < 36; k++) acc[k] += s.metrics.series.unemployment[56 + k] - b.metrics.series.unemployment[56 + k]; n++; const gb = b.metrics.series.realGdp.slice(60, 144).reduce((a, x) => a + x, 0), gs = s.metrics.series.realGdp.slice(60, 144).reduce((a, x) => a + x, 0); gl.push(1 - gs / gb); } catch (e) {}
  }
  const path = acc.map((x) => +(x / n * 100).toFixed(2)); const w = (a, b) => +(path.slice(a - 56, b - 56).reduce((x, y) => x + y, 0) / (b - a)).toFixed(2); out[st + ' ' + regime] = { n, du_60_71: w(60, 72), du_72_83: w(72, 84), du_60_83: w(60, 84), gdpLoss_60_143_pct: +(gl.reduce((a, x) => a + x, 0) / gl.length * 100).toFixed(2), path };
}
console.log(JSON.stringify(out));
