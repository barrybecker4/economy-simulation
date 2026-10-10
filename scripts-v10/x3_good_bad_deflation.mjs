// X3: good vs bad deflation. Good = bitcoin with productivity growth 3%; bad = fiat with growth 1% and a
// monetary drain (inflation target overridden to -2.5% after slider validation). Comparators: fiat 2% target at
// growth 3% and 1%; bitcoin at growth 1%. Crossed with a downward nominal wage floor (patched P_WAGE_FLOOR = 0.01:
// economy-wide nominal wage cannot fall faster than 1%/yr). Paired by seed. Uses patched-v10 (identical when flags unset).
import fs from 'node:fs';
const LIB = '../patched-v10/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0.1 };
const STRUCT = { S3: { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' }, M: MON };
const SEEDS = Array.from({ length: Number(process.env.NSEEDS ?? 20) }, (_, i) => i + 1);
const T = 240;
const ARMS = [
  { id: 'fiat|g3', regime: 'fiat', g: 0.03 },
  { id: 'bitcoin|g3 (good)', regime: 'bitcoin', g: 0.03 },
  { id: 'fiat|g1', regime: 'fiat', g: 0.01 },
  { id: 'fiat|g1|target-2.5% (bad drain)', regime: 'fiat', g: 0.01, target: -0.025 },
  { id: 'bitcoin|g1', regime: 'bitcoin', g: 0.01 },
  { id: 'bitcoin|g1|noLegacyBook', regime: 'bitcoin', g: 0.01, extra: { 'housing.openingMortgageShareOfOwners': 0 }, only: 'M' },
  { id: 'fiat|g1|noLegacyBook', regime: 'fiat', g: 0.01, extra: { 'housing.openingMortgageShareOfOwners': 0 }, only: 'M' },
];
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
const out = {};
for (const st of Object.keys(STRUCT)) for (const floor of [0, 0.01]) {
  const per = {};
  for (const seed of SEEDS) {
    for (const arm of ARMS) {
      if (arm.only && arm.only !== st) continue;
      if (floor) process.env.P_WAGE_FLOOR = String(floor); else delete process.env.P_WAGE_FLOOR;
      try {
        const config = loadScenario({ name: 'x3', seed, ticks: T, sliders: { ...NOAI, ...STRUCT[st], 'regime.type': arm.regime, 'productivity.baseGrowth': arm.g, ...(arm.extra ?? {}) } });
        if (arm.target !== undefined) config.sliders['centralBank.inflationTarget'] = arm.target;
        const w = new World(config); const h = w.handlers(); let fc = 0; let prev = null; const e = w.economy;
        const wf = h.welfare; h.welfare = (ctx) => { wf(ctx); const t = e.households.map((x) => x.tenure); if (prev) t.forEach((v, i) => { if (prev[i] === 'mortgage' && v === 'rent') fc++; }); prev = t; };
        const S = runSimulation(config, h).metrics.series;
        (per[arm.id] ??= {})[seed] = { infl: mean(S.inflation.slice(24)), u: mean(S.unemployment.slice(24)), rw: S.realWage[239], cons: S.medianRealConsumption[239],
          gdp: S.realGdp[239], defaultsReal: S.defaults.reduce((a, x, i) => a + (x || 0) / S.priceLevel[i], 0), foreclosures: fc, money: S.moneySupply[239] / S.moneySupply[0] };
      } catch (ex) { (per[arm.id] ??= {})[seed] = { err: String(ex.message).slice(0, 100) }; }
      finally { delete process.env.P_WAGE_FLOOR; }
    }
    process.stderr.write(`${st} floor ${floor} seed ${seed}\n`);
  }
  const key = `${st}|floor=${floor}`; out[key] = {};
  for (const arm of ARMS) {
    if (!per[arm.id]) continue;
    const rows = Object.entries(per[arm.id]); const ok = rows.filter(([, r]) => !r.err);
    const lv = (f) => ({ mean: mean(ok.map(([, r]) => f(r))), p5: pct(ok.map(([, r]) => f(r)), 0.05), p95: pct(ok.map(([, r]) => f(r)), 0.95) });
    out[key][arm.id] = { n: ok.length, crashes: rows.filter(([, r]) => r.err).map(([s]) => +s), infl: lv((r) => r.infl), u: lv((r) => r.u), realWage: lv((r) => r.rw), cons: lv((r) => r.cons), gdp: lv((r) => r.gdp), defaultsReal: lv((r) => r.defaultsReal), foreclosures: lv((r) => r.foreclosures), money: lv((r) => r.money) };
  }
  // paired contrasts
  const pair = (a, b) => { const sa = per[a], sb = per[b]; if (!sa || !sb) return null; const seeds = Object.keys(sa).filter((s) => !sa[s].err && sb[s] && !sb[s].err);
    const d = (f, rel) => { const v = seeds.map((s) => rel ? f(sa[s]) / f(sb[s]) - 1 : f(sa[s]) - f(sb[s])); return { mean: mean(v), p5: pct(v, 0.05), p95: pct(v, 0.95) }; };
    return { n: seeds.length, dInfl: d((r) => r.infl), dU: d((r) => r.u), dRealWage: d((r) => r.rw, true), dCons: d((r) => r.cons, true), dGdp: d((r) => r.gdp, true), dDefaultsReal: d((r) => r.defaultsReal), dForeclosures: d((r) => r.foreclosures) }; };
  out[key]._contrasts = { 'good: bitcoin g3 − fiat g3': pair('bitcoin|g3 (good)', 'fiat|g3'), 'bad: fiat drain g1 − fiat g1': pair('fiat|g1|target-2.5% (bad drain)', 'fiat|g1'), 'bitcoin g1 − fiat g1': pair('bitcoin|g1', 'fiat|g1'), 'debt deflation: bitcoin g1 book − bitcoin g1 noBook': pair('bitcoin|g1', 'bitcoin|g1|noLegacyBook'), 'noBook: bitcoin g1 − fiat g1': pair('bitcoin|g1|noLegacyBook', 'fiat|g1|noLegacyBook') };
}
console.log(JSON.stringify(out));
