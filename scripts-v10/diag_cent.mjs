// Diagnose the fiat-cent "Debits must equal credits" crash: print stock totals and their rounding at the failing tick.
import fs from 'node:fs';
import { loadScenario, runSimulation } from '../repo-v10/packages/core/dist/index.js';
import { World } from '../repo-v10/packages/core/dist/sim/world.js';
const [specPath, condId, seedS] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const cond = spec.conditions.find((c) => c.id === condId);
const config = loadScenario({ name: cond.id, seed: Number(seedS), ticks: spec.ticks, sliders: { ...(spec.base?.sliders ?? {}), ...cond.sliders } });
const world = new World(config, null); const e = world.economy; const h = world.handlers();
const bk = h.bookkeeping;
h.bookkeeping = (ctx) => {
  const sum = (f) => e.banks.reduce((s, b) => s + f(b), 0);
  const dep = e.households.reduce((s, x) => s + x.deposit, 0) + e.firms.reduce((s, f) => s + f.deposit, 0);
  const st = { deposits: dep, loans: null, reserves: sum((b) => b.reserves), bonds: sum((b) => b.bonds), vault: sum((b) => b.vault), equity: sum((b) => b.equity), privateEquity: e.privateEquity };
  try { bk(ctx); } catch (err) {
    console.log('tick', ctx.tick, err.message);
    for (const [k, v] of Object.entries(st)) if (v !== null) console.log(k, v, 'frac', (v - Math.floor(v)).toFixed(4));
    console.log('vault - equity - PE =', st.vault - st.equity - st.privateEquity, ' round(vault)-round(equity)-round(PE)=', Math.round(st.vault) - Math.round(st.equity) - Math.round(st.privateEquity));
    throw err;
  }
};
try { runSimulation(config, h); } catch {}
