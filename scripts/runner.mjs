// Headless experiment runner for barrybecker4/economy-simulation (read-only use of the core package).
// Usage: node runner.mjs <spec.json> <out.jsonl>
// spec: { name, base: {sliders}, ticks, seeds:[...], snapshotTicks:[...], seriesMetrics:[...],
//         conditions: [{ id, sliders, shock?: {tick,kind,size}, ticks? }] }
import fs from 'node:fs';
import { loadScenario, runSimulation, METRIC_IDS } from '../packages/core/dist/index.js';
import { World } from '../packages/core/dist/sim/world.js';

const [specPath, outPath] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const out = fs.createWriteStream(outPath);

function quintileOf(rank, n) { return Math.min(4, Math.floor((5 * rank) / n)); }

function householdSnapshot(econ) {
  const hh = econ.households;
  const n = hh.length;
  const P = econ.priceLevel;
  // groups by skill quintile (skill = earning power; also initial deposits ~ skill^2)
  const bySkill = hh.map((h, i) => i).sort((a, b) => hh[a].skill - hh[b].skill);
  const grp = Array.from({ length: 5 }, () => ({ n: 0, realDeposit: 0, realDebt: 0, realCons: 0, realIncome: 0, employed: 0, owners: 0, mortgagors: 0, renters: 0, debtToIncome: 0 }));
  bySkill.forEach((idx, rank) => {
    const h = hh[idx];
    const g = grp[quintileOf(rank, n)];
    g.n++;
    g.realDeposit += h.deposit / P;
    const debt = (h.mortgage ?? 0) + (h.consumerLoan ?? 0);
    g.realDebt += debt / P;
    g.realCons += h.realConsumption ?? 0;
    g.realIncome += (h.smoothed ?? 0) / P;
    g.employed += h.employer >= 0 ? 1 : 0;
    g.owners += h.tenure === 'owned' ? 1 : 0;
    g.mortgagors += h.tenure === 'mortgage' ? 1 : 0;
    g.renters += h.tenure === 'rent' ? 1 : 0;
    g.debtToIncome += h.smoothed > 0 ? debt / (12 * h.smoothed) : 0;
  });
  for (const g of grp) for (const k of Object.keys(g)) if (k !== 'n') g[k] /= Math.max(1, g.n);
  const firmLoans = econ.firms.reduce((s, f) => s + f.loan, 0);
  const firmCap = econ.firms.reduce((s, f) => s + f.capital, 0);
  return { priceLevel: P, wageLevel: econ.wageLevel, policyRate: econ.policyRate, depositRate: econ.depositRate, paidDepositRate: econ.paidDepositRate ?? null, skillQuintiles: grp,
           realFirmLoans: firmLoans / P, firmCapital: firmCap };
}

function runOne(cond, seed) {
  const ticks = cond.ticks ?? spec.ticks;
  const sliders = { ...(spec.base?.sliders ?? {}), ...(cond.sliders ?? {}) };
  const config = loadScenario({ name: cond.id, seed, ticks, sliders });
  const world = new World(config, cond.shock ?? null);
  const econ = world.economy; // runtime access for read-only snapshots
  const handlers = world.handlers();
  const snaps = {};
  const snapAt = new Set(spec.snapshotTicks ?? [ticks - 1]);
  const welfare = handlers.welfare;
  handlers.welfare = (ctx) => { welfare(ctx); if (snapAt.has(ctx.tick)) snaps[ctx.tick] = householdSnapshot(econ); };
  const res = runSimulation(config, handlers);
  const S = res.metrics.series;
  const series = {};
  for (const m of spec.seriesMetrics ?? []) series[m] = S[m];
  const endVals = {};
  for (const m of METRIC_IDS) endVals[m] = S[m][ticks - 1];
  return { spec: spec.name, cond: cond.id, seed, ticks, sliders, shock: cond.shock ?? null, end: endVals, series, snaps,
           auditOk: S.auditOk.every((v) => v === 1) };
}

const t0 = Date.now();
let count = 0;
for (const cond of spec.conditions) {
  for (const seed of spec.seeds) {
    let row;
    try {
      row = runOne(cond, seed);
    } catch (err) {
      row = { spec: spec.name, cond: cond.id, seed, error: String(err && err.message ? err.message : err) };
      process.stderr.write(`ERROR ${cond.id} seed ${seed}: ${row.error}\n`);
    }
    out.write(JSON.stringify(row) + '\n');
    count++;
  }
  process.stderr.write(`${spec.name}: ${cond.id} done (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
}
out.end();
process.stderr.write(`${count} runs in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
