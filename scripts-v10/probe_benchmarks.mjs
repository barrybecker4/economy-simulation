// Model-vs-reality rows: fiscal balance, bank failures/yr, mortgage origination flow, owners with a mortgage.
import fs from 'node:fs';
const { loadScenario, runSimulation } = await import('../repo-v10/packages/core/dist/index.js');
const { World } = await import('../repo-v10/packages/core/dist/sim/world.js');
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const ARMS = {
  'S0|fiat': { 'regime.type': 'fiat' }, 'S0|bitcoin': { 'regime.type': 'bitcoin' },
  'S3|fiat': { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on', 'regime.type': 'fiat' },
  'S3|bitcoin': { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on', 'regime.type': 'bitcoin' },
  'M|fiat': { ...MON, 'regime.type': 'fiat' }, 'M|bitcoin': { ...MON, 'regime.type': 'bitcoin' }, 'M|hybrid': { ...MON, 'regime.type': 'hybrid' },
  'M|bitcoin|resOff': { ...MON, 'regime.type': 'bitcoin', 'bank.resolution': 'off' },
};
const sum = (a, i = 0, j) => a.slice(i, j).reduce((s, x) => s + (x ?? 0), 0);
const out = {};
for (const [id, sl] of Object.entries(ARMS)) {
  const rows = [];
  for (let seed = 1; seed <= 10; seed++) {
    try {
      const config = loadScenario({ name: id, seed, ticks: 240, sliders: { ...NOAI, ...sl } });
      const w = new World(config); const e = w.economy; const h = w.handlers();
      const gov = []; const wf = h.welfare; h.welfare = (ctx) => { wf(ctx); gov.push(e.govDeposits ?? 0); };
      const S = runSimulation(config, h).metrics.series;
      const nomGdp = S.realGdp.map((g, t) => g * S.priceLevel[t]);
      const ng = sum(nomGdp, 12);
      const tax = sum(S.taxRevenue, 12), gs = sum(S.govGoodsSpend, 12), ubi = sum(S.ubiOutlay, 12);
      const owners = S.mortgageShare[239] + S.ownedShare[239];
      rows.push({ seed,
        primaryBalancePctGdp: (tax - gs - ubi) / ng,
        govCashChangePctGdp: (gov[239] - gov[11]) / ng,
        taxPctGdp: tax / ng, govSpendPctGdp: (gs + ubi) / ng,
        bankFailuresPerYear: S.bankFailures[239] / 20, failuresPerBankYearPct: S.bankFailures[239] / 20 / 3 * 100,
        originationsPctHHyr: sum(S.mortgageOriginations, 12) / 500 / 19 * 100,
        originationsYr1: sum(S.mortgageOriginations, 0, 12),
        ownersWithMortgagePct: owners > 0 ? S.mortgageShare[239] / owners * 100 : null,
        homeownershipPct: owners * 100, rentSharePct: S.rentShare[239] * 100,
        creditToGdp: S.creditToGdp[239] });
    } catch (ex) { rows.push({ seed, error: String(ex.message).slice(0, 80) }); }
  }
  const ok = rows.filter((r) => !r.error);
  const keys = Object.keys(ok[0] ?? {}).filter((k) => k !== 'seed');
  const m = Object.fromEntries(keys.map((k) => { const v = ok.map((r) => r[k]).filter((x) => x != null); return [k, v.length ? v.reduce((a, b) => a + b, 0) / v.length : null]; }));
  out[id] = { n: ok.length, crashes: rows.filter((r) => r.error).map((r) => r.seed), ...m };
}
console.log(JSON.stringify(out, null, 1));
