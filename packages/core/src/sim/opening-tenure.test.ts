import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { openingTenureQuotas } from './opening-tenure.js';
import { bankBalanceIdentity } from './stocks.js';
import { simulate } from './simulate.js';

const sized = {
  'scale.households': 1000,
  'scale.firms': 100,
  'scale.banks': 4,
  'shock.frequency': 0,
};

describe('opening housing tenure', () => {
  it('opens near the 2026 U.S. owner and renter shares when tenure choice is on', () => {
    const result = run({ ...sized, 'housing.tenureChoice': 'on', ticks: 1 });
    expect(result.audit.ok).toBe(true);
    expect(share(result, 'rentShare')).toBeCloseTo(0.345, 2);
    expect(share(result, 'mortgageShare') + share(result, 'ownedShare')).toBeCloseTo(0.655, 2);
    expect(share(result, 'mortgageShare')).toBeCloseTo(0.406, 2);
    expect(share(result, 'ownedShare')).toBeCloseTo(0.249, 2);
  });

  it('counts 655 owners per 1,000 households, 406 of them with a mortgage', () => {
    expect(openingTenureQuotas(1000, 0.655, 0.62)).toEqual({
      owned: 249,
      mortgage: 406,
      rent: 345,
    });
  });

  it('keeps the same opening mix on the monetary preset and a year later', () => {
    const sliders = {
      ...sized,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      'bank.depositPassThrough': 1,
      'expectations.anchorWeight': 0.5,
      'housing.tenureChoice': 'on',
      'credit.endogenousWeight': 1,
      'credit.leverageStart': 1,
      'bank.capitalRatio': 0.04,
      'household.openingDepositMonths': 12,
    };
    const opened = run({ ...sliders, ticks: 1 });
    const year = run({ ...sliders, ticks: 12 });
    const economy = createEconomy(
      loadParameters(loadScenario({ name: 'opening-tenure-preset', seed: 1, ticks: 1, sliders })),
      1,
      null,
    );
    expect(bankBalanceIdentity(economy)).toBeCloseTo(0, 6);
    expect(opened.audit.ok && year.audit.ok).toBe(true);
    expect(share(opened, 'rentShare')).toBeCloseTo(0.345, 2);
    expect(ownerShare(opened)).toBeCloseTo(0.655, 2);
    expect(ownerShare(year)).toBeGreaterThan(0.6);
    expect(lastShare(year, 'rentShare')).toBeLessThan(0.4);
  });

  it('leaves households without tenure or housing debt when tenure choice is off', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'opening-tenure-off',
          seed: 1,
          ticks: 1,
          sliders: sized,
        }),
      ),
      1,
      null,
    );
    expect(bankBalanceIdentity(economy)).toBeCloseTo(0, 6);
    expect(economy.households.every((household) => household.tenure === 'none')).toBe(true);
    expect(economy.households.every((household) => household.mortgage === 0)).toBe(true);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 1, ...rest } = sliders;
  return simulate(loadScenario({ name: 'opening-tenure', seed: 1, ticks, sliders: rest }));
}

function share(result: SimulationResult, id: MetricId): number {
  return result.metrics.series[id][0] ?? 0;
}

function lastShare(result: SimulationResult, id: MetricId): number {
  return result.metrics.series[id].at(-1) ?? 0;
}

function ownerShare(result: SimulationResult): number {
  return lastShare(result, 'mortgageShare') + lastShare(result, 'ownedShare');
}
