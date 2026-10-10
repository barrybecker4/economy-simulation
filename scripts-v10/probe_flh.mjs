// Is labor.firmLevelHiring 'on' bit-identical to 'off'? Compare full series, with and without shocks.
const { loadScenario, runSimulation } = await import('../repo-v10/packages/core/dist/index.js');
const { World } = await import('../repo-v10/packages/core/dist/sim/world.js');
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const cases = [
  ['S2 base', { 'production.demandWeight': 1 }, null],
  ['S3 base', { 'production.demandWeight': 1, 'prices.trendWeight': 0 }, null],
  ['S2 supply', { 'production.demandWeight': 1 }, { tick: 60, kind: 'productivity', size: -0.1 }],
  ['S2 demand', { 'production.demandWeight': 1 }, { tick: 60, kind: 'demand', size: -0.15 }],
  ['S2 random shocks', { 'production.demandWeight': 1, 'shock.frequency': 0.5 }, null],
];
const out = {};
for (const [lbl, sl, shock] of cases) for (const regime of ['fiat', 'bitcoin']) {
  let identical = 0, maxDiff = 0;
  for (let seed = 1; seed <= 5; seed++) {
    const run = (flh) => { const c = loadScenario({ name: 'x', seed, ticks: 240, sliders: { ...NOAI, ...sl, 'labor.firmLevelHiring': flh, 'regime.type': regime } }); return runSimulation(c, new World(c, shock).handlers()).metrics.series; };
    const a = run('off'), b = run('on');
    let d = 0; for (const k of ['unemployment', 'realGdp', 'priceLevel', 'medianRealConsumption', 'moneySupply']) for (let t = 0; t < 240; t++) d = Math.max(d, Math.abs((a[k][t] ?? 0) - (b[k][t] ?? 0)));
    if (d === 0) identical++; maxDiff = Math.max(maxDiff, d);
  }
  out[`${lbl}|${regime}`] = { identicalSeeds: `${identical}/5`, maxAbsDiff: maxDiff };
  console.error(lbl, regime, identical, maxDiff);
}
console.log(JSON.stringify(out, null, 1));
