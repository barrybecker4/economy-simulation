// Round 5: legacy opening mortgage book on/off and mortgage decision modes (patched-v10 MORTGAGE_MODE, identical to
// repo-v10 at mode 'head'). 20 seeds, 500/50/3, AI share 0.3 flat, random shocks 0.1 (suite-consistent), 240 ticks.
// Usage: node probe_mortgage_legacy.mjs <legacy|modes|s0modes> > out.json
import fs from 'node:fs';
const LIB = '../patched-v10/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const { expectedInflation } = await import(`${LIB}/sim/helpers.js`);
const { totalDeposits } = await import(`${LIB}/sim/banking.js`);
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const BASE = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': Number(process.env.SHOCKF ?? 0.1) };
const S0T = { 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on' };
const NOBOOK = { 'housing.openingMortgageShareOfOwners': 0 };
const SEEDS = Array.from({ length: Number(process.env.NSEEDS ?? 20) }, (_, i) => i + 1);
const T = 240;
const arms = [];
const G = process.argv[2];
if (G === 'legacy') {
  for (const book of ['book', 'noBook']) {
    for (const regime of ['fiat', 'bitcoin', 'hybrid']) arms.push({ id: `M|${regime}|${book}`, sl: { ...MON, 'regime.type': regime, ...(book === 'noBook' ? NOBOOK : {}) } });
    arms.push({ id: `M|bitcoin|${book}|resOff`, sl: { ...MON, 'regime.type': 'bitcoin', 'bank.resolution': 'off', ...(book === 'noBook' ? NOBOOK : {}) } });
    for (const regime of ['fiat', 'bitcoin']) arms.push({ id: `M|${regime}|${book}|hoard3`, sl: { ...MON, 'regime.type': regime, 'household.realReturnSensitivity': 3, ...(book === 'noBook' ? NOBOOK : {}) } });
    arms.push({ id: `M|fiat|${book}|pass0`, sl: { ...MON, 'regime.type': 'fiat', 'bank.depositPassThrough': 0, ...(book === 'noBook' ? NOBOOK : {}) } });
    for (const regime of ['fiat', 'bitcoin']) arms.push({ id: `M|${regime}|${book}|sigma0.5`, sl: { ...MON, 'regime.type': regime, 'household.skillSigma': 0.5, ...(book === 'noBook' ? NOBOOK : {}) } });
  }
} else if (G === 'modes') {
  for (const mode of ['nominal', 'v4', 'realonly', 'single', 'noprepay', 'researcher', 'head'])
    for (const regime of ['fiat', 'bitcoin']) arms.push({ id: `M|${regime}|mode=${mode}`, mode, sl: { ...MON, 'regime.type': regime } });
  for (const mode of ['nominal', 'researcher', 'head'])
    for (const regime of ['fiat', 'bitcoin']) arms.push({ id: `M|${regime}|noBook|mode=${mode}`, mode, sl: { ...MON, 'regime.type': regime, ...NOBOOK } });
} else if (G === 's0modes') {
  for (const mode of ['nominal', 'v4', 'single', 'researcher', 'head'])
    for (const regime of ['fiat', 'bitcoin']) arms.push({ id: `S0tenure|${regime}|mode=${mode}`, mode, sl: { ...S0T, 'regime.type': regime } });
}
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const sum = (a, i = 0, j) => a.slice(i, j).reduce((s, x) => s + (x ?? 0), 0);
const out = {};
for (const arm of arms) {
  const per = {};
  for (const seed of SEEDS) {
    if (arm.mode) process.env.MORTGAGE_MODE = arm.mode; else delete process.env.MORTGAGE_MODE;
    try {
      const config = loadScenario({ name: arm.id, seed, ticks: T, sliders: { ...BASE, ...arm.sl } });
      const w = new World(config, null); const e = w.economy; const h = w.handlers();
      const tot = () => e.govDeposits + e.households.reduce((a, x) => a + x.deposit + (x.bitcoin || 0) * e.bitcoinPrice, 0) + e.firms.reduce((a, x) => a + x.deposit + (x.bitcoin || 0) * e.bitcoinPrice, 0) + (e.agents || []).reduce((a, x) => a + x.deposit, 0);
      let m0 = 0, D0 = 0, mort0 = 0, eq0 = 0, expInfl = 0;
      const wf = h.welfare;
      h.welfare = (ctx) => { wf(ctx); if (ctx.tick === 0) { m0 = tot(); D0 = totalDeposits(e); mort0 = e.households.reduce((a, x) => a + x.mortgage, 0); eq0 = e.banks.reduce((a, b) => a + b.equity, 0); } if (ctx.tick >= 24) expInfl += expectedInflation(e); };
      const S = runSimulation(config, h).metrics.series;
      const own = S.mortgageShare[239] + S.ownedShare[239];
      per[seed] = {
        cons: S.medianRealConsumption[239], u: mean(S.unemployment.slice(24)), infl: mean(S.inflation.slice(24)), cpiAnn: (S.priceLevel[239] / S.priceLevel[0]) ** (12 / 239) - 1,
        expInfl: expInfl / (T - 24), failures: e.cumulativeFailures, moneyTot: tot() / m0, moneyDep: totalDeposits(e) / D0,
        mortBookOverOpeningMoney: mort0 / m0, mortStockEnd: e.households.reduce((a, x) => a + x.mortgage, 0) / Math.max(1, mort0),
        bankEquityChangeOverOpeningMoney: (e.banks.reduce((a, b) => a + b.equity, 0) - eq0) / m0,
        orig: sum(S.mortgageOriginations), orig12: sum(S.mortgageOriginations, 12), prepay: sum(S.mortgageToOwned), foreclosures: sum(S.mortgageToRent),
        mortgageShare: S.mortgageShare[239], ownedShare: S.ownedShare[239], rentShare: S.rentShare[239], ownersWithMortgage: own > 0 ? S.mortgageShare[239] / own : null,
        credit: S.creditToGdp[239], gini: S.giniWealth[239], gdp: S.realGdp[239], loanRepaidOverOpeningMoney: sum(S.loanRepaid) / m0,
      };
    } catch (ex) { per[seed] = { err: String(ex.message).slice(0, 120) }; }
    finally { delete process.env.MORTGAGE_MODE; }
  }
  const ok = Object.entries(per).filter(([, r]) => !r.err);
  const lv = {}; for (const k of Object.keys(ok[0]?.[1] ?? {})) lv[k] = mean(ok.map(([, r]) => r[k]).filter((x) => x !== null && Number.isFinite(x)));
  out[arm.id] = { n: ok.length, crashSeeds: Object.entries(per).filter(([, r]) => r.err).map(([s]) => +s), mean: lv, perSeed: per };
  process.stderr.write(`${arm.id} n=${ok.length}\n`);
}
console.log(JSON.stringify(out));
