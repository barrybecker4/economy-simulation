import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { onGoods } from './goods.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { rationScale } from './rationing.js';

describe('scarce goods rationing', () => {
  it('scales budgets when desired spend exceeds stock value', () => {
    expect(rationScale(100, 40)).toBeCloseTo(0.4, 12);
    expect(rationScale(50, 80)).toBe(1);
    expect(rationScale(0, 10)).toBe(1);
  });

  it('gives every household some goods when inventory is scarce', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'ration',
          seed: 2,
          ticks: 1,
          sliders: {
            ...FEATURE_OFF,
            'scale.households': 20,
            'scale.firms': 4,
            'scale.banks': 1,
            'regime.type': 'fiat',
            'prices.trendWeight': 0,
            'production.demandWeight': 1,
          },
        }),
      ),
      2,
      null,
    );
    for (const firm of economy.firms) {
      firm.inventory = 0.5;
      firm.price = 100;
    }
    for (const household of economy.households) {
      household.deposit = 50_000;
      household.smoothed = 10_000;
      household.income = 5_000;
    }
    onGoods(economy);
    const buyers = economy.households.filter((household) => household.realConsumption > 0);
    expect(buyers.length).toBe(economy.households.length);
    expect(economy.unmetGoodsDemand).toBeGreaterThan(0);
  });

  it('keeps zero-consumption months rare under demand-led monetary settings', () => {
    const result = run({
      ...FEATURE_OFF,
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
      'shock.frequency': 0,
      'regime.type': 'fiat',
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      'bank.depositPassThrough': 1,
      'household.openingDepositMonths': 12,
      'labor.firmLevelHiring': 'on',
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);
    const consumption = series(result, 'medianRealConsumption');
    const zeroMonths = consumption.filter((value) => value <= 0.01).length;
    expect(zeroMonths).toBeLessThan(5);
  });

  it('cuts the price level when inventory piles up against soft demand', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'stock-pile',
          seed: 3,
          ticks: 1,
          sliders: {
            ...FEATURE_OFF,
            'scale.households': 20,
            'scale.firms': 4,
            'scale.banks': 1,
            'regime.type': 'fiat',
            'prices.trendWeight': 0,
            'production.demandWeight': 1,
          },
        }),
      ),
      3,
      null,
    );
    for (const firm of economy.firms) {
      firm.inventory = 500;
      firm.price = 100;
    }
    for (const household of economy.households) {
      household.deposit = 50;
      household.smoothed = 20;
      household.income = 20;
    }
    economy.priceLevel = 100;
    const before = economy.priceLevel;
    onGoods(economy);
    expect(economy.priceLevel).toBeLessThan(before);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'ration-run', seed: 7, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
