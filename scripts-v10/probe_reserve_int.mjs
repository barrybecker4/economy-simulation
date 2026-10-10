import fs from 'node:fs';
const { loadScenario, runSimulation } = await import('../repo-v10/packages/core/dist/index.js');
const { World } = await import('../repo-v10/packages/core/dist/sim/world.js');
const { totalDeposits } = await import('../repo-v10/packages/core/dist/sim/banking.js');
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const out = {};
for (const [id, sl] of [
  ['M|fiat', { ...MON, 'regime.type': 'fiat' }],
  ['M|fiat|pass0', { ...MON, 'regime.type': 'fiat', 'bank.depositPassThrough': 0 }],
  ['M|bitcoin', { ...MON, 'regime.type': 'bitcoin' }],
  ['S0|fiat|pass1', { 'regime.type': 'fiat', 'bank.depositPassThrough': 1 }],
  ['S3|fiat|pass1', { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on', 'regime.type': 'fiat', 'bank.depositPassThrough': 1 }],
  ['S3|fiat|pass1|subsidy1', { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on', 'regime.type': 'fiat', 'bank.depositPassThrough': 1, 'bank.depositInterestSubsidy': 1 }],
]) {
  const rows = [];
  for (const seed of [1,2,3,4,5,6,7,8,9,10]) {
    try {
      const config = loadScenario({ name: id, seed, ticks: 240, sliders: { ...NOAI, ...sl } });
      const w = new World(config); const e = w.economy; const h = w.handlers();
      let reserveInt = 0, opening = 0, paidDep = 0;
      const cb = h.centralBank;
      h.centralBank = (ctx) => { cb(ctx); reserveInt += (e.reserveInterestPaid || 0); paidDep += (e.depositInterestPaid || 0); };
      const wf = h.welfare;
      h.welfare = (ctx) => { wf(ctx); if (ctx.tick===0) opening = totalDeposits(e); };
      const res = runSimulation(config, h);
      const S = res.metrics.series;
      rows.push({ reserveIntCum: reserveInt, paidDepCum: paidDep, opening, reserveShareOfOpening: reserveInt/opening,
        moneyGrowth: S.moneySupply[239]/S.moneySupply[0]-1, moneyGrowthYr: (S.moneySupply[239]/S.moneySupply[0])**(12/239)-1,
        infl: S.inflation.slice(24).reduce((a,x)=>a+x,0)/216, cons: S.medianRealConsumption[239],
        u: S.unemployment.slice(24).reduce((a,x)=>a+x,0)/216, endMoney: S.moneySupply[239] });
    } catch (ex) { rows.push({ error: String(ex.message).slice(0,160) }); }
  }
  out[id] = rows;
}
console.log(JSON.stringify(out));
