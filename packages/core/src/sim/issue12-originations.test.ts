import { describe, expect, it } from 'vitest';
import { simulate } from './simulate.js';
import { loadScenario } from '../config/load.js';
import { FEATURE_OFF } from './feature-off.js';

// Test for GitHub issue #12: mortgage originations should be ~3.3% of households/year
describe('issue #12 mortgage origination rates', () => {
  const small = {
    ...FEATURE_OFF,
    'scale.households': 500,
    'scale.firms': 50,
    'scale.banks': 3,
    'shock.frequency': 0,
    'housing.tenureChoice': 'on',
  };

  function measureOriginationRate(result: ReturnType<typeof simulate>, startTick: number, endTick: number, households: number): number {
    let totalOriginations = 0;
    let months = 0;
    
    for (let tick = startTick; tick < Math.min(endTick, result.metrics.length); tick++) {
      totalOriginations += result.metrics[tick]?.mortgageOriginations ?? 0;
      months++;
    }
    
    return months > 0 ? (totalOriginations / months / households) * 12 : 0; // Annual rate
  }

  it('S0 fiat has steady-state originations near 3.3% per year', () => {
    const result = simulate(
      loadScenario({
        name: 'S0-fiat-originations',
        seed: 1,
        ticks: 240,
        sliders: {
          ...small,
          'regime.type': 'fiat',
          'ai.bullishness': 0,
        },
      }),
    );
    
    const households = 500;
    const year1Rate = measureOriginationRate(result, 0, 12, households);
    const steadyRate = measureOriginationRate(result, 12, 240, households);
    
    console.log(`S0 fiat: Year 1: ${(year1Rate * 100).toFixed(2)}%, Years 2-20: ${(steadyRate * 100).toFixed(2)}%`);
    const lastMetric = result.metrics[result.metrics.length - 1];
    console.log(`  Rent share: ${(lastMetric?.rentShare ?? 0).toFixed(3)}, Owned share: ${(lastMetric?.ownedShare ?? 0).toFixed(3)}, Mortgage share: ${(lastMetric?.mortgageShare ?? 0).toFixed(3)}`);
    
    // Target: 2-5% per year as stated in issue acceptance criteria
    expect(steadyRate).toBeGreaterThanOrEqual(0.02);
    expect(steadyRate).toBeLessThanOrEqual(0.05);
  });

  it('S0 bitcoin has steady-state originations with documented expectation', () => {
    const result = simulate(
      loadScenario({
        name: 'S0-bitcoin-originations',
        seed: 1,
        ticks: 240,
        sliders: {
          ...small,
          'regime.type': 'bitcoin',
          'ai.bullishness': 0,
        },
      }),
    );
    
    const households = 500;
    const steadyRate = measureOriginationRate(result, 12, 240, households);
    
    console.log(`S0 bitcoin: Years 2-20: ${(steadyRate * 100).toFixed(2)}%`);
    
    // Bitcoin may be lower due to deflation penalty, but should still have meaningful flow
    expect(steadyRate).toBeGreaterThanOrEqual(0.01);
  });

  it('M fiat has steady-state originations near 3.3% per year', () => {
    const result = simulate(
      loadScenario({
        name: 'M-fiat-originations',
        seed: 1,
        ticks: 240,
        sliders: {
          ...small,
          'regime.type': 'fiat',
          'centralBank.bondPurchaseShare': 0.5,
          'government.ubiShare': 0.75,
          'tax.incomeRate': 0.35,
        },
      }),
    );
    
    const households = 500;
    const steadyRate = measureOriginationRate(result, 12, 240, households);
    
    console.log(`M fiat: Years 2-20: ${(steadyRate * 100).toFixed(2)}%`);
    
    expect(steadyRate).toBeGreaterThanOrEqual(0.02);
    expect(steadyRate).toBeLessThanOrEqual(0.05);
  });

  it('M bitcoin has steady-state originations with documented expectation', () => {
    const result = simulate(
      loadScenario({
        name: 'M-bitcoin-originations',
        seed: 1,
        ticks: 240,
        sliders: {
          ...small,
          'regime.type': 'bitcoin',
          'centralBank.bondPurchaseShare': 0.5,
          'government.ubiShare': 0.75,
          'tax.incomeRate': 0.35,
        },
      }),
    );
    
    const households = 500;
    const steadyRate = measureOriginationRate(result, 12, 240, households);
    
    console.log(`M bitcoin: Years 2-20: ${(steadyRate * 100).toFixed(2)}%`);
    
    expect(steadyRate).toBeGreaterThanOrEqual(0.01);
  });
});
