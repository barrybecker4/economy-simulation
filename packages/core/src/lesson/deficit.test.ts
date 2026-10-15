import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { deficitLessonSliders, DEFICIT_LESSON_SEED, DEFICIT_LESSON_TICKS } from './deficit.js';
import { householdGovernmentShare } from '../sim/spending.js';
import { simulate } from '../sim/simulate.js';

describe('household government share', () => {
  it('takes the purchase share from households when extra spending is not demand', () => {
    expect(
      householdGovernmentShare({ spendShare: 0.35, taxRate: 0.2, addsDemand: false }),
    ).toBeCloseTo(0.35, 12);
  });

  it('spends the deficit on top of after-tax income when extra spending is demand', () => {
    expect(
      householdGovernmentShare({ spendShare: 0.35, taxRate: 0.2, addsDemand: true }),
    ).toBeCloseTo(0.05, 12);
    expect(
      householdGovernmentShare({ spendShare: 0.2, taxRate: 0.2, addsDemand: true }),
    ).toBeCloseTo(0.2, 12);
  });
});

describe('deficit lesson', () => {
  const reallocationTarget = pair(false, false);
  const additiveTarget = pair(true, false);
  const reallocationDemand = pair(false, true);
  const additiveDemand = pair(true, true);

  it('issues bonds when purchases sit above taxes, in every lever combination', () => {
    for (const run of [reallocationTarget, additiveTarget, reallocationDemand, additiveDemand]) {
      expect(end(run.deficit, 'moneySupply')).toBeGreaterThan(
        end(run.balanced, 'moneySupply') * 1.05,
      );
    }
  });

  it('cuts household goods spending when the purchase share replaces that spending', () => {
    expect(mean(reallocationTarget.deficit, 'householdGoodsSpend')).toBeLessThan(
      mean(reallocationTarget.balanced, 'householdGoodsSpend') * 0.9,
    );
  });

  it('raises household goods spending when the deficit is extra demand', () => {
    for (const run of [additiveTarget, additiveDemand]) {
      expect(mean(run.deficit, 'householdGoodsSpend')).toBeGreaterThan(
        mean(run.balanced, 'householdGoodsSpend') * 1.05,
      );
      expect(goodsBought(run.deficit)).toBeGreaterThan(goodsBought(run.balanced) * 1.02);
    }
  });

  it('keeps prices on the target when posted prices ignore excess demand', () => {
    expect(priceRatio(reallocationTarget)).toBeGreaterThan(0.99);
    expect(priceRatio(reallocationTarget)).toBeLessThan(1.01);
    expect(priceRatio(additiveTarget)).toBeGreaterThan(0.99);
    expect(priceRatio(additiveTarget)).toBeLessThan(1.01);
  });

  it('raises prices only when the deficit adds demand and prices follow that demand', () => {
    expect(priceRatio(additiveDemand)).toBeGreaterThan(1.5);
    expect(priceRatio(reallocationDemand)).toBeLessThan(0.97);
    expect(priceRatio(reallocationDemand)).toBeLessThan(priceRatio(additiveDemand));
  });

  it('separates household spending by whether the deficit is extra demand', () => {
    const crowded = mean(reallocationTarget.deficit, 'householdGoodsSpend');
    const crowdedBase = mean(reallocationTarget.balanced, 'householdGoodsSpend');
    const added = mean(additiveTarget.deficit, 'householdGoodsSpend');
    const addedBase = mean(additiveTarget.balanced, 'householdGoodsSpend');
    expect(crowded / crowdedBase).toBeLessThan(0.95);
    expect(added / addedBase).toBeGreaterThan(1.15);
  });
});

interface Pair {
  balanced: SimulationResult;
  deficit: SimulationResult;
}

function pair(addsDemand: boolean, pricesFollowDemand: boolean): Pair {
  return {
    balanced: run(addsDemand, pricesFollowDemand, false),
    deficit: run(addsDemand, pricesFollowDemand, true),
  };
}

function run(addsDemand: boolean, pricesFollowDemand: boolean, deficit: boolean): SimulationResult {
  return simulate(
    loadScenario({
      name: 'deficit-lesson',
      seed: DEFICIT_LESSON_SEED,
      ticks: DEFICIT_LESSON_TICKS,
      sliders: deficitLessonSliders({ addsDemand, pricesFollowDemand, deficit }),
    }),
  );
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function end(result: SimulationResult, id: MetricId): number {
  const values = series(result, id);
  return values[values.length - 1] ?? 0;
}

function mean(result: SimulationResult, id: MetricId): number {
  const values = series(result, id);
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

function priceRatio(run: Pair): number {
  return end(run.deficit, 'priceLevel') / end(run.balanced, 'priceLevel');
}

function goodsBought(result: SimulationResult): number {
  return mean(result, 'householdGoodsSpend') + mean(result, 'govGoodsSpend');
}
