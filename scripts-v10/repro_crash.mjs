// Reproduce a crash with full stack trace and the tick/phase it happened in.
import fs from 'node:fs';
import { loadScenario, runSimulation } from '../repo-v10/packages/core/dist/index.js';
import { World } from '../repo-v10/packages/core/dist/sim/world.js';
const [specPath, condId, seedS] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const cond = spec.conditions.find((c) => c.id === condId);
const seed = Number(seedS);
const sliders = { ...(spec.base?.sliders ?? {}), ...(cond.sliders ?? {}) };
const config = loadScenario({ name: cond.id, seed, ticks: cond.ticks ?? spec.ticks, sliders });
const world = new World(config, cond.shock ?? null);
const h = world.handlers();
let where = {};
for (const k of Object.keys(h)) { const f = h[k]; h[k] = (ctx) => { where = { tick: ctx.tick, phase: k }; return f(ctx); }; }
try { runSimulation(config, h); console.log('no crash'); }
catch (e) { console.log('CRASH at', JSON.stringify(where)); console.log(e.stack.split('\n').slice(0, 14).join('\n')); }
