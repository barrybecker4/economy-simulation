import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'centralBank.moneyGrowth': 0.05,
  'housing.marketClearing': 'off',
  'housing.tenureChoice': 'on',
};

describe('phase 65 housing monetary premium', () => {
  it('matches phase 64 prices when the premium is zero', () => {
    const prior = run({ ...small, 'regime.type': 'fiat' });
    const fiat = run({ ...small, 'regime.type': 'fiat', 'housing.monetaryPremium': 0 });
    const bitcoinPrior = run({ ...small, 'regime.type': 'bitcoin' });
    const bitcoin = run({ ...small, 'regime.type': 'bitcoin', 'housing.monetaryPremium': 0 });
    expect(prior.audit.ok && fiat.audit.ok && bitcoinPrior.audit.ok && bitcoin.audit.ok).toBe(true);
    expect(series(fiat, 'homePriceMonths')).toEqual(series(prior, 'homePriceMonths'));
    expect(series(fiat, 'priceHousing')).toEqual(series(prior, 'priceHousing'));
    expect(series(bitcoin, 'homePriceMonths')).toEqual(series(bitcoinPrior, 'homePriceMonths'));
    expect(series(bitcoin, 'priceHousing')).toEqual(series(bitcoinPrior, 'priceHousing'));
  });

  it('keeps fiat homes at 48 months and cuts bitcoin homes when the premium is positive', () => {
    const fiat = run({
      ...small,
      'regime.type': 'fiat',
      'housing.monetaryPremium': 0.5,
    });
    const bitcoin = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.monetaryPremium': 0.5,
    });
    expect(fiat.audit.ok && bitcoin.audit.ok).toBe(true);
    expect(last(fiat, 'homePriceMonths')).toBeCloseTo(48, 8);
    expect(last(bitcoin, 'homePriceMonths')).toBeCloseTo(24, 8);
  });

  it('lowers bitcoin housing relative to the CPI and raises housing security', () => {
    const calm = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.monetaryPremium': 0,
      'deflation.sensitivity': 0,
    });
    const shed = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.monetaryPremium': 0.5,
      'deflation.sensitivity': 0,
    });
    expect(calm.audit.ok && shed.audit.ok).toBe(true);
    expect(relativeHousing(shed)).toBeLessThan(relativeHousing(calm));
    expect(last(shed, 'housingSecurity')).toBeGreaterThan(last(calm, 'housingSecurity'));
  });
});

function relativeHousing(result: SimulationResult): number {
  const housing = last(result, 'priceHousing');
  const cpi = last(result, 'priceLevel');
  return cpi > 0 ? housing / cpi : 0;
}

function run(input: Record<string, number | string>): SimulationResult {
  const { ticks = 36, ...sliders } = input;
  return simulate(
    loadScenario({
      name: 'phase65',
      seed: 2,
      ticks: typeof ticks === 'number' ? ticks : 36,
      sliders,
    }),
  );
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
