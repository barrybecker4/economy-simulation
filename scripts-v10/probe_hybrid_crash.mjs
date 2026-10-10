import fs from 'node:fs';
const { loadScenario, runSimulation } = await import('../repo-v10/packages/core/dist/index.js');
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const out = { fiat: [], bitcoin: [], hybrid: [] };
for (const regime of ['fiat','bitcoin','hybrid']) {
  for (let seed=1; seed<=20; seed++) {
    try {
      const config = loadScenario({ name: `M|${regime}`, seed, ticks: 240, sliders: { ...NOAI, ...MON, 'regime.type': regime } });
      const res = runSimulation(config);
      const S = res.metrics.series;
      out[regime].push({ seed, ok: true, cons: S.medianRealConsumption[239], u: S.unemployment.slice(24).reduce((a,x)=>a+x,0)/216,
        money: S.moneySupply[239]/S.moneySupply[0], bailins: S.bankFailures[239], infl: S.inflation.slice(24).reduce((a,x)=>a+x,0)/216 });
    } catch (ex) {
      out[regime].push({ seed, ok: false, error: String(ex.message).slice(0,80) });
    }
  }
}
console.log(JSON.stringify(out));
