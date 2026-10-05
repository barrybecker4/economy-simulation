import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 15 transition', () => {
  it('matches steady regimes when transition length is zero', () => {
    const fiat = run({ ...small, 'regime.type': 'fiat', 'transition.lengthMonths': 0 });
    const bitcoin = run({ ...small, 'regime.type': 'bitcoin', 'transition.lengthMonths': 0 });
    const fiatTagged = run({ ...small, 'regime.type': 'fiat' });
    const bitcoinTagged = run({ ...small, 'regime.type': 'bitcoin' });
    expect(series(fiat, 'priceLevel')).toEqual(series(fiatTagged, 'priceLevel'));
    expect(series(bitcoin, 'priceLevel')).toEqual(series(bitcoinTagged, 'priceLevel'));
  });

  it('conserves the ledger through conversion and raises Gini with concentration', () => {
    const even = run({
      ...small,
      'regime.type': 'fiat',
      'transition.lengthMonths': 12,
      'transition.debtHaircut': 0.1,
      'transition.holderConcentration': 0.2,
      'housing.tenureChoice': 'on',
      ticks: 36,
    });
    const concentrated = run({
      ...small,
      'regime.type': 'fiat',
      'transition.lengthMonths': 12,
      'transition.debtHaircut': 0.1,
      'transition.holderConcentration': 0.9,
      'housing.tenureChoice': 'on',
      ticks: 36,
    });
    expect(even.audit.ok && concentrated.audit.ok).toBe(true);
    expect(series(even, 'auditOk').every((value) => value === 1)).toBe(true);
    expect(series(concentrated, 'auditOk').every((value) => value === 1)).toBe(true);
    expect(series(concentrated, 'giniWealth').at(-1) ?? 0).toBeGreaterThan(
      series(even, 'giniWealth').at(-1) ?? 0,
    );
    const base = series(concentrated, 'baseMoney');
    expect(Math.max(...base.slice(12))).toBeCloseTo(base[12] ?? 0, 5);
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase15', seed: 2, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
