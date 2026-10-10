// X2: who bears the transition cost. One-shot fiat->bitcoin switch at month 12 vs staying fiat, same seeds.
// Arms: holder concentration preserve (patched P_PRESERVE: 1:1 conversion, no skill reassignment) or 0.5 (default);
// debtHaircut 0 / 0.15 / 0.3. Households classified at tick 10. Uses patched-v10 lib (identical to repo when flags unset).
import fs from 'node:fs';
const LIB = '../patched-v10/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const STRUCT = { M: MON, S0tenure: { 'housing.tenureChoice': 'on', 'housing.marketClearing': 'on' } };
const SEEDS = Array.from({ length: Number(process.env.NSEEDS ?? 20) }, (_, i) => i + 1);
const T = 121;
const ARMS = [{ id: 'stayFiat' }];
for (const hc of ['preserve', '0.5']) for (const hcut of [0, 0.15, 0.3]) ARMS.push({ id: `switch12|hc=${hc}|haircut=${hcut}`, hc, hcut });

function runArm(st, arm, seed) {
  const sl = { ...NOAI, ...STRUCT[st], 'regime.type': 'fiat' };
  if (arm.hc) Object.assign(sl, { 'transition.lengthMonths': 12, 'transition.gradualWeight': 0, 'transition.debtHaircut': arm.hcut, 'transition.holderConcentration': arm.hc === 'preserve' ? 0 : Number(arm.hc) });
  if (arm.hc === 'preserve') process.env.P_PRESERVE = '1'; else delete process.env.P_PRESERVE;
  try {
    const config = loadScenario({ name: 'x2', seed, ticks: T, sliders: sl });
    const w = new World(config); const e = w.economy; const h = w.handlers();
    const n = e.households.length;
    const snap = {}; const unempMonths = new Array(n).fill(0); const foreclosed = new Array(n).fill(0); let prevTen = null;
    const agg = [];
    const wf = h.welfare;
    h.welfare = (ctx) => {
      wf(ctx);
      const P = e.priceLevel; const bp = e.bitcoinPrice || 0;
      const nw = (x) => (x.deposit + (x.bitcoin || 0) * bp - x.mortgage - x.consumerLoan - ((x.bitcoinMortgage || 0) + (x.bitcoinConsumer || 0)) * bp) / P;
      if ([10, 13, 60, 120].includes(ctx.tick)) snap[ctx.tick] = e.households.map((x) => ({ nw: nw(x), c: x.realConsumption, ten: x.tenure, emp: x.employer >= 0, debt: x.mortgage + x.consumerLoan, dep: x.deposit, skill: x.skill }));
      if (ctx.tick >= 12) e.households.forEach((x, i) => { if (x.employer < 0) unempMonths[i]++; });
      const ten = e.households.map((x) => x.tenure);
      if (prevTen) ten.forEach((t, i) => { if (prevTen[i] === 'mortgage' && t === 'rent') foreclosed[i]++; });
      prevTen = ten;
      if (ctx.tick === 10 || ctx.tick === 13) agg.push({ t: ctx.tick, meanNW: e.households.reduce((a, x) => a + nw(x), 0) / n, P, bp });
    };
    const res = runSimulation(config, h);
    return { ok: true, snap, unempMonths, foreclosed, agg, S: { cpi: res.metrics.series.priceLevel, infl: res.metrics.series.inflation, u: res.metrics.series.unemployment } };
  } catch (ex) { return { ok: false, err: String(ex.message).slice(0, 120) }; }
  finally { delete process.env.P_PRESERVE; }
}

function groupsAt10(s10) {
  const n = s10.length; const order = [...s10.keys()].sort((a, b) => s10[a].skill - s10[b].skill); const q = new Array(n);
  order.forEach((idx, r) => { q[idx] = Math.min(4, Math.floor((5 * r) / n)); });
  return s10.map((x, i) => ({ debtor: x.debt > x.dep ? 'debtor' : 'saver', tenure: x.ten === 'rent' || x.ten === 'none' ? 'renter' : (x.ten === 'mortgage' ? 'mortgagor' : 'outright'), emp: x.emp ? 'employed' : 'unemployed', q: `Q${q[i] + 1}` }));
}

