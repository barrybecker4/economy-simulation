import fs from 'node:fs';
const { loadScenario, runSimulation } = await import('../repo-v10/packages/core/dist/index.js');
const { World } = await import('../repo-v10/packages/core/dist/sim/world.js');
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const ARMS = {
  'M|bitcoin (sigma1.1, pass1)': { ...MON, 'regime.type': 'bitcoin' },
  'M|bitcoin sigma0.5': { ...MON, 'household.skillSigma': 0.5, 'regime.type': 'bitcoin' },
  'M|bitcoin pass0': { ...MON, 'bank.depositPassThrough': 0, 'regime.type': 'bitcoin' },
  'M|bitcoin sigma0.5 pass0': { ...MON, 'household.skillSigma': 0.5, 'bank.depositPassThrough': 0, 'regime.type': 'bitcoin' },
  'M|hybrid sigma0.5': { ...MON, 'household.skillSigma': 0.5, 'regime.type': 'hybrid' },
  'M|hybrid pass0': { ...MON, 'bank.depositPassThrough': 0, 'regime.type': 'hybrid' },
  'S0|bitcoin pass1': { 'bank.depositPassThrough': 1, 'regime.type': 'bitcoin' },
  'S3|bitcoin pass1': { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'bank.depositPassThrough': 1, 'regime.type': 'bitcoin' },
  'S3|bitcoin pass1 sigma1.1': { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'bank.depositPassThrough': 1, 'household.skillSigma': 1.1, 'regime.type': 'bitcoin' },
};
const out = {};
for (const [id, sl] of Object.entries(ARMS)) {
  const crashed = [];
  for (let seed = 1; seed <= 20; seed++) {
    try { const c = loadScenario({ name: id, seed, ticks: 240, sliders: { ...NOAI, ...sl } }); runSimulation(c, new World(c).handlers()); }
    catch (ex) { crashed.push(seed); }
  }
  out[id] = { crashes: crashed.length, seeds: crashed };
  console.error(id, crashed.length, crashed.join(','));
}
console.log(JSON.stringify(out, null, 1));
