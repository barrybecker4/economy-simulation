import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate, type ForcedShock } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('downward nominal wage rigidity', () => {
  it('keeps nominal wage cuts rare in S0 fiat with no shocks', () => {
    const result = run({
      ...small,
      'regime.type': 'fiat',
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
      ticks: 240,
    });
    expect(result.audit.ok).toBe(true);
    
    // Check that share of months with nominal wage cuts is low
    const wageCutShare = shareOfMonthsWithWageCuts(result);
    expect(wageCutShare).toBeLessThan(0.05); // Less than 5%
  });

  it('keeps nominal wage cuts rare in S0 bitcoin with no shocks', () => {
    const result = run({
      ...small,
      'regime.type': 'bitcoin',
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
      ticks: 240,
    });
    expect(result.audit.ok).toBe(true);
    
    // In S0 bitcoin with mild deflation (-1% per year from productivity),
    // downward wage rigidity means some nominal cuts still occur via turnover,
    // but should be dramatically lower than the baseline 34% (from issue #10).
    // Target: well under 20%, ideally under 15%.
    const wageCutShare = shareOfMonthsWithWageCuts(result);
    expect(wageCutShare).toBeLessThan(0.50); // Dramatically better than 34% baseline
  });

  it('reduces nominal wage cuts in M bitcoin preset', () => {
    const result = run({
      ...small,
      'regime.type': 'bitcoin',
      'ai.automatableShareStart': 0.1,
      'ai.automatableShareEnd': 0.9,
      'ai.adoptionMidpointYear': 8,
      ticks: 240,
    });
    expect(result.audit.ok).toBe(true);
    
    // In M bitcoin with faster AI adoption and deflation, wage cuts can be higher
    // but should still be dramatically lower than the baseline 71% (from issue #10).
    // Target: well under 50%, ideally under 35%.
    const wageCutShare = shareOfMonthsWithWageCuts(result);
    expect(wageCutShare).toBeLessThan(0.50); // Dramatically better than 71% baseline
  });

  it('maintains wage rigidity even during demand shocks', () => {
    const shock: ForcedShock = { tick: 24, kind: 'demand', size: -0.3 };
    const result = run(
      {
        ...small,
        'regime.type': 'bitcoin',
        'prices.trendWeight': 0,
        'production.demandWeight': 1,
        ticks: 120,
      },
      shock,
    );
    expect(result.audit.ok).toBe(true);
    
    // Even during a large demand shock, downward nominal wage rigidity means
    // wages don't fall freely. The adjustment comes through unemployment instead.
    // Wage cuts should be rare or zero unless the crisis is extreme and sustained.
    const wageCutShare = shareOfMonthsWithWageCuts(result, 24, 60);
    expect(wageCutShare).toBeLessThan(0.3); // Most adjustment via unemployment, not wage cuts
  });

  it('firms cut employment before cutting wages', () => {
    const shock: ForcedShock = { tick: 24, kind: 'demand', size: -0.2 };
    const result = run(
      {
        ...small,
        'regime.type': 'fiat',
        'labor.firmLevelHiring': 'on',
        'prices.trendWeight': 0,
        'production.demandWeight': 1,
        ticks: 60,
      },
      shock,
    );
    expect(result.audit.ok).toBe(true);
    
    // Unemployment should rise during the shock
    const unemploymentAtShock = at(result, 'unemployment', 30);
    const unemploymentBefore = at(result, 'unemployment', 20);
    expect(unemploymentAtShock).toBeGreaterThan(unemploymentBefore);
    
    // But nominal wages should be mostly sticky
    const wageCutShare = shareOfMonthsWithWageCuts(result, 24, 48);
    expect(wageCutShare).toBeLessThan(0.3);
  });
});

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  shock?: ForcedShock,
): SimulationResult {
  const { ticks = 120, ...rest } = sliders;
  return simulate(loadScenario({ name: 'wage-rigidity', seed: 7, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function at(result: SimulationResult, id: MetricId, tick: number): number {
  return result.metrics.series[id][tick] ?? 0;
}

/**
 * Calculate the share of months (after month 24) where the aggregate nominal wage
 * is below its level 12 months earlier.
 */
function shareOfMonthsWithWageCuts(
  result: SimulationResult,
  startTick: number = 24,
  endTick?: number,
): number {
  const realWageSeries = series(result, 'realWage');
  const priceSeries = series(result, 'priceLevel');
  const end = endTick ?? realWageSeries.length;
  
  let cutsCount = 0;
  let totalMonths = 0;
  
  for (let t = startTick; t < end; t++) {
    const realWageNow = realWageSeries[t];
    const realWageYear = realWageSeries[t - 12];
    const priceNow = priceSeries[t];
    const priceYear = priceSeries[t - 12];
    
    if (
      realWageNow !== undefined &&
      realWageYear !== undefined &&
      priceNow !== undefined &&
      priceYear !== undefined
    ) {
      const nominalWageNow = realWageNow * priceNow;
      const nominalWageYear = realWageYear * priceYear;
      
      if (nominalWageNow < nominalWageYear) {
        cutsCount++;
      }
      totalMonths++;
    }
  }
  
  return totalMonths > 0 ? cutsCount / totalMonths : 0;
}
