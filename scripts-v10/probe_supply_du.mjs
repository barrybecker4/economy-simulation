import fs from 'node:fs';
const { loadScenario, runSimulation } = await import('../repo-v10/packages/core/dist/index.js');
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const S2 = { 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' };
const out={};
for (const regime of ['fiat','bitcoin']) {
  const dus=[], dgdp=[];
  for (let seed=1; seed<=20; seed++) {
    try {
      const base = loadScenario({ name:'b', seed, ticks:100, sliders:{...NOAI,...S2,'regime.type':regime}});
      const sh = loadScenario({ name:'s', seed, ticks:100, sliders:{...NOAI,...S2,'regime.type':regime}});
      // need shock on second - use World
    } catch(e) {}
  }
}
// Use World with shock
const { World } = await import('../repo-v10/packages/core/dist/sim/world.js');
for (const regime of ['fiat','bitcoin']) {
  const dus=[], dgdp=[], dcons=[];
  for (let seed=1; seed<=20; seed++) {
    const run = (shock) => {
      const config = loadScenario({ name:'x', seed, ticks:100, sliders:{...NOAI,...S2,'regime.type':regime}});
      const w = new World(config, shock);
      return runSimulation(config, w.handlers());
    };
    try {
      const b = run(null); const s = run({ tick:60, kind:'productivity', size:-0.1 });
      const ub = b.metrics.series.unemployment; const us = s.metrics.series.unemployment;
      const mb = ub.slice(60,84).reduce((a,x)=>a+x,0)/24; const ms = us.slice(60,84).reduce((a,x)=>a+x,0)/24;
      dus.push(ms-mb);
      const gb = b.metrics.series.realGdp.slice(60,84).reduce((a,x)=>a+x,0)/24;
      const gs = s.metrics.series.realGdp.slice(60,84).reduce((a,x)=>a+x,0)/24;
      dgdp.push(gs/gb-1);
    } catch(e) { /* skip */ }
  }
  out[regime]={ n:dus.length, du_pp: dus.reduce((a,x)=>a+x,0)/dus.length*100, dgdp: dgdp.reduce((a,x)=>a+x,0)/dgdp.length };
}
console.log(JSON.stringify(out));
