import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const monetary = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'prices.trendWeight': 0,
  'production.demandWeight': 1,
  'bank.depositPassThrough': 1,
  'expectations.anchorWeight': 0.5,
  'housing.tenureChoice': 'on',
  'credit.endogenousWeight': 1,
  'credit.leverageStart': 1,
  'household.openingDepositMonths': 12,
  'regime.type': 'fiat',
};

describe('phase 41 defaults, idle money, and inflation pursuit', () => {
  it('raises velocity when opening deposits are shorter', () => {
    const thick = run({
      ...monetary,
      'household.openingDepositMonths': 36,
      'centralBank.spendNewMoney': 0,
      ticks: 36,
    });
    const thin = run({ ...monetary, 'household.openingDepositMonths': 12, ticks: 36 });
    expect(mean(series(thin, 'velocity'))).toBeGreaterThan(mean(series(thick, 'velocity')));
  });

  it('spends new money with thick opening deposits when spendNewMoney is positive', () => {
    const hoard = run({
      ...monetary,
      'household.openingDepositMonths': 36,
      'centralBank.spendNewMoney': 0,
      ticks: 48,
    });
    const spend = run({
      ...monetary,
      'household.openingDepositMonths': 36,
      'centralBank.spendNewMoney': 1,
      ticks: 48,
    });
    expect(mean(series(spend, 'householdGoodsSpend').slice(12))).toBeGreaterThan(
      mean(series(hoard, 'householdGoodsSpend').slice(12)),
    );
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase41', seed: 2, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}
