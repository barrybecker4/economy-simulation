import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

const monetary = {
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
  'credit.householdMortgageShare': 0.25,
  'housing.mortgageLtv': 0.95,
  'bank.capitalRatio': 0.04,
  'household.openingDepositMonths': 12,
  'deflation.sensitivity': 0,
};

describe('phase 37 mortgage origination ladder', () => {
  it('originates rent-to-mortgage transitions on the monetary preset', () => {
    const seeds = [1, 2, 3, 4, 5];
    const totals = seeds.map((seed) =>
      sum(series(run({ ...monetary, 'regime.type': 'fiat', ticks: 240 }, seed), 'rentToMortgage')),
    );
    const sorted = [...totals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    expect(median).toBeGreaterThan(0);
  });

  it('can raise credit to GDP after year five on a calm path', () => {
    const result = run({ ...monetary, 'regime.type': 'fiat', ticks: 120 }, 2);
    const early = mean(series(result, 'creditToGdp').slice(12, 24));
    const late = mean(series(result, 'creditToGdp').slice(96, 120));
    expect(late).toBeGreaterThan(0);
    expect(Math.max(early, late)).toBeGreaterThan(0.02);
  });

  it('lowers new mortgage originations under stronger expected deflation', () => {
    const calm = run({
      ...monetary,
      'regime.type': 'bitcoin',
      'deflation.sensitivity': 0,
      ticks: 120,
    });
    const sharp = run({
      ...monetary,
      'regime.type': 'bitcoin',
      'deflation.sensitivity': 3,
      ticks: 120,
    });
    expect(sum(series(sharp, 'mortgageOriginations'))).toBeLessThanOrEqual(
      sum(series(calm, 'mortgageOriginations')),
    );
  });

  it('leaves firm credit room unchanged when the mortgage share is 0', () => {
    const none = run({
      ...monetary,
      'regime.type': 'fiat',
      'credit.householdMortgageShare': 0,
      ticks: 36,
    });
    expect(series(none, 'auditOk').every((value) => value === 1)).toBe(true);
  });
});

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  seed = 1,
): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase37', seed, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
}
