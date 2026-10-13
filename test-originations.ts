import { loadScenario, simulate } from '@economy-simulation/core';

// Test script to measure mortgage originations
function testOriginations(name: string, sliders: Record<string, number | string>, seeds: number[]) {
  console.log(`\n=== ${name} ===`);
  
  for (const seed of seeds) {
    const config = loadScenario({
      name: `test-${name}`,
      seed,
      ticks: 240, // 20 years
      sliders: {
        ...sliders,
        'shock.frequency': 0,
        'housing.tenureChoice': 'on',
      },
    });
    
    const result = simulate(config);
    const households = sliders['scale.households'] as number || 4000;
    
    // Calculate originations per household per year for years 2-20
    let totalOriginations = 0;
    let months = 0;
    
    for (let tick = 12; tick < 240; tick++) {
      const originations = result.metrics[tick].mortgageOriginations ?? 0;
      totalOriginations += originations;
      months++;
    }
    
    const annualOriginationRate = (totalOriginations / months) * 12 / households;
    const year1Originations = result.metrics.slice(0, 12).reduce((sum, m) => sum + (m.mortgageOriginations ?? 0), 0);
    const year1Rate = year1Originations / 12 / households * 12;
    
    console.log(`Seed ${seed}: Year 1: ${(year1Rate * 100).toFixed(2)}%, Years 2-20: ${(annualOriginationRate * 100).toFixed(2)}%`);
  }
}

// Test S0 (slow-adoption/no-ai) fiat
testOriginations('S0 fiat', {
  'regime.type': 'fiat',
  'ai.automatableShareStart': 0.1,
  'ai.automatableShareEnd': 0.1,
  'scale.households': 500,
  'scale.firms': 50,
  'scale.banks': 3,
}, [1, 2, 3]);

// Test S0 bitcoin
testOriginations('S0 bitcoin', {
  'regime.type': 'bitcoin',
  'ai.automatableShareStart': 0.1,
  'ai.automatableShareEnd': 0.1,
  'scale.households': 500,
  'scale.firms': 50,
  'scale.banks': 3,
}, [1, 2, 3]);

// Test M (modest-dividend) fiat  
testOriginations('M fiat', {
  'regime.type': 'fiat',
  'centralBank.bondPurchaseShare': 0.5,
  'government.ubiShare': 0.75,
  'tax.incomeRate': 0.35,
  'scale.households': 500,
  'scale.firms': 50,
  'scale.banks': 3,
}, [1, 2, 3]);

// Test M bitcoin
testOriginations('M bitcoin', {
  'regime.type': 'bitcoin',
  'centralBank.bondPurchaseShare': 0.5,
  'government.ubiShare': 0.75,
  'tax.incomeRate': 0.35,
  'scale.households': 500,
  'scale.firms': 50,
  'scale.banks': 3,
}, [1, 2, 3]);
