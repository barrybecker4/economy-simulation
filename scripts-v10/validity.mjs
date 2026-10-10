// Model-validity sanity tests. Usage: node validity.mjs > ../data-v10/validity.json
import { loadScenario, runSimulation } from '../repo-v10/packages/core/dist/index.js';
import { World } from '../repo-v10/packages/core/dist/sim/world.js';
import { totalDeposits, totalLoans } from '../repo-v10/packages/core/dist/sim/banking.js';

const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
import fs from 'node:fs';
const MONETARY = JSON.parse(fs.readFileSync(new URL('../repo-v10/scenarios/presets/monetary.json', import.meta.url))).sliders;
// v7: pin S0-S3 to their v1-v6 meaning (registry defaults of these sliders changed). CS0=1 sets money.choiceSpeed 0.
const STRUCT = { S0: { 'prices.trendWeight': 1, 'production.demandWeight': 0, 'labor.firmLevelHiring': 'off' },
  S1: { 'prices.trendWeight': 0, 'production.demandWeight': 0, 'labor.firmLevelHiring': 'off' },
  S2: { 'prices.trendWeight': 1, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' },
  S3: { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' }, M: MONETARY };
if (process.env.CS0 === '1') NOAI['money.choiceSpeed'] = 0;
const ALLFIX = { 'centralBank.injectionChannel': 'newLoans', 'centralBank.spendNewMoney': 1,
  'household.durableShare': 0.3, 'credit.rateTransmission': 1, 'productivity.endogenousWeight': 1,
  'bank.resolution': 'merge', 'credit.householdMortgageShare': 0.25 };
const SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);

function run(sliders, seed, { ticks = 180, shock = null, onTick = null } = {}) {
  const config = loadScenario({ name: 'v', seed, ticks, sliders: { ...NOAI, ...sliders } });
  const w = new World(config, shock); const e = w.economy; const h = w.handlers();
  const trace = [];
  const cb = h.credit; h.credit = (ctx) => { cb(ctx); };
  const wf = h.welfare;
  h.welfare = (ctx) => {
    wf(ctx);
    const banks = e.banks;
    trace.push({ t: ctx.tick, P: e.priceLevel, W: e.wageLevel, D: totalDeposits(e), L: totalLoans(e),
      B: banks.reduce((s, b) => s + b.bonds, 0), R: banks.reduce((s, b) => s + b.reserves, 0),
      V: banks.reduce((s, b) => s + b.vault, 0), E: banks.reduce((s, b) => s + b.equity, 0), PE: e.privateEquity,
      gdp: e.realGdp, u: 1 - e.households.filter((x) => x.employer >= 0).length / e.households.length });
  };
  const pre = h.goodsAndAssets;
  h.goodsAndAssets = (ctx) => { if (onTick) onTick(e, ctx.tick); pre(ctx); };
  try { runSimulation(config, h); }
  catch (ex) { return { error: String(ex.message).slice(0, 200), ticksBeforeCrash: trace.length }; }
  return trace;
}
function isErr(tr) { return tr && tr.error; }
const mean = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
const sd = (a) => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const out = {}; out.crashes = [];
function safeRun(config, h, tag) { try { return runSimulation(config, h); } catch (ex) { out.crashes.push({ tag, msg: String(ex.message).slice(0,120) }); return null; } }

// T1 quantity theory: +50% helicopter drop to every household deposit at month 60
out.T1 = {};
for (const [s, sv] of Object.entries(STRUCT)) for (const regime of ['fiat', 'bitcoin']) {
  const r = { cpi24: [], cpi96: [], gdp24: [], gdp96: [], money96: [] };
  for (const seed of SEEDS) {
    const sl = { ...sv, 'regime.type': regime };
    const base = run(sl, seed);
    const drop = run(sl, seed, { onTick: (e, t) => { if (t === 60) { let added = 0; for (const hh of e.households) { const nd = e.params.unit === 'cent' ? Math.round(hh.deposit * 1.5) : hh.deposit * 1.5; added += nd - hh.deposit; hh.deposit = nd; } e.banks[0].reserves += added; } } });
    if (isErr(base) || isErr(drop) || !base[156] || !drop[156]) { r.errors = (r.errors||0)+1; continue; }
    r.cpi24.push(drop[84].P / base[84].P - 1); r.cpi96.push(drop[156].P / base[156].P - 1);
    r.gdp24.push(drop[84].gdp / base[84].gdp - 1); r.gdp96.push(drop[156].gdp / base[156].gdp - 1);
    r.money96.push(drop[156].D / base[156].D - 1);
  }
  out.T1[`${s}|${regime}`] = (() => { const o=Object.fromEntries(Object.entries(r).filter(([,v]) => Array.isArray(v)).map(([k, v]) => [k, { mean: mean(v), sd: sd(v), n: v.length }])); if (r.errors) o.errors=r.errors; return o; })();
}

// T2 excess demand: positive demand shock (+15% for 12 months, then -7.5%) at month 60; CPI, wage, unemployment response at month 71
out.T2 = {};
for (const [s, sv] of Object.entries(STRUCT)) for (const regime of ['fiat', 'bitcoin']) {
  const r = { cpi: [], wage: [], u: [], gdp: [] };
  for (const seed of SEEDS) {
    const sl = { ...sv, 'regime.type': regime };
    const base = run(sl, seed, { ticks: 100 });
    const sh = run(sl, seed, { ticks: 100, shock: { tick: 60, kind: 'demand', size: 0.15 } });
    if (isErr(base) || isErr(sh) || !base[71] || !sh[71]) continue;
    r.cpi.push(sh[71].P / base[71].P - 1); r.wage.push(sh[71].W / base[71].W - 1);
    r.u.push(sh[71].u - base[71].u); r.gdp.push(sh[71].gdp / base[71].gdp - 1);
  }
  out.T2[`${s}|${regime}`] = (() => { const o=Object.fromEntries(Object.entries(r).filter(([,v]) => Array.isArray(v)).map(([k, v]) => [k, { mean: mean(v), sd: sd(v), n: v.length }])); if (r.errors) o.errors=r.errors; return o; })();
}

// T3 Phillips curve: correlation of 12-month nominal wage growth with unemployment, S2 fiat with random shocks
out.T3 = {};
for (const s of ['S0', 'S2']) {
  const xs = [], ys = [];
  for (const seed of SEEDS) {
    const tr = run({ ...STRUCT[s], 'regime.type': 'fiat', 'shock.frequency': 0.5 }, seed, { ticks: 240 });
    if (isErr(tr) || !tr[239]) continue;
    for (let t = 24; t < 240; t += 6) { xs.push(tr[t].u); ys.push(tr[t].W / tr[t - 12].W - 1); }
  }
  const mx = mean(xs), my = mean(ys);
  const cov = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0);
  const corr = cov / Math.sqrt(xs.reduce((a, x) => a + (x - mx) ** 2, 0) * ys.reduce((a, y) => a + (y - my) ** 2, 0));
  out.T3[s] = { corrWageGrowthVsUnemployment: corr, n: xs.length };
}

// T4 independent money accounting: recompute the bank identity myself around EVERY phase,
// and check that cash home purchases move money household -> firms with nothing destroyed.
function bal(e) {
  const b = e.banks;
  return { D: totalDeposits(e), L: totalLoans(e), R: b.reduce((s, x) => s + x.reserves, 0), B: b.reduce((s, x) => s + x.bonds, 0),
           V: b.reduce((s, x) => s + x.vault, 0), E: b.reduce((s, x) => s + x.equity, 0) };
}
const resid = (x) => x.L + x.R + x.B + x.V - x.D - x.E;
out.T4 = {};
for (const [lbl, sl] of [['S0 fiat', { ...STRUCT.S0, 'regime.type': 'fiat' }], ['S0 bitcoin', { ...STRUCT.S0, 'regime.type': 'bitcoin' }],
                         ['S0 fiat+tenure', { ...STRUCT.S0, 'regime.type': 'fiat', 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on' }],
                         ['S0 bitcoin+tenure', { ...STRUCT.S0, 'regime.type': 'bitcoin', 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on' }],
                         ['M fiat', { ...MONETARY, 'regime.type': 'fiat' }], ['M bitcoin', { ...MONETARY, 'regime.type': 'bitcoin' }],
                         ['M bitcoin transition', { ...MONETARY, 'regime.type': 'fiat', 'transition.lengthMonths': 12, 'transition.holderConcentration': 0.5 }],
                         ['M bitcoin gradual transition', { ...MONETARY, 'regime.type': 'fiat', 'transition.lengthMonths': 12, 'transition.holderConcentration': 0.5, 'transition.gradualWeight': 1, 'transition.debtHaircut': 0.3 }],
                         ['S3 fiat allFixes', { ...STRUCT.S3, ...ALLFIX, 'regime.type': 'fiat' }], ['M fiat allFixes', { ...MONETARY, ...ALLFIX, 'regime.type': 'fiat' }],
                         ['M bitcoin allFixes', { ...MONETARY, ...ALLFIX, 'regime.type': 'bitcoin' }],
                         ['S3 fiat governmentSpending', { ...STRUCT.S3, 'centralBank.injectionChannel': 'governmentSpending', 'regime.type': 'fiat' }],
                         ['S3 fiat assetPurchase', { ...STRUCT.S3, 'centralBank.injectionChannel': 'assetPurchase', 'regime.type': 'fiat' }]]) {
  let config, w, e, h;
  try { config = loadScenario({ name: 'v', seed: 1, ticks: 240, sliders: { ...NOAI, ...sl } }); w = new World(config); e = w.economy; h = w.handlers(); }
  catch (ex) { out.T4[lbl] = { error: String(ex.message).slice(0,200) }; continue; }
  const maxPhase = {}; let cashBuys = 0, cashPaid = 0, cashMismatch = 0, maxAbsResidual = 0, firmGainInCashPhases = 0, buyersPaidLessThanHalfPrice = 0;
  for (const phase of Object.keys(h)) {
    const f = h[phase];
    h[phase] = (ctx) => {
      if (!e.ready) { f(ctx); return; }
      const before = bal(e);
      let hhBefore = null, firmBefore = 0;
      if (phase === 'contractChoice') { hhBefore = e.households.map((x) => ({ d: x.deposit, t: x.tenure, m: x.mortgage })); firmBefore = e.firms.reduce((s2, x) => s2 + x.deposit, 0); }
      f(ctx);
      const after = bal(e);
      const dr = Math.abs(resid(after) - resid(before));
      maxPhase[phase] = Math.max(maxPhase[phase] ?? 0, dr);
      maxAbsResidual = Math.max(maxAbsResidual, Math.abs(resid(after)));
      if (phase === 'contractChoice') {
        // households that became outright owners this phase without a mortgage
        let paid = 0, n = 0;
        e.households.forEach((x, i) => { const b0 = hhBefore[i]; if (b0.t !== 'owned' && x.tenure === 'owned' && b0.m === 0 && x.mortgage === 0) { n++; paid += b0.d - x.deposit; } });
        if (n > 0) {
          const firmGain = e.firms.reduce((s2, x) => s2 + x.deposit, 0) - firmBefore;
          cashBuys += n; cashPaid += paid; firmGainInCashPhases += firmGain;
          // money destroyed in the phase beyond loan repayment: dD - dL (cash purchases should be pure transfers)
          cashMismatch += (after.D - before.D) - (after.L - before.L) + (after.E - before.E) - (after.R - before.R);
        }
      }
    };
  }
  const res = safeRun(config, h, 'T4 ' + lbl);
  if (!res) { out.T4[lbl] = { error: 'crash' }; continue; }
  const D0 = res.metrics.series.moneySupply[0], D1 = res.metrics.series.moneySupply[239];
  out.T4[lbl] = { maxPhaseResidualChange: maxPhase, maxAbsResidual, cashBuys, cashPaid, firmGainInCashPhases, cashPhaseUnexplainedMoneyChange: cashMismatch,
                  moneySupply_t0: D0, moneySupply_t239: D1, annualMoneyGrowth: Math.pow(D1 / D0, 12 / 239) - 1 };
}

// T6 fiat broad money growth and price response under each structure (no shocks)
out.T6 = {};
for (const [s, sv] of Object.entries(STRUCT)) for (const [regime, extra] of [['fiat', {}], ['bitcoin', {}], ['fiat mg0.05', { 'centralBank.moneyGrowth': 0.05 }]]) {
  const g = [], p = [];
  for (const seed of SEEDS.slice(0, 5)) {
    const config = loadScenario({ name: 'v', seed, ticks: 240, sliders: { ...NOAI, ...sv, 'regime.type': regime.split(' ')[0], ...extra } });
    const r = safeRun(config, new World(config).handlers(), `T6 ${s}|${regime}|${seed}`);
    if (!r) continue;
    const M = r.metrics.series.moneySupply, P = r.metrics.series.priceLevel;
    g.push(Math.pow(M[239] / M[0], 12 / 239) - 1); p.push(Math.pow(P[239] / P[0], 12 / 239) - 1);
  }
  out.T6[`${s}|${regime}`] = { annualMoneyGrowth: mean(g), annualInflation: mean(p) };
}

// T7 deposit interest: posted vs actually paid, pass-through 1
out.T7 = {};
for (const [lbl, sl] of [['S0 fiat pass1', { ...STRUCT.S0, 'regime.type': 'fiat', 'bank.depositPassThrough': 1 }], ['S0 bitcoin pass1', { ...STRUCT.S0, 'regime.type': 'bitcoin', 'bank.depositPassThrough': 1 }],
                         ['S0 fiat pass1 leverage1', { ...STRUCT.S0, 'regime.type': 'fiat', 'bank.depositPassThrough': 1, 'credit.endogenousWeight': 1, 'credit.leverageStart': 1 }],
                         ['M fiat', { ...MONETARY, 'regime.type': 'fiat' }], ['M bitcoin', { ...MONETARY, 'regime.type': 'bitcoin' }],
                         ['S0 fiat pass1 subsidy1', { ...STRUCT.S0, 'regime.type': 'fiat', 'bank.depositPassThrough': 1, 'bank.depositInterestSubsidy': 1 }],
                         ['M fiat subsidy1', { ...MONETARY, 'regime.type': 'fiat', 'bank.depositInterestSubsidy': 1 }],
                         ['M fiat allFixes', { ...MONETARY, ...ALLFIX, 'regime.type': 'fiat' }]]) {
  const config = loadScenario({ name: 'v', seed: 1, ticks: 240, sliders: { ...NOAI, ...sl } });
  const w = new World(config); const e = w.economy; const h = w.handlers();
  let posted = 0, paid = 0, n = 0, totalPaid = 0;
  const wf = h.welfare; h.welfare = (ctx) => { wf(ctx); posted += e.depositRate; paid += e.paidDepositRate ?? 0; totalPaid += e.depositInterestPaid ?? 0; n++; };
  let r;
  try { r = runSimulation(config, h); } catch (err) { out.T7[lbl] = { error: String(err.message), ticksBeforeCrash: n }; continue; }
  out.T7[lbl] = { avgPostedDepositRate: posted / n, avgPaidDepositRate: paid / n, totalInterestPaid: totalPaid, creditToGdpEnd: r.metrics.series.creditToGdp[239] };
}

// T6b: does fiat hit its target once new money is spent / injected elsewhere? (5 seeds)
out.T6b = {};
const T6B = [];
for (const s of ['S1', 'S3', 'M']) {
  T6B.push([`${s}|fiat spendNewMoney1`, { ...STRUCT[s], 'centralBank.spendNewMoney': 1 }]);
  for (const ch of ['governmentSpending', 'newLoans', 'assetPurchase']) T6B.push([`${s}|fiat ${ch}`, { ...STRUCT[s], 'centralBank.injectionChannel': ch }]);
  T6B.push([`${s}|fiat allFixes`, { ...STRUCT[s], ...ALLFIX }]);
  T6B.push([`${s}|bitcoin allFixes`, { ...STRUCT[s], ...ALLFIX, 'regime.type': 'bitcoin' }]);
}
for (const [lbl, sv] of T6B) {
  const g = [], p = [], v = [];
  for (const seed of SEEDS.slice(0, 5)) {
    const config = loadScenario({ name: 'v', seed, ticks: 240, sliders: { ...NOAI, 'regime.type': 'fiat', ...sv } });
    const r = safeRun(config, new World(config).handlers(), `T6b ${lbl}|${seed}`);
    if (!r) continue;
    const M = r.metrics.series.moneySupply, P = r.metrics.series.priceLevel;
    g.push(Math.pow(M[239] / M[0], 12 / 239) - 1); p.push(Math.pow(P[239] / P[0], 12 / 239) - 1); v.push(r.metrics.series.velocity[239]);
  }
  out.T6b[lbl] = { annualMoneyGrowth: mean(g), annualInflation: mean(p), velocityEnd: mean(v) };
}

// T8 Cantillon: who first holds fiat money created in the central-bank phase (S3 fiat, seed 1, 240 ticks)
out.T8 = {};
for (const ch of ['proRataDeposits', 'governmentSpending', 'newLoans', 'assetPurchase']) {
  const config = loadScenario({ name: 'v', seed: 1, ticks: 240, sliders: { ...NOAI, ...STRUCT.S3, 'regime.type': 'fiat', 'centralBank.injectionChannel': ch } });
  const w = new World(config); const e = w.economy; const h = w.handlers();
  const acc = { households: 0, firms: 0, government: 0, hhQ1: 0, hhQ5: 0, ticksExpanding: 0 };
  const order = e.households.map((x, i) => i).sort((a, b) => e.households[a].skill - e.households[b].skill);
  const q = new Array(e.households.length).fill(0); order.forEach((idx, rank) => { q[idx] = Math.min(4, Math.floor(5 * rank / order.length)); });
  const cbf = h.centralBank;
  h.centralBank = (ctx) => {
    const hh0 = e.households.map((x) => x.deposit), f0 = e.firms.reduce((s2, x) => s2 + x.deposit, 0), g0 = e.govDeposits ?? 0;
    cbf(ctx);
    const dh = e.households.map((x, i) => x.deposit - (hh0[i] ?? 0));
    const dH = dh.reduce((s2, x) => s2 + x, 0), dF = e.firms.reduce((s2, x) => s2 + x.deposit, 0) - f0, dG = (e.govDeposits ?? 0) - g0;
    if (dH + dF + dG > 0) {
      acc.ticksExpanding++; acc.households += dH; acc.firms += dF; acc.government += dG;
      dh.forEach((x, i) => { if (q[i] === 0) acc.hhQ1 += x; if (q[i] === 4) acc.hhQ5 += x; });
    }
  };
  if (!safeRun(config, h, 'T8 ' + ch)) { out.T8[ch] = { error: 'crash' }; continue; }
  const tot = acc.households + acc.firms + acc.government;
  out.T8[ch] = { shareHouseholds: acc.households / tot, shareFirms: acc.firms / tot, shareGovernment: acc.government / tot,
                 shareQ1households: acc.hhQ1 / tot, shareQ5households: acc.hhQ5 / tot, ticksExpanding: acc.ticksExpanding };
}

// T10 bank resolution and tenure flows (5 seeds, 240 ticks)
out.T10 = {};
const HOUSE = { ...STRUCT.S0, 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on' };
for (const [lbl, sl] of [['S0+tenure fiat', { ...HOUSE, 'regime.type': 'fiat' }], ['S0+tenure bitcoin', { ...HOUSE, 'regime.type': 'bitcoin' }],
                         ['S0+tenure fiat housingFix', { ...HOUSE, 'credit.householdMortgageShare': 0.25, 'housing.mortgageLtv': 0.95, 'bank.resolution': 'merge', 'regime.type': 'fiat' }],
                         ['S0+tenure bitcoin housingFix', { ...HOUSE, 'credit.householdMortgageShare': 0.25, 'housing.mortgageLtv': 0.95, 'bank.resolution': 'merge', 'regime.type': 'bitcoin' }],
                         ['M fiat', { ...MONETARY, 'regime.type': 'fiat' }], ['M bitcoin', { ...MONETARY, 'regime.type': 'bitcoin' }],
                         ['M fiat resolution off', { ...MONETARY, 'bank.resolution': 'off', 'regime.type': 'fiat' }],
                         ['M bitcoin resolution off', { ...MONETARY, 'bank.resolution': 'off', 'regime.type': 'bitcoin' }],
                         ['M bitcoin mortgageShare0', { ...MONETARY, 'credit.householdMortgageShare': 0, 'regime.type': 'bitcoin' }]]) {
  const agg = {}; let minEq = Infinity, negAggTicks = 0, operatingInsolventTicks = 0, n = 0, failures = 0, eqEnd = 0, rentersQ1end = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const config = loadScenario({ name: 'v', seed, ticks: 240, sliders: { ...NOAI, ...sl } });
    const w = new World(config); const e = w.economy; const h = w.handlers();
    let prev = e.households.map((x) => x.tenure);
    const wf = h.welfare;
    h.welfare = (ctx) => { wf(ctx);
      e.households.forEach((x, i) => { if (prev[i] !== x.tenure) { const k = `${prev[i]}->${x.tenure}`; agg[k] = (agg[k] ?? 0) + 1; } });
      prev = e.households.map((x) => x.tenure);
      const eq = e.banks.reduce((s2, b) => s2 + b.equity, 0) / e.priceLevel;
      minEq = Math.min(minEq, eq); if (eq < 0) negAggTicks++;
      if (e.banks.some((b) => !b.failed && b.equity < 0)) operatingInsolventTicks++;
      n++; if (ctx.tick === 239) { eqEnd += eq / 5; failures += e.cumulativeFailures / 5; }
    };
    const r = safeRun(config, h, `T10 ${lbl}|${seed}`);
    if (!r) { agg.crashedSeeds = (agg.crashedSeeds ?? 0) + 5; continue; }
    const S = r.metrics.series;
    agg.originationsMetric = (agg.originationsMetric ?? 0) + S.mortgageOriginations.reduce((a, b) => a + (b ?? 0), 0);
    agg.rentToMortgageMetric = (agg.rentToMortgageMetric ?? 0) + S.rentToMortgage.reduce((a, b) => a + (b ?? 0), 0);
    agg.creditToGdpEnd = (agg.creditToGdpEnd ?? 0) + S.creditToGdp[239];
    agg.rentShareEnd = (agg.rentShareEnd ?? 0) + S.rentShare[239];
    agg.mortgageShareEnd = (agg.mortgageShareEnd ?? 0) + S.mortgageShare[239];
  }
  for (const k in agg) agg[k] /= 5;
  out.T10[lbl] = { perRun: agg, minRealAggBankEquity: minEq, shareTicksNegativeAggEquity: negAggTicks / n,
                   shareTicksAnOperatingBankInsolvent: operatingInsolventTicks / n, cumulativeFailuresPerRun: failures, realAggBankEquityEnd: eqEnd };
}

// T11 gradual transition: top-decile wealth share and Gini month by month, one-step vs gradual (S0, len 12, hc 0.5, seed 1-5)
out.T11 = {};
for (const [lbl, extra] of [['one-step', {}], ['gradual1', { 'transition.gradualWeight': 1 }]]) {
  const months = [0, 3, 6, 9, 10, 11, 12, 24];
  const acc = Object.fromEntries(months.map((m) => [m, { gini: 0, top10: 0, u: 0 }]));
  for (const seed of [1, 2, 3, 4, 5]) {
    const config = loadScenario({ name: 'v', seed, ticks: 36, sliders: { ...NOAI, 'regime.type': 'fiat', 'transition.lengthMonths': 12, 'transition.holderConcentration': 0.5, ...extra } });
    const rr = safeRun(config, new World(config).handlers(), `T11 ${lbl}|${seed}`); if (!rr) continue; const S = rr.metrics.series;
    for (const m of months) { acc[m].gini += S.giniWealth[m] / 5; acc[m].top10 += S.topDecileWealthShare[m] / 5; acc[m].u += S.unemployment[m] / 5; }
  }
  out.T11[lbl] = acc;
}

// T5 steady-state stability without shocks: std of unemployment months 120-179 within a run, averaged over seeds
out.T5 = {};
for (const [s, sv] of Object.entries(STRUCT)) for (const regime of ['fiat', 'bitcoin']) {
  const sds = [], lv = [];
  for (const seed of SEEDS) { const tr = run({ ...sv, 'regime.type': regime }, seed); if (isErr(tr) || !tr[179]) continue; const u = tr.slice(120, 180).map((x) => x.u); sds.push(sd(u)); lv.push(mean(u)); }
  out.T5[`${s}|${regime}`] = { meanU: mean(lv), withinRunSdU: mean(sds) };
}
console.log(JSON.stringify(out, null, 1));
