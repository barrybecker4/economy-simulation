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
    const series = result.metrics.series.mortgageOriginations;
    
    for (let tick = startTick; tick < Math.min(endTick, series.length); tick++) {
      totalOriginations += series[tick] ?? 0;
      months++;
    }
    
    return months > 0 ? (totalOriginations / months / households) * 12 : 0; // Annual rate
  }

  it('S0 fiat has steady-state originations near 3.3% per year across seeds', () => {
    const seeds = [1, 2, 3, 4, 5];
    const rates: number[] = [];
    const rentShares: number[] = [];
    const mortgageShares: number[] = [];
    
    for (const seed of seeds) {
      const result = simulate(
        loadScenario({
          name: 'S0-fiat-originations',
          seed,
          ticks: 240,
          sliders: {
            ...small,
            'regime.type': 'fiat',
            'ai.bullishness': 0,
          },
        }),
      );
      
      const households = 500;
      const steadyRate = measureOriginationRate(result, 12, 240, households);
      rates.push(steadyRate);
      
      const lastIdx = result.metrics.series.rentShare.length - 1;
      rentShares.push(result.metrics.series.rentShare[lastIdx] ?? 0);
      mortgageShares.push(result.metrics.series.mortgageShare[lastIdx] ?? 0);
    }
    
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const rentMean = rentShares.reduce((a, b) => a + b, 0) / rentShares.length;
    const mortgageMean = mortgageShares.reduce((a, b) => a + b, 0) / mortgageShares.length;
    
    console.log(`S0 fiat (5 seeds): mean ${(mean * 100).toFixed(2)}%, range [${(min * 100).toFixed(2)}%, ${(max * 100).toFixed(2)}%]`);
    console.log(`  Renter share: ${(rentMean * 100).toFixed(1)}%, Mortgage share: ${(mortgageMean * 100).toFixed(1)}%`);
    
    // Target: 2-5% per year as stated in issue acceptance criteria
    expect(mean).toBeGreaterThanOrEqual(0.02);
    expect(mean).toBeLessThanOrEqual(0.05);
    // With mobility, renters successfully originate mortgages, lowering renter share.
    // Mortgage share should remain plausible (real world: ~38% of households have mortgages)
    expect(mortgageMean).toBeGreaterThanOrEqual(0.30);
    expect(mortgageMean).toBeLessThanOrEqual(0.70);
  });

  it('S0 bitcoin has steady-state originations (lower due to deflation)', () => {
    const seeds = [1, 2, 3, 4, 5];
    const rates: number[] = [];
    
    for (const seed of seeds) {
      const result = simulate(
        loadScenario({
          name: 'S0-bitcoin-originations',
          seed,
          ticks: 240,
          sliders: {
            ...small,
            'regime.type': 'bitcoin',
            'ai.bullishness': 0,
          },
        }),
      );
      
      const households = 500;
      rates.push(measureOriginationRate(result, 12, 240, households));
    }
    
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    
    console.log(`S0 bitcoin (5 seeds): mean ${(mean * 100).toFixed(2)}%, range [${(min * 100).toFixed(2)}%, ${(max * 100).toFixed(2)}%]`);
    
    // Bitcoin has lower originations due to deflation penalty; still meaningful flow
    expect(mean).toBeGreaterThanOrEqual(0.01);
  });

  it('M fiat has steady-state originations near 3.3% per year across seeds', () => {
    const seeds = [1, 2, 3, 4, 5];
    const rates: number[] = [];
    const rentShares: number[] = [];
    const mortgageShares: number[] = [];
    
    for (const seed of seeds) {
      const result = simulate(
        loadScenario({
          name: 'M-fiat-originations',
          seed,
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
      rates.push(measureOriginationRate(result, 12, 240, households));
      
      const lastIdx = result.metrics.series.rentShare.length - 1;
      rentShares.push(result.metrics.series.rentShare[lastIdx] ?? 0);
      mortgageShares.push(result.metrics.series.mortgageShare[lastIdx] ?? 0);
    }
    
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const rentMean = rentShares.reduce((a, b) => a + b, 0) / rentShares.length;
    const mortgageMean = mortgageShares.reduce((a, b) => a + b, 0) / mortgageShares.length;
    
    console.log(`M fiat (5 seeds): mean ${(mean * 100).toFixed(2)}%, range [${(min * 100).toFixed(2)}%, ${(max * 100).toFixed(2)}%]`);
    console.log(`  Renter share: ${(rentMean * 100).toFixed(1)}%, Mortgage share: ${(mortgageMean * 100).toFixed(1)}%`);
    
    expect(mean).toBeGreaterThanOrEqual(0.02);
    expect(mean).toBeLessThanOrEqual(0.05);
    // Mortgage share should remain plausible
    expect(mortgageMean).toBeGreaterThanOrEqual(0.30);
    expect(mortgageMean).toBeLessThanOrEqual(0.70);
  });

  it('M bitcoin has steady-state originations (lower due to deflation)', () => {
    const seeds = [1, 2, 3, 4, 5];
    const rates: number[] = [];
    
    for (const seed of seeds) {
      const result = simulate(
        loadScenario({
          name: 'M-bitcoin-originations',
          seed,
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
      rates.push(measureOriginationRate(result, 12, 240, households));
    }
    
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    
    console.log(`M bitcoin (5 seeds): mean ${(mean * 100).toFixed(2)}%, range [${(min * 100).toFixed(2)}%, ${(max * 100).toFixed(2)}%]`);
    
    // Bitcoin has lower originations due to deflation penalty
    expect(mean).toBeGreaterThanOrEqual(0.01);
  });
});
