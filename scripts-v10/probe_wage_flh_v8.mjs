// Attribution for fix (6): is the M fiat el0 spiral gone because of wage damping or because M now pins firmLevelHiring off?
import fs from 'node:fs';
const LIB = '../repo-v10/packages/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const conds = [['flhOff el0.5', {}], ['flhOff el0', { 'labor.wageElasticity': 0 }], ['flhOn el0.5', { 'labor.firmLevelHiring': 'on' }], ['flhOn el0', { 'labor.firmLevelHiring': 'on', 'labor.wageElasticity': 0 }], ['flhOn rig0', { 'labor.firmLevelHiring': 'on', 'wage.nominalRigidity': 0 }]];
for (const regime of ['fiat', 'bitcoin']) for (const [lab, ex] of conds) {
  const acc = { u: 0, cpi: 0, M: 0, fail: 0, n: 0 };
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const config = loadScenario({ name: 'w', seed, ticks: 240, sliders: { ...NOAI, ...MON, 'regime.type': regime, ...ex } });
    const w = new World(config); const e = w.economy; const h = w.handlers();
    const S = runSimulation(config, h).metrics.series;
    const u = S.unemployment.slice(12); acc.u += u.reduce((a, b) => a + b, 0) / u.length;
    acc.cpi += Math.pow(S.priceLevel[239] / S.priceLevel[12], 12 / 227) - 1; acc.M += S.moneySupply[239] / S.moneySupply[0]; acc.fail += e.cumulativeFailures; acc.n++;
  }
  console.log(`M ${regime} ${lab}: u ${(100 * acc.u / acc.n).toFixed(1)}%  CPI ${(100 * acc.cpi / acc.n).toFixed(1)}%/yr  money ${(acc.M / acc.n).toFixed(2)}x  failures ${(acc.fail / acc.n).toFixed(1)}`);
}
