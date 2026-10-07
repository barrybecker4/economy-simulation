import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { SimulationResult } from '../engine/engine.js';
import type { MetricId } from '../metrics/metrics.js';
import { simulate, type ForcedShock } from './simulate.js';

const scale = {
  'scale.households': 80,
  'scale.firms': 8,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('payment flows', () => {
  it('pays wages and profits that sum to household income before the grant', () => {
    const result = run({ ...scale, 'government.ubiShare': 0 });
    const wages = series(result, 'wageBill');
    const profits = series(result, 'profitPaid');
    const incomes = series(result, 'meanRealIncome');
    for (let index = 0; index < wages.length; index += 1) {
      const wage = wages[index] ?? 0;
      const profit = profits[index] ?? 0;
      expect(wage + profit).toBeGreaterThan(0);
    }
    // Mean real income is wages+profits (+grant) over CPI and households.
    // With UBI off, wages + profits equal total household income each tick.
    const cpi = series(result, 'priceLevel');
    for (let index = 0; index < wages.length; index += 1) {
      const total = (wages[index] ?? 0) + (profits[index] ?? 0);
      const meanReal = incomes[index] ?? 0;
      const price = Math.max(cpi[index] ?? 1, 1);
      expect(meanReal * price * 80).toBeCloseTo(total, 0);
    }
  });

  it('keeps agent sales, fees, goods, tax, and sweeps at zero when autonomy ends at zero', () => {
    const result = run({ ...scale, 'ai.ownerShareCeiling': 0 });
    for (const id of [
      'agentVolume',
      'agentFees',
      'agentGoodsSpend',
      'agentTaxRevenue',
      'agentSweep',
    ] as const) {
      expect(
        series(result, id).every((value) => value === 0),
        id,
      ).toBe(true);
    }
  });

  it('records a forced demand, credit, and productivity impulse', () => {
    const demand = runShock({ tick: 24, kind: 'demand', size: 0.15 });
    const credit = runShock({ tick: 24, kind: 'credit', size: 0.2 });
    const productivity = runShock({ tick: 24, kind: 'productivity', size: 0.1 });
    expect(series(demand, 'demandImpulse')[24]).toBeCloseTo(0.15, 10);
    expect(series(credit, 'creditImpulse')[24]).toBeCloseTo(0.2, 10);
    expect(series(productivity, 'productivityImpulse')[24]).toBeCloseTo(0.1, 10);
    expect(series(demand, 'creditImpulse')[24]).toBe(0);
    expect(series(demand, 'productivityImpulse')[24]).toBe(0);
  });
});

describe('household census', () => {
  it('keeps wealth quintile shares summing to one', () => {
    const result = run(scale);
    const q1 = series(result, 'wealthQuintile1');
    const q2 = series(result, 'wealthQuintile2');
    const q3 = series(result, 'wealthQuintile3');
    const q4 = series(result, 'wealthQuintile4');
    const q5 = series(result, 'wealthQuintile5');
    for (let index = 0; index < q1.length; index += 1) {
      const sum =
        (q1[index] ?? 0) +
        (q2[index] ?? 0) +
        (q3[index] ?? 0) +
        (q4[index] ?? 0) +
        (q5[index] ?? 0);
      expect(sum).toBeCloseTo(1, 10);
    }
  });

  it('keeps job shares summing to one', () => {
    const result = run(scale);
    const unemployed = series(result, 'jobUnemployedShare');
    const small = series(result, 'jobSmallFirmShare');
    const large = series(result, 'jobLargeFirmShare');
    for (let index = 0; index < unemployed.length; index += 1) {
      expect((unemployed[index] ?? 0) + (small[index] ?? 0) + (large[index] ?? 0)).toBeCloseTo(
        1,
        10,
      );
    }
  });

  it('leaves owner wealth share at zero when autonomy is off', () => {
    const result = run({ ...scale, 'ai.ownerShareCeiling': 0 });
    expect(series(result, 'ownerWealthShare').every((value) => value === 0)).toBe(true);
  });
});

function run(sliders: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'flows', seed: 11, ticks: 60, sliders }));
}

function runShock(shock: ForcedShock): SimulationResult {
  return simulate(
    loadScenario({
      name: 'flows-shock',
      seed: 11,
      ticks: 48,
      sliders: { ...scale },
    }),
    shock,
  );
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
