// S0 bitcoin-fiat gap with and without the treasury rebate (buffer 24 months = rebate effectively off), paired 20 seeds, E1 settings (shock freq 0.1).
const { loadScenario, runSimulation } = await import('../repo-v10/packages/core/dist/index.js');
const { World } = await import('../repo-v10/packages/core/dist/sim/world.js');
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3 };
const out = {};
for (const [lbl, extra] of [['rebate default', {}], ['buffer24', { 'government.treasuryBufferMonths': 24 }]]) {
  const gaps = [], fc = [], bc = [], tf = [], tb = [];
  for (let seed = 1; seed <= 20; seed++) {
    const run = (regime) => { const c = loadScenario({ name: 'x', seed, ticks: 240, sliders: { ...NOAI, ...extra, 'regime.type': regime } }); const w = new World(c); const e = w.economy; const res = runSimulation(c, w.handlers()); const S = res.metrics.series; return { cons: S.medianRealConsumption[239], tax: S.taxRevenue.slice(12).reduce((a, b) => a + b, 0), gs: S.govGoodsSpend.slice(12).reduce((a, b) => a + b, 0) }; };
    const f = run('fiat'), b = run('bitcoin');
    fc.push(f.cons); bc.push(b.cons); gaps.push(b.cons / f.cons - 1); tf.push(f.tax / f.gs); tb.push(b.tax / b.gs);
  }
  const m = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const sorted = [...gaps].sort((a, b) => a - b);
  out[lbl] = { fiatCons: m(fc), btcCons: m(bc), gapPctMean: m(gaps) * 100, gapPctMedian: sorted[10] * 100, taxOverGovSpend_fiat: m(tf), taxOverGovSpend_btc: m(tb) };
}
console.log(JSON.stringify(out, null, 1));
