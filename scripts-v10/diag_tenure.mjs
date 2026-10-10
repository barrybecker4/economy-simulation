// Count tenure transitions (rent->owned, rent->mortgage, mortgage->owned, mortgage->rent (foreclosure), owned->rent) and bank equity, read-only.
import { loadScenario, runSimulation } from '../repo-v10/packages/core/dist/index.js';
import { World } from '../repo-v10/packages/core/dist/sim/world.js';
import fs from 'node:fs';
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json', 'utf8'));
const monS = MON.sliders ?? MON;
const base = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3 };
const cfgs = {
  'S0+tenure fiat': { ...base, 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on', 'regime.type': 'fiat' },
  'S0+tenure bitcoin': { ...base, 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on', 'regime.type': 'bitcoin' },
  'M fiat': { ...base, ...monS, 'regime.type': 'fiat' },
  'M bitcoin': { ...base, ...monS, 'regime.type': 'bitcoin' },
};
const out = {};
for (const [name, sliders] of Object.entries(cfgs)) {
  const agg = {}; let minEq = Infinity, eqEnd = 0, negEqTicks = 0, n = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const config = loadScenario({ name, seed, ticks: 240, sliders });
    const world = new World(config, null); const e = world.economy; const h = world.handlers();
    let prev = e.households.map((x) => x.tenure);
    const w = h.welfare;
    h.welfare = (ctx) => { w(ctx);
      e.households.forEach((x, i) => { if (prev[i] !== x.tenure) { const k = `${prev[i]}->${x.tenure}`; agg[k] = (agg[k] ?? 0) + 1; } });
      prev = e.households.map((x) => x.tenure);
      const eq = e.banks.reduce((s, b) => s + b.equity, 0) / e.priceLevel;
      minEq = Math.min(minEq, eq); if (eq < 0) negEqTicks++; n++;
      if (ctx.tick === 239) eqEnd += eq / 5;
    };
    runSimulation(config, h);
  }
  for (const k in agg) agg[k] /= 5;
  out[name] = { transitionsPerRun: agg, minRealBankEquity: minEq, shareTicksNegativeAggBankEquity: negEqTicks / n, realBankEquityEnd: eqEnd };
}
console.log(JSON.stringify(out, null, 1));
