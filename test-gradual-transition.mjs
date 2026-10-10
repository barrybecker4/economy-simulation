// Test M bitcoin gradual transition
import { simulate } from './packages/core/dist/sim/simulate.js';
import { loadScenario } from './packages/core/dist/config/load.js';

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

console.log('Testing M bitcoin gradual transition (seed 1)...');
try {
  const result = simulate(
    loadScenario({
      seed: 1,
      ticks: 180,
      sliders: {
        'ai.automatableShareStart': 0.3,
        'ai.automatableShareEnd': 0.3,
        'scale.households': 500,
        'scale.firms': 50,
        'scale.banks': 3,
        'shock.frequency': 0,
        ...MONETARY,
        'regime.type': 'fiat',
        'transition.lengthMonths': 12,
        'transition.holderConcentration': 0.5,
        'transition.gradualWeight': 1,
        'transition.debtHaircut': 0.3,
      },
    }),
  );
  
  console.log('✓ Run completed successfully');
  console.log(`  Audit OK: ${result.audit.ok}`);
  if (result.metrics && result.metrics.series && result.metrics.series.tick) {
    console.log(`  Final tick: ${result.metrics.series.tick[result.metrics.series.tick.length - 1]}`);
  }
  
  if (!result.audit.ok) {
    console.log(`  Audit message: ${result.audit.message}`);
  }
} catch (error) {
  console.log(`✗ Run crashed: ${error.message}`);
  process.exit(1);
}
