import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate, type ForcedShock } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const TARGET = 0.02;

describe('phase 2 fiat economy', () => {
  it('stays stable and finishes a development-size run', () => {
    const started = performance.now();
    const result = run({
      seed: 1,
      ticks: 600,
      sliders: { 'shock.frequency': 0, 'centralBank.moneyGrowth': 0.05 },
    });
    const elapsed = performance.now() - started;
    expect(result.audit.ok, 'seed 1 ledger').toBe(true);
    const unemployment = series(result, 'unemployment');
    const inflation = series(result, 'inflation');
    const prices = series(result, 'priceLevel');
    const output = series(result, 'realGdp');
    const money = series(result, 'moneySupply');
    expect(unemployment[unemployment.length - 1] ?? 0, 'seed 1 end unemployment').toBeGreaterThan(
      0.06,
    );
    for (const [index, value] of inflation.entries()) {
      expect(Math.abs(value - TARGET), `seed 1 inflation at tick ${index}`).toBeLessThanOrEqual(
        0.02,
      );
    }
    expect(finite(output) && finite(prices) && finite(money), 'seed 1 bounded').toBe(true);
    const price0 = prices[0] ?? 1;
    const price1 = prices[prices.length - 1] ?? price0;
    const money0 = money[0] ?? 1;
    const money1 = money[money.length - 1] ?? money0;
    const output0 = output[0] ?? 1;
    const output1 = output[output.length - 1] ?? output0;
    expect(price1 / price0, 'seed 1 price path').toBeLessThan(4);
    expect(money1 / money0, 'seed 1 money path').toBeLessThan(4);
    expect(output1 / output0, 'seed 1 output path').toBeGreaterThan(1.2);
    expect(output1 / output0, 'seed 1 output path').toBeLessThan(5);

    expect(elapsed, 'development-size run').toBeLessThan(45000);
  }, 60_000);

  it('keeps unemployment near 6 percent when the automatable share does not rise', () => {
    const result = run({
      seed: 1,
      ticks: 120,
      sliders: {
        'shock.frequency': 0,
        'ai.automatableShareStart': 0.3,
        'ai.automatableShareEnd': 0.3,
        'scale.households': 200,
        'scale.firms': 20,
        'scale.banks': 1,
      },
    });
    const unemployment = series(result, 'unemployment');
    expect(Math.min(...unemployment)).toBeGreaterThanOrEqual(0.03);
    expect(Math.max(...unemployment)).toBeLessThanOrEqual(0.12);
    const last = unemployment.length - 1;
    const wealth = series(result, 'giniWealth')[last] ?? 0;
    const income = series(result, 'giniIncome')[last] ?? 0;
    const skill = series(result, 'giniSkill')[last] ?? 0;
    expect(wealth, 'wealth gini').toBeGreaterThan(income);
    expect(income, 'income gini').toBeGreaterThan(skill);
  });

  it('follows a credit expansion with a contraction of the same length', () => {
    const seed = 4;
    const shockTick = 18;
    const result = run({
      seed,
      ticks: 60,
      shock: { tick: shockTick, kind: 'credit', size: 0.3 },
      sliders: { 'shock.frequency': 0, 'scale.households': 80, 'scale.firms': 8, 'scale.banks': 1 },
    });
    expect(result.audit.ok, `seed ${seed} ledger`).toBe(true);
    const credit = series(result, 'creditToGdp');
    const start = credit[shockTick] ?? 0;
    const peak = credit[shockTick + 11] ?? 0;
    const end = credit[shockTick + 23] ?? 0;
    expect(peak, `seed ${seed} credit peak`).toBeGreaterThan(start * 1.02);
    expect(end, `seed ${seed} credit contraction`).toBeLessThan(peak);
    const boom = series(result, 'boomLength');
    const bust = series(result, 'bustLength');
    const boomEnd = boom[boom.length - 1] ?? 0;
    const bustEnd = bust[bust.length - 1] ?? 0;
    expect(boomEnd, `seed ${seed} boom`).toBe(bustEnd);
    expect(boomEnd, `seed ${seed} boom length`).toBeGreaterThan(0);
  });

  it('raises inflation and lowers unemployment after a demand shock when wages are sticky', () => {
    const seed = 9;
    const result = run({
      seed,
      ticks: 48,
      shock: { tick: 24, kind: 'demand', size: 0.1 },
      sliders: {
        'shock.frequency': 0,
        'wage.nominalRigidity': 0.9,
        'scale.households': 100,
        'scale.firms': 10,
        'scale.banks': 1,
      },
    });
    const unemployment = series(result, 'unemployment');
    const inflation = series(result, 'inflation');
    const beforeU = average(unemployment.slice(12, 24));
    const duringU = average(unemployment.slice(24, 36));
    const beforePi = average(inflation.slice(12, 24));
    const duringPi = average(inflation.slice(30, 42));
    expect(duringU, `seed ${seed} unemployment`).toBeLessThan(beforeU - 0.01);
    expect(duringPi, `seed ${seed} inflation`).toBeGreaterThan(beforePi + 0.005);
  });

  it('raises output and lowers prices after a productivity shock', () => {
    const seed = 5;
    const sliders = {
      'shock.frequency': 0,
      'scale.households': 80,
      'scale.firms': 8,
      'scale.banks': 1,
    };
    const calm = run({ seed, ticks: 48, sliders });
    const shocked = run({
      seed,
      ticks: 48,
      sliders,
      shock: { tick: 24, kind: 'productivity', size: 0.1 },
    });
    const calmOutput = average(series(calm, 'realGdp').slice(24, 36));
    const shockedOutput = average(series(shocked, 'realGdp').slice(24, 36));
    const calmPrice = average(series(calm, 'priceLevel').slice(30, 42));
    const shockedPrice = average(series(shocked, 'priceLevel').slice(30, 42));
    expect(shockedOutput, `seed ${seed} output`).toBeGreaterThan(calmOutput);
    expect(shockedPrice, `seed ${seed} price`).toBeLessThan(calmPrice);
  });

  it('fails fewer banks when the capital ratio is higher', () => {
    const seed = 6;
    const base = {
      seed,
      ticks: 40,
      shock: { tick: 6, kind: 'credit' as const, size: 0.2 },
      sliders: {
        'shock.frequency': 0,
        'scale.households': 60,
        'scale.firms': 6,
        'scale.banks': 1,
      },
    };
    const fragile = run({ ...base, sliders: { ...base.sliders, 'bank.capitalRatio': 0.04 } });
    const sturdy = run({ ...base, sliders: { ...base.sliders, 'bank.capitalRatio': 0.2 } });
    const fragileFailures = series(fragile, 'bankFailures').at(-1) ?? 0;
    const sturdyFailures = series(sturdy, 'bankFailures').at(-1) ?? 0;
    expect(fragile.audit.ok && sturdy.audit.ok, `seed ${seed} ledger`).toBe(true);
    expect(fragileFailures, `seed ${seed} low capital`).toBeGreaterThan(sturdyFailures);
  });
});

function run(options: {
  seed: number;
  ticks: number;
  sliders?: Record<string, number | string>;
  shock?: ForcedShock;
}): SimulationResult {
  return simulate(
    loadScenario({
      name: 'phase-2',
      seed: options.seed,
      ticks: options.ticks,
      sliders: { ...FEATURE_OFF, 'shock.frequency': 0, ...options.sliders },
    }),
    options.shock ?? null,
  );
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function finite(values: number[]): boolean {
  return values.every((value) => Number.isFinite(value));
}
