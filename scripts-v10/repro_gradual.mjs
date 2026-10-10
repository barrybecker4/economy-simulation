// v7 validity T4 crash: M bitcoin gradual transition, books do not close. Repro on v8 for seeds 1-5.
import fs from 'node:fs';
const LIB = process.env.LIB ?? '../repo-v10/packages/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const MON = JSON.parse(fs.readFileSync(LIB.replace('packages/core/dist', 'scenarios/presets/monetary.json'))).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
for (const seed of [1, 2, 3, 4, 5]) {
  const config = loadScenario({ name: 'v', seed, ticks: 240, sliders: { ...NOAI, ...MON, 'regime.type': 'fiat', 'transition.lengthMonths': 12, 'transition.holderConcentration': 0.5, 'transition.gradualWeight': 1, 'transition.debtHaircut': 0.3 } });
  const w = new World(config); const h = w.handlers();
  try { runSimulation(config, h); console.log(`seed ${seed} ok`); } catch (e) { console.log(`seed ${seed} CRASH: ${String(e.message).slice(0, 140)}`); }
}
