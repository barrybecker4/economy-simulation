import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { expectedMortgageBurden, tenureFromBurdens } from './contracts.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 12 household tenure and credit', () => {
  it('picks the tenure with the lowest expected real burden', () => {
    expect(tenureFromBurdens({ rent: 10, mortgage: 8, owned: 12 })).toBe('mortgage');
    expect(tenureFromBurdens({ rent: 5, mortgage: 8, owned: 12 })).toBe('rent');
    expect(tenureFromBurdens({ rent: 10, mortgage: 8, owned: 4 })).toBe('owned');
    expect(expectedMortgageBurden(100, 0.05, 30)).toBeGreaterThan(
      expectedMortgageBurden(100, 0, 30),
    );
  });

  it('matches phase 11 when tenure choice is off', () => {
    const baseline = run({ ...small });
    const tagged = run({ ...small, 'housing.tenureChoice': 'off' });
    expect(baseline.audit.ok && tagged.audit.ok).toBe(true);
    expect(series(baseline, 'creditToGdp')).toEqual(series(tagged, 'creditToGdp'));
    expect(series(baseline, 'nonMortgageHousingShare')).toEqual(
      series(tagged, 'nonMortgageHousingShare'),
    );
    expect(series(baseline, 'householdGoodsSpend')).toEqual(series(tagged, 'householdGoodsSpend'));
  });

  it('cuts mortgages and consumer credit under stronger deflation while keeping the floor', () => {
    const mild = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.tenureChoice': 'on',
      'deflation.sensitivity': 0,
      ticks: 60,
    });
    const sharp = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.tenureChoice': 'on',
      'deflation.sensitivity': 5,
      ticks: 60,
    });
    expect(mild.audit.ok && sharp.audit.ok).toBe(true);
    expect(series(sharp, 'mortgageShare').at(-1) ?? 0).toBeLessThanOrEqual(
      series(mild, 'mortgageShare').at(-1) ?? 0,
    );
    expect(mean(series(sharp, 'newConsumerBorrowing'))).toBeLessThan(
      mean(series(mild, 'newConsumerBorrowing')),
    );
    expect(mean(series(sharp, 'householdGoodsSpend'))).toBeGreaterThan(0);
  });

  it('keeps the ledger balanced with household loans in both units', () => {
    const fiat = run({ ...small, 'housing.tenureChoice': 'on', ticks: 36 });
    const bitcoin = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.tenureChoice': 'on',
      ticks: 36,
    });
    expect(fiat.audit.ok && bitcoin.audit.ok).toBe(true);
    expect(series(fiat, 'auditOk').every((value) => value === 1)).toBe(true);
    expect(series(bitcoin, 'auditOk').every((value) => value === 1)).toBe(true);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase12', seed: 2, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
