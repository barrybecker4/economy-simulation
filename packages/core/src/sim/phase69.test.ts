import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { growFiatMoney, stimulusPressure } from './central-bank.js';
import { FEATURE_OFF } from './feature-off.js';
import { separate } from './helpers.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate, type ForcedShock } from './simulate.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

const contraction: ForcedShock = { tick: 12, kind: 'demand', size: -0.25 };
const lag = 6;

describe('phase 69 observed crisis stimulus', () => {
  it('allows stimulus 0 and still rejects a zero money-growth weight', () => {
    expect(() =>
      loadScenario({
        name: 'phase69',
        seed: 1,
        ticks: 1,
        sliders: { 'centralBank.stimulus': 0 },
      }),
    ).not.toThrow();
    expect(() =>
      loadScenario({
        name: 'phase69',
        seed: 1,
        ticks: 1,
        sliders: { 'centralBank.moneyGrowth': 0 },
      }),
    ).toThrow(/between/);
  });

  it('matches a calm fiat money path at stimulus 0 and stimulus 1', () => {
    const off = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.stimulus': 0,
      ticks: 48,
    });
    const on = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.stimulus': 1,
      ticks: 48,
    });
    expect(off.audit.ok && on.audit.ok).toBe(true);
    expect(series(off, 'moneySupply')).toEqual(series(on, 'moneySupply'));
  });

  it('raises money supply after the lag under a forced demand contraction', () => {
    const shared = {
      ...small,
      'regime.type': 'fiat' as const,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      'centralBank.stimulusLag': lag,
      'centralBank.moneyGrowth': 0.05,
      ticks: 36,
    };
    const stimulated = run({ ...shared, 'centralBank.stimulus': 1 }, contraction);
    const quiet = run({ ...shared, 'centralBank.stimulus': 0 }, contraction);
    expect(stimulated.audit.ok && quiet.audit.ok).toBe(true);
    expect(series(stimulated, 'moneySupply').at(-1) ?? 0).toBeGreaterThan(
      series(quiet, 'moneySupply').at(-1) ?? 0,
    );
  });

  it('raises money supply from observed unemployment with no shock impulse', () => {
    const lagMonths = 3;
    const stimulated = opened({
      'centralBank.stimulus': 1,
      'centralBank.stimulusLag': lagMonths,
      'centralBank.moneyGrowth': 0.05,
    });
    const quiet = opened({
      'centralBank.stimulus': 0,
      'centralBank.stimulusLag': lagMonths,
      'centralBank.moneyGrowth': 0.05,
    });
    for (const economy of [stimulated, quiet]) {
      let shed = 0;
      for (const household of economy.households) {
        if (shed >= 12 || household.employer < 0) {
          continue;
        }
        separate(economy, household);
        shed += 1;
      }
      const pressure = stimulusPressure(economy);
      expect(pressure).toBeGreaterThan(0.1);
      for (let i = 0; i <= lagMonths; i += 1) {
        economy.contractionPressure.push(pressure);
      }
      growFiatMoney(economy);
    }
    const hot = totalDeposits(stimulated);
    const cold = totalDeposits(quiet);
    expect(hot).toBeGreaterThan(cold);
  });

  it('withdraws when the lagged labor market is tight', () => {
    const lagMonths = 3;
    const tight = opened({
      'centralBank.stimulus': 1,
      'centralBank.stimulusLag': lagMonths,
      'centralBank.moneyGrowth': 0.05,
    });
    const calm = opened({
      'centralBank.stimulus': 0,
      'centralBank.stimulusLag': lagMonths,
      'centralBank.moneyGrowth': 0.05,
    });
    for (let i = 0; i <= lagMonths; i += 1) {
      tight.contractionPressure.push(-0.05);
      calm.contractionPressure.push(-0.05);
    }
    const beforeTight = totalDeposits(tight);
    const beforeCalm = totalDeposits(calm);
    growFiatMoney(tight);
    growFiatMoney(calm);
    expect(totalDeposits(tight) - beforeTight).toBeLessThan(totalDeposits(calm) - beforeCalm);
  });

  it('ignores stimulus under bitcoin', () => {
    const shared = {
      ...small,
      'regime.type': 'bitcoin' as const,
      'centralBank.stimulusLag': lag,
      ticks: 36,
    };
    const floor = run({ ...shared, 'centralBank.stimulus': 0 }, contraction);
    const high = run({ ...shared, 'centralBank.stimulus': 2 }, contraction);
    expect(series(floor, 'moneySupply')).toEqual(series(high, 'moneySupply'));
  });
});

function opened(sliders: Record<string, number | string>) {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'phase69',
        seed: 1,
        ticks: 1,
        sliders: {
          ...FEATURE_OFF,
          'scale.households': 40,
          'scale.firms': 4,
          'scale.banks': 1,
          'regime.type': 'fiat',
          ...sliders,
        },
      }),
    ),
    1,
    null,
  );
}

function totalDeposits(economy: ReturnType<typeof opened>): number {
  let total = economy.govDeposits;
  for (const household of economy.households) {
    total += household.deposit;
  }
  for (const firm of economy.firms) {
    total += firm.deposit;
  }
  return total;
}

function run(
  input: Record<string, number | string> & { ticks?: number },
  shock: ForcedShock | null = null,
): SimulationResult {
  const { ticks = 48, ...sliders } = input;
  return simulate(loadScenario({ name: 'phase69', seed: 3, ticks, sliders }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
