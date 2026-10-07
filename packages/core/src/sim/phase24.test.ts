import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { BITCOIN_OPENING_SHARE } from './bitcoin-supply.js';
import { nextExchangeRate, nextMoneyShares, openingShares } from './monies.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
  'ai.ownerShareCeiling': 0,
};

describe('phase 24 money choice', () => {
  it('matches the prior path when money choice is off', () => {
    const prior = run(small);
    const neutral = run({ ...small, 'money.choiceSpeed': 0 });
    expect(prior.audit.ok && neutral.audit.ok).toBe(true);
    expect(series(neutral, 'realGdp')).toEqual(series(prior, 'realGdp'));
    expect(last(neutral, 'bitcoinShare')).toBeCloseTo(BITCOIN_OPENING_SHARE, 12);
    expect(last(neutral, 'fiatShare')).toBeCloseTo(1 - BITCOIN_OPENING_SHARE, 12);
  });

  it('keeps fiat as the residual opening share', () => {
    expect(openingShares({ bitcoin: 0, stablecoin: 0, cbdc: 0 })).toEqual({
      fiat: 1,
      bitcoin: 0,
      stablecoin: 0,
      cbdc: 0,
    });
    const mixed = openingShares({ bitcoin: 0.2, stablecoin: 0.1, cbdc: 0.1 });
    expect(mixed.fiat).toBeCloseTo(0.6, 12);
    expect(nextMoneyShares(mixed, [1, 0, 0, 0], 0)).toEqual(mixed);
  });

  it('raises the bitcoin share and its price when bitcoin is trusted', () => {
    const quiet = run({
      ...small,
      'money.choiceSpeed': 0.15,
      'money.bitcoinTrust': 0,
      'money.fiatLegalTender': 1,
    });
    const trusted = run({
      ...small,
      'money.choiceSpeed': 0.15,
      'money.bitcoinTrust': 2,
      'money.fiatLegalTender': 0,
    });
    expect(quiet.audit.ok && trusted.audit.ok).toBe(true);
    expect(last(trusted, 'bitcoinShare')).toBeGreaterThan(last(quiet, 'bitcoinShare'));
    expect(last(trusted, 'bitcoinPrice')).toBeGreaterThan(1);
    expect(nextExchangeRate(1, 0.4, 0.5)).toBeLessThan(1);
  });
});

function run(input: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'phase24', seed: 2, ticks: 36, sliders: input }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
