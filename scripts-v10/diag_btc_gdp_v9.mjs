// Why does v9 bitcoin real GDP fall ~20-45% (S3, D, M) while unemployment falls? Trace one seed per build.
import fs from 'node:fs';
const LIB = process.env.LIB ?? '../repo-v10/packages/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const { firmCapacity } = await import(`${LIB}/sim/capacity.js`);
const MON = JSON.parse(fs.readFileSync(LIB.replace('packages/core/dist', 'scenarios/presets/monetary.json'))).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const S3 = { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' };
const which = process.argv[2] ?? 'S3'; const regime = process.argv[3] ?? 'bitcoin';
const config = loadScenario({ name: 'g', seed: 1, ticks: 240, sliders: { ...NOAI, ...(which === 'M' ? MON : S3), 'regime.type': regime } });
const w = new World(config); const e = w.economy; const h = w.handlers();
const snaps = [];
const wf = h.welfare;
h.welfare = (ctx) => { wf(ctx); if ([1, 12, 36, 60, 120, 180, 239].includes(ctx.tick)) {
  const inv = e.firms.reduce((a, f) => a + Math.max(0, f.inventory), 0); const cap = e.firms.reduce((a, f) => a + firmCapacity(e, f), 0);
  const es = e.firms.reduce((a, f) => a + f.expectedSales, 0);
  const emp = e.households.filter((x) => x.employer !== null && x.employer !== undefined && x.employer >= 0).length;
  snaps.push({ t: ctx.tick, P: +e.priceLevel.toFixed(2), rgdp: +e.realGdp.toFixed(0), inv: +inv.toFixed(0), cap: +cap.toFixed(0), expSales: +es.toFixed(0), spend: +e.consumptionSpend.toFixed(0), desired: +e.desiredSpend.toFixed(0), unmet: +(e.unmetGoodsDemand ?? 0).toFixed(0), W: +e.wageLevel.toFixed(1), firms: e.firms.length, emp });
} };
const res = runSimulation(config, h); const S = res.metrics.series;
console.log(`${which} ${regime} ${(LIB.match(/(repo|patched)-v\d+/) || ['?'])[0]} u_end ${S.unemployment[239].toFixed(3)}`);
for (const s of snaps) console.log(JSON.stringify(s), 'u', S.unemployment[s.t].toFixed(3));
