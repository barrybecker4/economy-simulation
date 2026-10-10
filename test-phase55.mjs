// Test phase55 mortgage originations
import { simulate } from './packages/core/dist/sim/simulate.js';
import { loadScenario } from './packages/core/dist/config/load.js';

const monetary = {
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

const result = simulate(
  loadScenario({
    seed: 1,
    ticks: 120,
    sliders: {
      'scale.households': 500,
      'scale.firms': 50,
      'scale.banks': 3,
      'shock.frequency': 0,
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
      ...monetary,
      'regime.type': 'fiat',
    },
  }),
);

console.log('Audit OK:', result.audit.ok);
const originations = result.metrics.series.mortgageOriginations;
console.log('Total originations:', originations.reduce((a, b) => a + b, 0));
console.log('Originations months 0-2:', originations.slice(0, 2).reduce((a, b) => a + b, 0));
console.log('Originations months 60-120:', originations.slice(60).reduce((a, b) => a + b, 0));
console.log('Sample months 60-70:', originations.slice(60, 70));
