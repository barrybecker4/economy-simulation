import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { goodsBudget } from './spending.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phases 43–50 mechanisms', () => {
  it('cuts consumer borrowing when rate transmission is positive', () => {
    const none = run({
      ...small,
      'regime.type': 'fiat',
      'housing.tenureChoice': 'on',
      'housing.openingOwnerShare': 0,
      'housing.mortgageLtv': 0.5,
      'credit.rateTransmission': 0,
      'household.timePreferenceMean': 0.15,
      'centralBank.inflationTarget': 0,
      ticks: 36,
    });
    const tight = run({
      ...small,
      'regime.type': 'fiat',
      'housing.tenureChoice': 'on',
      'housing.openingOwnerShare': 0,
      'housing.mortgageLtv': 0.5,
      'credit.rateTransmission': 1,
      'household.timePreferenceMean': 0.15,
      'centralBank.inflationTarget': 0,
      ticks: 36,
    });
    expect(mean(series(tight, 'newConsumerBorrowing'))).toBeLessThan(
      mean(series(none, 'newConsumerBorrowing')),
    );
  });

  it('makes transition length matter when gradual weight is positive', () => {
    const short = run({
      ...small,
      'transition.lengthMonths': 1,
      'transition.gradualWeight': 1,
      'transition.holderConcentration': 0.99,
      ticks: 24,
    });
    const long = run({
      ...small,
      'transition.lengthMonths': 12,
      'transition.gradualWeight': 1,
      'transition.holderConcentration': 0.99,
      ticks: 24,
    });
    expect(series(short, 'giniWealth')).not.toEqual(series(long, 'giniWealth'));
  });

  it('moves the bitcoin price when market price weight is positive', () => {
    const flat = run({
      ...small,
      'regime.type': 'bitcoin',
      'bitcoin.marketPriceWeight': 0,
      ticks: 36,
    });
    const market = run({
      ...small,
      'regime.type': 'bitcoin',
      'bitcoin.marketPriceWeight': 1,
      'money.bitcoinTrust': 1,
      ticks: 36,
    });
    expect(series(market, 'bitcoinPrice').at(-1)).not.toEqual(series(flat, 'bitcoinPrice').at(-1));
  });

  it('delays durables when the real return is positive', () => {
    const full = goodsBudget({
      smoothed: 100,
      income: 100,
      deposit: 100,
      spendingShare: 0.7,
      demandFactor: 1,
      realReturn: 0.1,
      realReturnSensitivity: 0,
      floorShare: 0.5,
      durableShare: 0,
    });
    const delayed = goodsBudget({
      smoothed: 100,
      income: 100,
      deposit: 100,
      spendingShare: 0.7,
      demandFactor: 1,
      realReturn: 0.1,
      realReturnSensitivity: 0,
      floorShare: 0.5,
      durableShare: 0.4,
    });
    expect(delayed).toBeLessThan(full);
  });

  it('raises productivity more when endogenous weight and utilization are high', () => {
    const fixed = run({
      ...small,
      'regime.type': 'fiat',
      'productivity.endogenousWeight': 0,
      ticks: 60,
    });
    const endogenous = run({
      ...small,
      'regime.type': 'fiat',
      'productivity.endogenousWeight': 1,
      ticks: 60,
    });
    expect(series(endogenous, 'productivityPerHuman').at(-1) ?? 0).not.toEqual(
      series(fixed, 'productivityPerHuman').at(-1) ?? 0,
    );
  });

  it('keeps first-household bequests as the neutral exit rule', () => {
    const a = run({
      ...small,
      'population.growth': 0.02,
      'population.bequests': 'firstHousehold',
      ticks: 48,
    });
    const b = run({
      ...small,
      'population.growth': 0.02,
      ticks: 48,
    });
    expect(series(a, 'moneySupply')).toEqual(series(b, 'moneySupply'));
  });

  it('raises wealth Gini under concentrated AI ownership on the monetary preset', () => {
    const result = run({
      ...small,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      'bank.depositPassThrough': 1,
      'housing.tenureChoice': 'on',
      'household.openingDepositMonths': 12,
      'equity.marketOn': 'on',
      'ai.ownershipConcentration': 0.99,
      'ai.automatableShareStart': 0.1,
      'ai.automatableShareEnd': 0.9,
      'ai.bullishness': 1,
      ticks: 120,
    });
    expect(series(result, 'giniWealth').at(-1) ?? 0).toBeGreaterThan(0.35);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase43to50', seed: 5, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}