const out = { meta: { T, seeds: SEEDS, arms: ARMS.map((a) => a.id) }, results: {} };
for (const st of Object.keys(STRUCT)) {
  out.results[st] = {};
  const acc = {}; const crashes = {};
  for (const seed of SEEDS) {
    const base = runArm(st, ARMS[0], seed);
    if (!base.ok) { (crashes.stayFiat ??= []).push(seed); continue; }
    const G = groupsAt10(base.snap[10]);
    for (const arm of ARMS.slice(1)) {
      const r = runArm(st, arm, seed);
      if (!r.ok) { (crashes[arm.id] ??= []).push(seed); continue; }
      const A = (acc[arm.id] ??= { all: {}, check: [] });
      A.check.push({ seed, nwBefore: r.agg[0]?.meanNW, nwAfter: r.agg[1]?.meanNW, stayBefore: base.agg[0]?.meanNW, stayAfter: base.agg[1]?.meanNW });
      const cpiAvg = (S) => S.infl.slice(13, 120).reduce((a, x) => a + x, 0) / 107;
      const uAvg = (S) => S.u.slice(13, 120).reduce((a, x) => a + x, 0) / 107;
      (A.macro ??= []).push({ dInfl: cpiAvg(r.S) - cpiAvg(base.S), dU: uAvg(r.S) - uAvg(base.S), inflSwitch: cpiAvg(r.S) });
      for (let i = 0; i < G.length; i++) {
        for (const key of ['all', `debtor=${G[i].debtor}`, `tenure=${G[i].tenure}`, `emp=${G[i].emp}`, `skill=${G[i].q}`]) {
          const g = (A.all[key] ??= { n: 0, dNW60: 0, dNW120: 0, stayNW60: 0, stayNW120: 0, dC60: 0, dC120: 0, stayC60: 0, stayC120: 0, dUnempM: 0, dForeclose: 0, switchNW13: 0, stayNW13: 0 });
          g.n++;
          g.dNW60 += r.snap[60][i].nw - base.snap[60][i].nw; g.dNW120 += r.snap[120][i].nw - base.snap[120][i].nw;
          g.stayNW60 += base.snap[60][i].nw; g.stayNW120 += base.snap[120][i].nw;
          g.dC60 += r.snap[60][i].c - base.snap[60][i].c; g.dC120 += r.snap[120][i].c - base.snap[120][i].c;
          g.stayC60 += base.snap[60][i].c; g.stayC120 += base.snap[120][i].c;
          g.dUnempM += r.unempMonths[i] - base.unempMonths[i]; g.dForeclose += r.foreclosed[i] - base.foreclosed[i];
          g.switchNW13 += r.snap[13][i].nw; g.stayNW13 += base.snap[13][i].nw;
        }
      }
    }
    process.stderr.write(`${st} seed ${seed} done\n`);
  }
  for (const [arm, A] of Object.entries(acc)) {
    const rows = {};
    for (const [k, g] of Object.entries(A.all)) rows[k] = { n: g.n,
      dNW13_pct: (g.switchNW13 - g.stayNW13) / Math.abs(g.stayNW13) * 100,
      dNW60_pct: g.dNW60 / Math.abs(g.stayNW60) * 100, dNW120_pct: g.dNW120 / Math.abs(g.stayNW120) * 100,
      dNW120_perHH: g.dNW120 / g.n, stayNW120_perHH: g.stayNW120 / g.n,
      dC60_pct: g.dC60 / g.stayC60 * 100, dC120_pct: g.dC120 / g.stayC120 * 100,
      dUnempMonths_perHH: g.dUnempM / g.n, dForeclosures_per100HH: g.dForeclose / g.n * 100 };
    const mac = A.macro; const m = (f) => mac.reduce((a, x) => a + f(x), 0) / mac.length;
    out.results[st][arm] = { nSeeds: mac.length, crashes: crashes[arm] ?? [], dInfl_m13_120: m((x) => x.dInfl), inflSwitch: m((x) => x.inflSwitch), dU_m13_120: m((x) => x.dU), check: A.check.slice(0, 3), groups: rows };
  }
  out.results[st]._stayFiatCrashes = crashes.stayFiat ?? [];
}
console.log(JSON.stringify(out));
