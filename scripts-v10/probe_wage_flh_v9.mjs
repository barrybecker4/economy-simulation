// Item C: M fiat/bitcoin x firmLevelHiring on/off x elasticity 0 / rigidity 0. LIB env selects build (default repo-v10).
// Also: share of months with trailing CPI > target and avg annualised wage growth in those months (damping check).
import fs from 'node:fs';
const LIB = process.env.LIB ?? '../repo-v10/packages/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const MON = JSON.parse(fs.readFileSync(LIB.replace('packages/core/dist', 'scenarios/presets/monetary.json'))).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const conds = [['preset', {}], ['flhOff', { 'labor.firmLevelHiring': 'off' }], ['flhOn', { 'labor.firmLevelHiring': 'on' }],
  ['flhOff el0', { 'labor.firmLevelHiring': 'off', 'labor.wageElasticity': 0 }], ['flhOn el0', { 'labor.firmLevelHiring': 'on', 'labor.wageElasticity': 0 }],
  ['flhOff rig0', { 'labor.firmLevelHiring': 'off', 'wage.nominalRigidity': 0 }], ['flhOn rig0', { 'labor.firmLevelHiring': 'on', 'wage.nominalRigidity': 0 }]];
console.log('preset firmLevelHiring =', MON['labor.firmLevelHiring']);
for (const regime of ['fiat', 'bitcoin']) for (const [lab, ex] of conds) {
  const acc = { u: 0, cpi: 0, M: 0, fail: 0, n: 0, over: 0, wgOver: 0, nOver: 0, wgAll: 0 };
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const config = loadScenario({ name: 'w', seed, ticks: 240, sliders: { ...NOAI, ...MON, 'regime.type': regime, ...ex } });
    const w = new World(config); const e = w.economy; const h = w.handlers();
    const S = runSimulation(config, h).metrics.series;
    const u = S.unemployment.slice(12); acc.u += u.reduce((a, b) => a + b, 0) / u.length;
    acc.cpi += Math.pow(S.priceLevel[239] / S.priceLevel[12], 12 / 227) - 1; acc.M += S.moneySupply[239] / S.moneySupply[0]; acc.fail += e.cumulativeFailures; acc.n++;
    const tgt = e.params.inflationTarget; let o = 0;
    for (let t = 24; t < 240; t++) {
      const inf = S.priceLevel[t] / S.priceLevel[t - 12] - 1; const wg = Math.pow(S.realWage[t] * S.priceLevel[t] / (S.realWage[t - 1] * S.priceLevel[t - 1]), 12) - 1;
      if (inf > tgt) { o++; acc.wgOver += wg; acc.nOver++; }
    }
    acc.over += o / 216;
  }
  console.log(`M ${regime} ${lab}: u ${(100 * acc.u / acc.n).toFixed(1)}%  CPI ${(100 * acc.cpi / acc.n).toFixed(1)}%/yr  money ${(acc.M / acc.n).toFixed(2)}x  failures ${(acc.fail / acc.n).toFixed(1)}  months CPI>target ${(100 * acc.over / acc.n).toFixed(0)}%  nominal real-wage-x-P growth in those months ${acc.nOver ? (100 * acc.wgOver / acc.nOver).toFixed(1) : '-'}%/yr`);
}
