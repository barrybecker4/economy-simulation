import fs from 'node:fs';
const { loadScenario, runSimulation } = await import('../repo-v10/packages/core/dist/index.js');
const { World } = await import('../repo-v10/packages/core/dist/sim/world.js');
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const S3 = { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on', 'regime.type': 'fiat', 'bank.depositPassThrough': 1, 'centralBank.spendNewMoney': 1 };
const channels = ['proRataDeposits','governmentSpending','newLoans','assetPurchase'];
const out = {};
for (const ch of channels) {
  const rows=[];
  for (const seed of [1,2,3,4,5]) {
    try {
      const sl = { ...NOAI, ...S3, 'centralBank.injectionChannel': ch };
      const config = loadScenario({ name: ch, seed, ticks: 240, sliders: sl });
      const w = new World(config); const e = w.economy; const h = w.handlers();
      const rates=[];
      const wf = h.welfare;
      h.welfare = (ctx) => { wf(ctx); rates.push(e.policyRate); };
      const res = runSimulation(config, h);
      const S = res.metrics.series;
      rows.push({ seed, infl: S.inflation.slice(24).reduce((a,x)=>a+x,0)/216, money: S.moneySupply[239]/S.moneySupply[0],
        polMean: rates.slice(24).reduce((a,x)=>a+x,0)/216, polMax: Math.max(...rates), polMin: Math.min(...rates.slice(24)),
        cons: S.medianRealConsumption[239] });
    } catch(ex) { rows.push({ seed, error: String(ex.message).slice(0,120) }); }
  }
  out[ch]=rows;
}
const rows=[];
for (const seed of [1,2,3,4,5]) {
  try {
    const sl = { ...NOAI, ...S3, 'bank.depositInterestSubsidy': 1 };
    const config = loadScenario({ name: 'sub', seed, ticks: 240, sliders: sl });
    const w = new World(config); const e = w.economy; const h = w.handlers();
    const rates=[];
    const wf = h.welfare;
    h.welfare = (ctx) => { wf(ctx); rates.push(e.policyRate); };
    const res = runSimulation(config, h);
    const S = res.metrics.series;
    rows.push({ seed, infl: S.inflation.slice(24).reduce((a,x)=>a+x,0)/216, money: S.moneySupply[239]/S.moneySupply[0],
      polMean: rates.slice(24).reduce((a,x)=>a+x,0)/216, polMax: Math.max(...rates), polMin: Math.min(...rates.slice(24)),
      cons: S.medianRealConsumption[239] });
  } catch(ex) { rows.push({ seed, error: String(ex.message).slice(0,120) }); }
}
out['proRata+subsidy1']=rows;
console.log(JSON.stringify(out));
