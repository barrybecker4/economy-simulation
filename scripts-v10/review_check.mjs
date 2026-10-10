// Round 7: verify the v6 §10.1 fixes and the two mechanisms under v7 HEAD (d8ac6ca). LEGACY=1 pins every
// default that changed since 1ca86eb back to its v6 value (core FEATURE_OFF), isolating the bug-fix commits.
// Usage: node review_check.mjs <group> > out.json
import fs from 'node:fs';
const LIB = process.env.LIB === 'patched' ? '../patched-v10/core/dist' : '../repo-v10/packages/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const { totalDeposits } = await import(`${LIB}/sim/banking.js`);
const { agreedWage } = await import(`${LIB}/sim/labor.js`);
const { outputGap } = await import(`${LIB}/sim/helpers.js`);
const { FEATURE_OFF } = await import(`${LIB}/sim/feature-off.js`);
const LEG = process.env.LEGACY === '1' ? { ...FEATURE_OFF } : {};
// CS0=1: money.choiceSpeed 0, so regime.type selects the monetary rule (v1-v6 like-for-like; strategizer-review-v7 R1).
if (process.env.CS0 === '1') LEG['money.choiceSpeed'] = 0;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const MONETARY = JSON.parse(fs.readFileSync(new URL('../repo-v10/scenarios/presets/monetary.json', import.meta.url))).sliders;
// S0-S3 keep their v1-v6 meaning (v7 changed the registry defaults of these three sliders); D = pure v7 default.
const STRUCT = { S0: { 'prices.trendWeight': 1, 'production.demandWeight': 0, 'labor.firmLevelHiring': 'off' },
  S1: { 'prices.trendWeight': 0, 'production.demandWeight': 0, 'labor.firmLevelHiring': 'off' },
  S2: { 'prices.trendWeight': 1, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' },
  S3: { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' }, M: MONETARY, D: {} };
const SEEDS = Array.from({ length: Number(process.env.NSEEDS ?? 20) }, (_, i) => i + 1);
const T = 240;

function run({ s, regime, extra = {}, shock = null, rebateOff = false }, seed) {
  const sliders = { ...LEG, ...NOAI, ...STRUCT[s], 'regime.type': regime, ...extra };
  if (rebateOff) sliders['government.treasuryBufferMonths'] = 24; // effectively no rebate (huge buffer)
  const config = loadScenario({ name: 'r', seed, ticks: T, sliders });
  const w = new World(config, shock); const e = w.economy; const h = w.handlers();
  const tr = []; const wind = [];
  const cc = h.contractChoice;
  h.contractChoice = (ctx) => {
    const before = e.households.map((x) => [x.deposit, x.tenure, x.smoothed]);
    cc(ctx);
    e.households.forEach((x, i) => {
      if (x.tenure === 'mortgage' && before[i][1] !== 'mortgage')
        wind.push({ t: ctx.tick, dDepMonths: (x.deposit - before[i][0]) / Math.max(1, before[i][2]), prior: before[i][1] });
    });
  };
  const wf = h.welfare;
  h.welfare = (ctx) => {
    wf(ctx);
    const D = totalDeposits(e);
    tr.push({ D, G: e.govDeposits, H: e.households.reduce((a, x) => a + x.deposit, 0),
      failed: e.banks.filter((b) => b.failed).length, cumFail: e.cumulativeFailures,
      eq: e.banks.reduce((a, b) => a + b.equity, 0), rate: e.policyRate, P: e.priceLevel, W: e.wageLevel,
      A: agreedWage({ priceLevel: e.priceLevel, markup: e.params.markup, productivity: e.productivity, impulse: 0, tightness: outputGap(e) }),
      fs: e.moneyShares ? e.moneyShares.fiat : null,
      fl: e.depositFlowHistory ? e.depositFlowHistory[e.depositFlowHistory.length - 1] : null });
  };
  const res = runSimulation(config, h);
  return { tr, wind, S: res.metrics.series, cp: (e.contractionPressure || []).slice(), stim: e.params.stimulus };
}
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
const avg = (arr, a, b) => mean(arr.slice(a, b));
function summarize(c) {
  const rs = []; let err = 0, errMsg = null; const failSeeds = [];
  for (const seed of SEEDS) {
    try { const r = run(c, seed); r.seed = seed; rs.push(r); } catch (ex) { err++; failSeeds.push(seed); errMsg = String(ex.message).slice(0, 200); }
  }
  const f = (fn) => mean(rs.map(fn));
  const firstFail = (r) => { const i = r.tr.findIndex((x) => x.cumFail > 0); return i < 0 ? null : i; };
  return {
    n: rs.length, errors: err, errMsg,
    treasuryShare_m48: f((r) => r.tr[48].G / Math.max(1, r.tr[48].D)),
    treasuryShare_m239: f((r) => r.tr[239].G / Math.max(1, r.tr[239].D)),
    totalMoney_m48: f((r) => r.tr[48].D / r.tr[0].D), totalMoney_m239: f((r) => r.tr[239].D / r.tr[0].D),
    privateMoney_m239: f((r) => (r.tr[239].D - r.tr[239].G) / Math.max(1e-9, r.tr[0].D - r.tr[0].G)),
    taxOverGovSpend_cum: f((r) => r.S.taxRevenue.reduce((a, x) => a + x, 0) / Math.max(1, r.S.govGoodsSpend.reduce((a, x) => a + x, 0))),
    inflation_y2_20: f((r) => avg(r.S.inflation, 24, 240)), unemployment_y2_20: f((r) => avg(r.S.unemployment, 24, 240)),
    medianRealCons_end: f((r) => r.S.medianRealConsumption[239]), gini_end: f((r) => r.S.giniWealth[239]),
    velocity_end: f((r) => r.S.velocity[239]), creditToGdp_end: f((r) => r.S.creditToGdp[239]),
    rentShare_end: f((r) => r.S.rentShare[239]),
    firstFailureTick: rs.map(firstFail), cumulativeFailures: f((r) => r.tr[239].cumFail),
    bankFailuresMetricEnd: f((r) => r.S.bankFailures[239]),
    ticksWithAFailedBank: f((r) => r.tr.filter((x) => x.failed > 0).length),
    originations_total: f((r) => r.S.mortgageOriginations.reduce((a, x) => a + (x || 0), 0)),
    originations_tick1: f((r) => (r.S.mortgageOriginations[0] || 0) + (r.S.mortgageOriginations[1] || 0)),
    originations_after12: f((r) => r.S.mortgageOriginations.slice(12).reduce((a, x) => a + (x || 0), 0)),
    rentToMortgage_total: f((r) => r.S.rentToMortgage.reduce((a, x) => a + (x || 0), 0)),
    foreclosures_total: f((r) => r.S.mortgageToRent.reduce((a, x) => a + (x || 0), 0)),
    windfall_depositChangeMonthsIncome: mean(rs.flatMap((r) => r.wind.map((x) => x.dDepMonths))),
    windfall_n: mean(rs.map((r) => r.wind.length)),
    originationTicks: [...new Set(rs.flatMap((r) => r.wind.map((x) => x.t)))].sort((a, b) => a - b).slice(0, 30),
    policyRate_t0_7: rs[0] ? rs[0].tr.slice(0, 8).map((x) => +x.rate.toFixed(4)) : null,
    _cons: rs.map((r) => r.S.medianRealConsumption[239]), _u: rs.map((r) => avg(r.S.unemployment, 24, 240)),
    _gdpPost: rs.map((r) => r.S.realGdp.slice(60, 144).reduce((a, x) => a + x, 0)),
    _uShock: rs.map((r) => avg(r.S.unemployment, 60, 84)),
    prepayOrPayoff_total: f((r) => r.S.mortgageToOwned.reduce((a, x) => a + (x || 0), 0)),
    mortgageShare_end: f((r) => r.S.mortgageShare[239]), ownedShare_end: f((r) => r.S.ownedShare[239]),
    ownersWithMortgage_end: f((r) => r.S.mortgageShare[239] / Math.max(1e-9, r.S.mortgageShare[239] + r.S.ownedShare[239])),
    mortgageShare_m24: f((r) => r.S.mortgageShare[24]), rentShare_m24: f((r) => r.S.rentShare[24]),
    housingPriceRel_end: f((r) => r.S.priceHousing[239] / Math.max(1e-9, r.S.priceLevel[239])),
    defaults_total: f((r) => r.S.defaults.reduce((a, x) => a + (x || 0), 0)),
    moneySupply_end_rel: f((r) => r.S.moneySupply[239] / r.S.moneySupply[0]),
    wageGrowthYr: f((r) => (r.tr[239].W / r.tr[0].W) ** (12 / 239) - 1),
    wageCutMonthShare: f((r) => r.tr.slice(1).filter((x, i) => x.W < r.tr[i].W).length / 239),
    wageGrowthYr_y2_20: f((r) => (r.tr[239].W / r.tr[24].W) ** (12 / 215) - 1),
    realWage_end: f((r) => r.S.realWage[239]),
    moneyGrowthYr_m48_60: f((r) => (r.tr[60].D / r.tr[48].D) ** (12 / 12) - 1),
    moneyGrowthYr_m60_84: f((r) => (r.tr[84].D / r.tr[60].D) ** (12 / 24) - 1),
    moneyGrowthYr_m84_108: f((r) => (r.tr[108].D / r.tr[84].D) ** (12 / 24) - 1),
    inflation_m60_84: f((r) => avg(r.S.inflation, 60, 84)), inflation_m72_96: f((r) => avg(r.S.inflation, 72, 96)),
    unemployment_m60_84: f((r) => avg(r.S.unemployment, 60, 84)), unemployment_m84_108: f((r) => avg(r.S.unemployment, 84, 108)),
    gdp_m60_144: f((r) => r.S.realGdp.slice(60, 144).reduce((a, x) => a + x, 0)),
    postedOverAgreed_y2_20: f((r) => mean(r.tr.slice(24).map((x) => x.W / x.A - 1))),
    money_m96_over_m60: f((r) => r.tr[96].D / r.tr[60].D), cpi_m96_over_m60: f((r) => r.tr[96].P / r.tr[60].P),
    unemployment_m60_96: f((r) => avg(r.S.unemployment, 60, 96)), inflation_m60_96: f((r) => avg(r.S.inflation, 60, 96)),
    equity_end_rel: f((r) => r.tr[239].eq / Math.max(1e-9, r.tr[0].D)),
    _cpiYr: rs.map((r) => avg(r.S.inflation, 24, 240)), _money: rs.map((r) => r.tr[239].D / r.tr[0].D), _fail: rs.map((r) => r.tr[239].cumFail),
    moneyGrowthYr_all: f((r) => (r.tr[239].D / r.tr[0].D) ** (12 / 239) - 1),
    _seedsOk: rs.map((r) => r.seed), _failSeeds: failSeeds,
    policyRateMax: f((r) => Math.max(...r.tr.map((x) => x.rate))), policyRateMean: f((r) => mean(r.tr.map((x) => x.rate))),
    maxUJump: f((r) => Math.max(...r.S.unemployment.slice(1).map((u, i) => u - r.S.unemployment[i]))),
    maxUJumpAll: rs.length ? Math.max(...rs.map((r) => Math.max(...r.S.unemployment.slice(1).map((u, i) => u - r.S.unemployment[i])))) : null,
    flows_m60_96: (() => { const ks = ['fiatInjection', 'netCredit', 'interestRetained', 'writeDowns', 'reserveAccommodation'];
      const o = {}; for (const k of ks) o[k] = f((r) => r.tr.slice(61, 97).reduce((a, x) => a + (x.fl ? x.fl[k] : 0), 0) / r.tr[60].D); return o; })(),
    flows_all: (() => { const ks = ['fiatInjection', 'netCredit', 'interestRetained', 'writeDowns', 'reserveAccommodation'];
      const o = {}; for (const k of ks) o[k] = f((r) => r.tr.reduce((a, x) => a + (x.fl ? x.fl[k] : 0), 0) / r.tr[0].D); return o; })(),
    fiatShare_m120: f((r) => r.tr[120].fs), fiatShare_end: f((r) => r.tr[239].fs),
    // Signed stimulus pressure (unemployment gap outside the 2 pp deadband) queued each month; the injection is stimulus x lagged pressure (fiat, choiceSpeed 0 only).
    stimPosMonths: f((r) => r.cp.filter((x) => x > 0).length), stimNegMonths: f((r) => r.cp.filter((x) => x < 0).length),
    stimMaxAnnual: f((r) => r.cp.length ? r.stim * Math.max(...r.cp) : 0), stimMinAnnual: f((r) => r.cp.length ? r.stim * Math.min(...r.cp) : 0),
    stimPosMonths_m60_96: f((r) => r.cp.slice(60, 96).filter((x) => x > 0).length), stimNegMonths_m60_96: f((r) => r.cp.slice(60, 96).filter((x) => x < 0).length),
    _u60_96: rs.map((r) => avg(r.S.unemployment, 60, 96)), _money9660: rs.map((r) => r.tr[96].D / r.tr[60].D),
  };
}
const RG = ['fiat', 'bitcoin'];
const SHK = { demand: { tick: 60, kind: 'demand', size: -0.15 }, credit: { tick: 60, kind: 'credit', size: 0.15 }, supply: { tick: 60, kind: 'productivity', size: -0.1 } };
const BOOM = { tick: 60, kind: 'demand', size: 0.15 };
const STIMS = [['stim0', { 'centralBank.stimulus': 0 }], ['stimdef1.75', {}], ['stim3', { 'centralBank.stimulus': 3 }]];
const GROUPS = {
  // Stimulus sign/zero test with direct pressure counts: S0, S2, M fiat x calm/demand slump/demand boom x stimulus 0/1.75/3.
  stimsign: () => ['S0', 'S2', 'M'].flatMap((s) => ['none', 'demand', 'boom'].flatMap((k) => STIMS.map(([lab, ex]) => ({
    id: `${s}|fiat|${lab}|${k}`, s, regime: 'fiat', extra: ex, shock: k === 'none' ? null : k === 'boom' ? BOOM : SHK[k] })))),
  // R1: does choiceSpeed > 0 bypass the regime rule? M and S0 x regime x choiceSpeed.
  cs: () => ['M', 'S0'].flatMap((s) => ['fiat', 'bitcoin', 'hybrid'].flatMap((regime) => [0, 0.01].map((cs) => ({ id: `${s}|${regime}|cs${cs}`, s, regime, extra: { 'money.choiceSpeed': cs } })))),
  // R3: assetPurchase runaway, by structure (run with LIB=patched to test the 1x reserve patch).
  qe: () => [['S0', {}], ['M', {}], ['S3', { 'household.realReturnSensitivity': 3 }]].flatMap(([s, b]) => ['proRataDeposits', 'assetPurchase'].map((ch) =>
    ({ id: `${s}|fiat|ch=${ch}`, s, regime: 'fiat', extra: { ...b, 'centralBank.injectionChannel': ch } }))),
  // v7: stimulus now reads the observed unemployment gap (both signs, 2 pp deadband) and can be 0.
  stim7: () => ['S0', 'S3', 'M'].flatMap((s) => ['none', 'demand', 'credit', 'boom', 'supply'].flatMap((k) =>
    [...STIMS.map(([lab, ex]) => [`fiat|${lab}`, ex]), ['bitcoin', {}]].map(([lab, ex]) => ({
      id: `${s}|${lab}|${k}`, s, regime: lab.startsWith('bitcoin') ? 'bitcoin' : 'fiat', extra: ex, shock: k === 'none' ? null : k === 'boom' ? BOOM : SHK[k] })))),
  // endogenous slumps (no shocks): near-frozen fiat under M, S3 + hoarding 3
  endo: () => [['M', {}], ['M', { 'centralBank.moneyGrowth': 0.05 }], ['S3', { 'household.realReturnSensitivity': 3 }], ['M', { 'housing.openingMortgageShareOfOwners': 0 }]].flatMap(([s, base]) =>
    [...STIMS, ['lag12', { 'centralBank.stimulusLag': 12 }]].map(([lab, ex]) => ({ id: `${s}|fiat|${Object.entries(base).map(([k, v]) => k.split('.')[1] + v).join(',') || 'base'}|${lab}`, s, regime: 'fiat', extra: { ...base, ...ex } }))
      .concat([{ id: `${s}|bitcoin|${Object.entries(base).map(([k, v]) => k.split('.')[1] + v).join(',') || 'base'}`, s, regime: 'bitcoin', extra: base }])),
  zombie: () => ['M', 'S3'].flatMap((s) => [0, 0.5, 1].map((z) => ({ id: `${s}|fiat|zombie${z}|credit0.3`, s, regime: 'fiat', extra: { 'centralBank.zombieSupport': z }, shock: { tick: 60, kind: 'credit', size: 0.3 } }))
    .concat([{ id: `${s}|bitcoin|credit0.3`, s, regime: 'bitcoin', shock: { tick: 60, kind: 'credit', size: 0.3 } }])),
  hoard: () => ['S1', 'S2', 'S3', 'D'].flatMap((s) => RG.flatMap((regime) => [0, 0.8, 3].map((h) => ({ id: `${s}|${regime}|hoard${h}`, s, regime, extra: { 'household.realReturnSensitivity': h, 'shock.frequency': 0.1 } })))),
  m7: () => [0.62, 0].flatMap((bk) => [0, 0.25, 0.5].flatMap((pm) => [...RG, 'hybrid'].map((regime) => ({ id: `M|${regime}|book${bk}|premium${pm}`, s: 'M', regime,
    extra: { 'housing.openingMortgageShareOfOwners': bk, 'housing.monetaryPremium': pm, 'shock.frequency': 0.1 } })))),
  e4spike: () => ['M', 'S2'].flatMap((s) => ['fiat', 'bitcoin'].flatMap((regime) => ['none', 'demand', 'credit'].map((k) => ({ id: `${s}|${regime}|${k}`, s, regime, shock: k === 'none' ? null : SHK[k] })))),
  ratecap: () => ['proRataDeposits', 'governmentSpending', 'newLoans', 'assetPurchase'].flatMap((ch) => [0, 3].map((h) =>
    ({ id: `S3|fiat|ch=${ch}|hoard${h}`, s: 'S3', regime: 'fiat', extra: { 'centralBank.injectionChannel': ch, 'household.realReturnSensitivity': h } }))),

  // Steering checks (strategizer-review-v6): elasticity-0 benchmark, slump paths, real mortgage, gaps by book x premium.
  wageElast: () => ['M', 'S0'].flatMap((s) => RG.flatMap((regime) => [[null, null], [0, null], [null, 0], [0, 0]].map(([el, rig]) => ({
    id: `${s}|${regime}|elast${el ?? 'def0.5'}|rig${rig ?? 'def0.9'}`, s, regime,
    extra: { ...(el === null ? {} : { 'labor.wageElasticity': el }), ...(rig === null ? {} : { 'wage.nominalRigidity': rig }) } })))),
  slump: () => ['M', 'S0'].flatMap((s) => [['fiat', {}], ['fiat|stim0', { 'centralBank.stimulus': 0 }], ['fiat|stim3', { 'centralBank.stimulus': 3 }], ['bitcoin', {}]].flatMap(([lab, ex]) =>
    ['none', 'demand', 'credit'].map((k) => ({ id: `${s}|${lab}|${k}`, s, regime: lab.startsWith('bitcoin') ? 'bitcoin' : 'fiat', extra: ex, shock: k === 'none' ? null : SHK[k] })))),
  realmort: () => [12, 24].flatMap((L) => ['off', 'on'].flatMap((rm) => [0, 0.3].map((hc) => ({ id: `M|transition${L}|realMortgage=${rm}|haircut${hc}`, s: 'M', regime: 'fiat',
    extra: { 'transition.lengthMonths': L, 'transition.realMortgage': rm, 'transition.debtHaircut': hc } })))).concat(RG.map((regime) => ({ id: `M|steady_${regime}`, s: 'M', regime }))),
  gaps: () => [0.62, 0].flatMap((bk) => [0, 0.25, 0.5].flatMap((pm) => [...RG, 'hybrid'].map((regime) => ({ id: `M|${regime}|book${bk}|premium${pm}`, s: 'M', regime,
    extra: { 'housing.openingMortgageShareOfOwners': bk, 'housing.monetaryPremium': pm, 'shock.frequency': 0.1 } })))),

  // v6 (3a): wage negotiation. Default rigidity is now 0.9 (10% of the gap to the agreed wage closes per month).
  wages: () => ['S0', 'S3', 'M'].flatMap((s) => RG.flatMap((regime) => [null, 0.95, 0.7, 0.5, 0].map((rig) => ({
    id: `${s}|${regime}|rig${rig ?? 'def0.9'}`, s, regime, extra: rig === null ? {} : { 'wage.nominalRigidity': rig } })))),
  wagesNoBook: () => RG.flatMap((regime) => [null, 0].map((rig) => ({ id: `M|${regime}|nobook|rig${rig ?? 'def0.9'}`, s: 'M', regime,
    extra: { 'housing.openingMortgageShareOfOwners': 0, ...(rig === null ? {} : { 'wage.nominalRigidity': rig }) } }))),
  // v6 (3b): crisis stimulus. Forced shocks at month 60, random shocks off.
  stimulus: () => ['S0', 'M'].flatMap((s) => ['none', 'demand', 'credit', 'supply'].flatMap((k) => [
    ['fiat', {}], ['fiat|stim0.05', { 'centralBank.stimulus': 0.05 }], ['fiat|stim2', { 'centralBank.stimulus': 2 }],
    ['fiat|lag1', { 'centralBank.stimulusLag': 1 }], ['fiat|lag24', { 'centralBank.stimulusLag': 24 }], ['bitcoin', {}]].map(([lab, ex]) => ({
    id: `${s}|${lab}|${k}`, s, regime: lab.startsWith('bitcoin') ? 'bitcoin' : 'fiat', extra: ex, shock: k === 'none' ? null : SHK[k] })))),
  // v6 (3b): near-frozen fiat (moneyGrowth floor 0.05) vs bitcoin, with and without the stimulus, shocks off and at 0.1.
  freeze: () => ['M', 'S0', 'S3'].flatMap((s) => [0, 0.1].flatMap((fq) => [
    ['fiat', {}], ['fiat|mg0.05', { 'centralBank.moneyGrowth': 0.05 }], ['fiat|mg0.05|stim0', { 'centralBank.moneyGrowth': 0.05, 'centralBank.stimulus': 0 }],
    ['fiat|mg0.05|stim3', { 'centralBank.moneyGrowth': 0.05, 'centralBank.stimulus': 3 }], ['bitcoin', {}]].map(([lab, ex]) => ({
    id: `${s}|${lab}|shock${fq}`, s, regime: lab.startsWith('bitcoin') ? 'bitcoin' : 'fiat', extra: { ...ex, 'shock.frequency': fq } })))),
  premium: () => ['M', 'S0tenure'].flatMap((s) => RG.flatMap((regime) => [0, 0.25, 0.5].map((pm) => ({ id: `${s}|${regime}|premium${pm}`,
    s: s === 'M' ? 'M' : 'S0', regime, extra: { 'housing.monetaryPremium': pm, ...(s === 'M' ? {} : { 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on' }) } })))),
  sink: () => RG.flatMap((regime) => [0, 1].flatMap((pt) => [0.62, 0].map((bk) => ({ id: `M|${regime}|pass${pt}|book${bk}`, s: 'M', regime,
    extra: { 'bank.depositPassThrough': pt, 'housing.openingMortgageShareOfOwners': bk } })))),

  base: () => ['S0', 'S1', 'S2', 'S3', 'M', 'D'].flatMap((s) => RG.map((regime) => ({ id: `${s}|${regime}`, s, regime }))),
  rebateOff: () => ['S0', 'S1', 'S3', 'M'].flatMap((s) => RG.map((regime) => ({ id: `${s}|${regime}|rebateOff`, s, regime, rebateOff: true }))),
  resolution: () => RG.flatMap((regime) => [
    { id: `M|${regime}|resOff`, s: 'M', regime, extra: { 'bank.resolution': 'off' } },
  ]),
  tenure: () => RG.flatMap((regime) => [
    { id: `S0tenure|${regime}`, s: 'S0', regime, extra: { 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on' } },
    { id: `S0tenureHF|${regime}`, s: 'S0', regime, extra: { 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on', 'credit.householdMortgageShare': 0.25, 'housing.mortgageLtv': 0.95, 'bank.resolution': 'merge' } },
  ]),
  supply: () => ['fiat', 'fiat+stabilizer', 'bitcoin'].flatMap((p) => ['none', 'supply'].map((k) => {
    const regime = p === 'fiat+stabilizer' ? 'fiat' : p;
    const extra = p === 'fiat+stabilizer' ? { 'government.stabilizer': 1 } : {};
    return { id: `S2|${p}|${k}`, s: 'S2', regime, extra, shock: k === 'supply' ? { tick: 60, kind: 'productivity', size: -0.1 } : null };
  })),
  channels: () => ['proRataDeposits', 'governmentSpending', 'newLoans', 'assetPurchase'].map((ch) =>
    ({ id: `S3|fiat|ch=${ch}`, s: 'S3', regime: 'fiat', extra: { 'centralBank.injectionChannel': ch } })),
  subsidy: () => [
    { id: 'S0|fiat|subsidy1', s: 'S0', regime: 'fiat', extra: { 'bank.depositPassThrough': 1, 'bank.depositInterestSubsidy': 1 } },
    { id: 'M|fiat|subsidy1', s: 'M', regime: 'fiat', extra: { 'bank.depositPassThrough': 1, 'bank.depositInterestSubsidy': 1 } },
  ],
  reserveInt: () => RG.map((regime) => ({ id: `M|${regime}|noReserveInt`, s: 'M', regime })),
  s0s2cmp: () => ['S0','S1','S2','S3'].flatMap((s) => RG.map((regime) => ({ id: `${s}|${regime}|cmp`, s, regime }))),
  hybrid: () => [{ id: 'M|hybrid', s: 'M', regime: 'hybrid' }, { id: 'M|hybrid|resOff', s: 'M', regime: 'hybrid', extra: { 'bank.resolution': 'off' } }],
  mortgage: () => RG.flatMap((regime) => [
    { id: `M|${regime}|mort`, s: 'M', regime },
    { id: `S0tenure|${regime}|mort`, s: 'S0', regime, extra: { 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on' } },
    { id: `S0tenureHF|${regime}|mort`, s: 'S0', regime, extra: { 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on', 'credit.householdMortgageShare': 0.25, 'housing.mortgageLtv': 0.95, 'bank.resolution': 'merge' } },
  ]),
  flh: () => ['S0', 'S1'].flatMap((s) => RG.flatMap((regime) => ['off', 'on'].map((fl) => ({ id: `${s}+dw1|${regime}|flh=${fl}`, s, regime, extra: { 'production.demandWeight': 1, 'labor.firmLevelHiring': fl } })))),
  flhDemand: () => RG.flatMap((regime) => ['off', 'on'].map((fl) => ({ id: `S2|${regime}|demandShock|flh=${fl}`, s: 'S0', regime, extra: { 'production.demandWeight': 1, 'labor.firmLevelHiring': fl }, shock: { tick: 60, kind: 'demand', size: -0.15 } }))),
  hoardNewLoans: () => [
    { id: 'S3|fiat|newLoans|hoard3', s: 'S3', regime: 'fiat', extra: { 'centralBank.injectionChannel': 'newLoans', 'household.realReturnSensitivity': 3 } },
    { id: 'S3|fiat|proRata|hoard3', s: 'S3', regime: 'fiat', extra: { 'household.realReturnSensitivity': 3 } },
  ],
};
const out = {};
for (const c of GROUPS[process.argv[2]]()) { out[c.id] = summarize(c); process.stderr.write(`${c.id} done err=${out[c.id].errors}\n`); }
console.log(JSON.stringify(out));
