// Quick validation of key fixes
import { simulate } from './packages/core/dist/sim/simulate.js';
import { loadScenario } from './packages/core/dist/config/load.js';
import { totalDeposits, totalLoans } from './packages/core/dist/sim/banking.js';

const NOAI = { 
  'ai.automatableShareStart': 0.3, 
  'ai.automatableShareEnd': 0.3, 
  'scale.households': 500, 
  'scale.firms': 50, 
  'scale.banks': 3, 
  'shock.frequency': 0 
};

const MONETARY = {
  'prices.trendWeight': 0,
  'production.demandWeight': 1,
  'bank.depositPassThrough': 1,
  'expectations.anchorWeight': 0.5,
  'housing.tenureChoice': 'on',
  'credit.endogenousWeight': 1,
  'credit.leverageStart': 1,
  'credit.householdMortgageShare': 0.25,
  'housing.mortgageLtv': 0.95,
  'bank.capitalRatio': 0.04,
  'bank.resolution': 'merge',
  'household.openingDepositMonths': 12,
  'household.skillSigma': 1.1,
  'money.choiceSpeed': 0,
  'labor.firmLevelHiring': 'on'
};

console.log('Testing key fixes...\n');

// Test 1: M Bitcoin stability with indexed mortgages
console.log('Test 1: M Bitcoin with indexed mortgages (240 months, seed 1)');
const mBitcoin = simulate(
  loadScenario({
    seed: 1,
    ticks: 240,
    sliders: {
      ...NOAI,
      ...MONETARY,
      'regime.type': 'bitcoin',
    },
  }),
);

const failures = mBitcoin.metrics.series.bankFailures[239];
const foreclosures = mBitcoin.metrics.series.mortgageToRent.reduce((a, b) => a + b, 0);
const unemployment = mBitcoin.metrics.series.unemployment;
const avgU = unemployment.reduce((a, b) => a + b, 0) / unemployment.length;
const maxU = Math.max(...unemployment);
const priceLevel = mBitcoin.metrics.series.priceLevel;
const cpi = Math.pow(priceLevel[239] / priceLevel[0], 12 / 239) - 1;
const money = mBitcoin.metrics.series.moneySupply;
const moneyRatio = money[239] / money[0];

console.log(`  Bank failures: ${failures} (expect < 20)`);
console.log(`  Foreclosures: ${foreclosures} (expect reasonable)`);
console.log(`  Avg unemployment: ${(avgU * 100).toFixed(1)}% (expect < 15%)`);
console.log(`  Max unemployment: ${(maxU * 100).toFixed(1)}% (expect < 23%)`);
console.log(`  CPI annual: ${(cpi * 100).toFixed(1)}% (deflation expected for Bitcoin)`);
console.log(`  Money ratio: ${moneyRatio.toFixed(2)}x (expect stable or growing)`);
console.log(`  Audit OK: ${mBitcoin.audit.ok}\n`);

// Test 2: Supply shock unemployment response (S2 fiat)
console.log('Test 2: S2 fiat supply shock unemployment response');
const s2Base = simulate(
  loadScenario({
    seed: 1,
    ticks: 100,
    sliders: {
      ...NOAI,
      'prices.trendWeight': 1,
      'production.demandWeight': 1,
      'labor.firmLevelHiring': 'on',
      'regime.type': 'fiat',
    },
  }),
);

const s2Shock = simulate(
  loadScenario({
    seed: 1,
    ticks: 100,
    sliders: {
      ...NOAI,
      'prices.trendWeight': 1,
      'production.demandWeight': 1,
      'labor.firmLevelHiring': 'on',
      'regime.type': 'fiat',
      'shock.tick': 12,
      'shock.kind': 'productivity',
      'shock.size': -0.1,
    },
  }),
);

const baseU = s2Base.metrics.series.unemployment.slice(12, 24).reduce((a, b) => a + b, 0) / 12;
const shockU = s2Shock.metrics.series.unemployment.slice(12, 24).reduce((a, b) => a + b, 0) / 12;
const deltaU = shockU - baseU;

console.log(`  Base unemployment: ${(baseU * 100).toFixed(1)}%`);
console.log(`  Shock unemployment: ${(shockU * 100).toFixed(1)}%`);
console.log(`  Delta: ${(deltaU * 100).toFixed(2)} pp (expect >= 0, not negative)\n`);

// Test 3: Stimulus effectiveness (M fiat demand shock)
console.log('Test 3: M fiat stimulus effectiveness in demand slump');
const mNoStimulus = simulate(
  loadScenario({
    seed: 1,
    ticks: 100,
    sliders: {
      ...NOAI,
      ...MONETARY,
      'regime.type': 'fiat',
      'centralBank.stimulusLag': 0,
      'shock.tick': 12,
      'shock.kind': 'demand',
      'shock.size': -0.15,
    },
  }),
);

const uNoStimulus = Math.max(...mNoStimulus.metrics.series.unemployment.slice(12, 36));
console.log(`  Max unemployment with stimulus lag 0: ${(uNoStimulus * 100).toFixed(1)}%`);
console.log(`  Stimulus should help reduce unemployment peaks\n`);

console.log('All tests complete. Check results above.');
