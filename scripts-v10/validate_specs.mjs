import fs from 'node:fs';
const { loadScenario } = await import('/workspace/econ-sim/repo-v10/packages/core/dist/config/load.js');
const { simulate } = await import('/workspace/econ-sim/repo-v10/packages/core/dist/sim/simulate.js');
let bad=0, n=0;
for (const f of fs.readdirSync('../specs-v10')) {
  const s = JSON.parse(fs.readFileSync('../specs-v10/'+f));
  for (const c of s.conditions) { n++;
    try { loadScenario({ name: c.id, seed: 1, ticks: c.ticks ?? s.ticks, sliders: { ...s.base.sliders, ...c.sliders } }); }
    catch (e) { bad++; console.log(f, c.id, String(e.message).slice(0,200)); } }
}
console.log('conds', n, 'bad', bad);
for (const [nm, sl] of [['S0 btc', {'regime.type':'bitcoin','prices.trendWeight':1,'production.demandWeight':0,'labor.firmLevelHiring':'off'}], ['M btc', JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders]]) {
  const t=Date.now(); const cfg = loadScenario({ name: 'x', seed: 1, ticks: 240, sliders: {'ai.automatableShareStart':0.3,'ai.automatableShareEnd':0.3,'scale.households':500,'scale.firms':50,'scale.banks':3,'regime.type':'bitcoin',...sl} });
  const r = simulate(cfg, null); const S=r.metrics.series; console.log(nm, (Date.now()-t)/1000, 's  u', S.unemployment.at(-1).toFixed(3), 'cons', S.medianRealConsumption.at(-1).toFixed(3));
}
