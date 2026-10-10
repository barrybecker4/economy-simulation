// Why is S2 fiat median consumption 0 after a demand shock with default stimulus (v8)?
import fs from 'node:fs';
const LIB = process.env.LIB ?? '../repo-v10/packages/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const S2 = { 'prices.trendWeight': 1, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' };
const stim = process.argv[2] ?? null;
for (const seed of [1, 2]) {
  const sl = { ...NOAI, ...S2, 'regime.type': 'fiat' }; if (stim !== null) sl['centralBank.stimulus'] = Number(stim);
  const config = loadScenario({ name: 'z', seed, ticks: 240, sliders: sl });
  const w = new World(config, { tick: 60, kind: 'demand', size: -0.15 }); const e = w.economy; const h = w.handlers();
  const snaps = {};
  const wf = h.welfare;
  h.welfare = (ctx) => { wf(ctx); if ([59, 72, 96, 120, 180, 239].includes(ctx.tick)) {
    const c = e.households.map((x) => x.consumption ?? x.lastConsumption ?? 0).sort((a, b) => a - b);
    const dep = e.households.map((x) => x.deposit).sort((a, b) => a - b);
    const inv = e.firms.reduce((a, f) => a + (f.inventory ?? 0), 0); const out = e.firms.reduce((a, f) => a + (f.output ?? f.production ?? 0), 0);
    snaps[ctx.tick] = { medC: c[250], zeroC: c.filter((v) => v <= 0).length, medDep: dep[250].toFixed(0), P: e.priceLevel.toFixed(2), inv: inv.toFixed(0), out: out.toFixed(0), unmet: (e.unmetGoodsDemand ?? 0).toFixed(0), spend: e.consumptionSpend.toFixed(0) };
  } };
  const res = runSimulation(config, h);
  const S = res.metrics.series;
  console.log('seed', seed, 'stim', stim, 'series keys:', Object.keys(S).filter((k) => /cons|Cons|gdp|Gdp/.test(k)).join(','));
  for (const t of Object.keys(snaps)) console.log(' t', t, JSON.stringify(snaps[t]), 'medRC', S.medianRealConsumption?.[t]?.toFixed?.(3), 'rgdp', S.realGdp?.[t]?.toFixed?.(1));
}
