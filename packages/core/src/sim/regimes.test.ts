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

describe('regimes', () => {
  it('leaves the fiat path unchanged when deflation sensitivity is zero', () => {
    const calm = run({ ...small, 'deflation.sensitivity': 0 });
    const tagged = run({ ...small, 'deflation.sensitivity': 1 });
    expect(calm.audit.ok && tagged.audit.ok).toBe(true);
    expect(series(calm, 'priceLevel')).toEqual(series(tagged, 'priceLevel'));
    expect(series(calm, 'realGdp')).toEqual(series(tagged, 'realGdp'));
    expect(series(calm, 'unemployment')).toEqual(series(tagged, 'unemployment'));
  });

  it('trends down under bitcoin, stays inside savings, and keeps base money on the schedule', () => {
    const fiat = run(small);
    const bitcoin = run({ ...small, 'regime.type': 'bitcoin' });
    expect(bitcoin.unit).toBe('satoshi');
    expect(bitcoin.audit.ok).toBe(true);
    const prices = series(bitcoin, 'priceLevel');
    const base = series(bitcoin, 'baseMoney');
    const coverage = series(bitcoin, 'loanToSavings');
    const unemployment = series(bitcoin, 'unemployment');
    expect(prices[prices.length - 1] ?? 0).toBeLessThan(prices[0] ?? 0);
    expect(series(fiat, 'priceLevel').at(-1) ?? 0).toBeGreaterThan(
      series(fiat, 'priceLevel')[0] ?? 0,
    );
    expect(Math.max(...base)).toBeCloseTo(Math.min(...base), 6);
    expect(Math.max(...coverage)).toBeLessThanOrEqual(1);
    expect(Math.min(...unemployment)).toBeGreaterThanOrEqual(0.03);
    expect(Math.max(...unemployment)).toBeLessThanOrEqual(0.12);
    const money = series(bitcoin, 'moneySupply');
    expect((money[money.length - 1] ?? 0) % 1).not.toBe(0);
    expect(relative(bitcoin, 'priceElectronics', 'priceGeneral')).toBeLessThan(1);
    expect(relative(bitcoin, 'priceBeachfront', 'priceLevel')).toBeGreaterThan(1);
  });

  it('cuts credit and speculation when deflation sensitivity is higher', () => {
    const mild = run({ ...small, 'regime.type': 'bitcoin', 'deflation.sensitivity': 0 });
    const sharp = run({ ...small, 'regime.type': 'bitcoin', 'deflation.sensitivity': 5 });
    expect(mean(series(sharp, 'creditToGdp'))).toBeLessThan(mean(series(mild, 'creditToGdp')));
    expect(mean(series(sharp, 'propertyTurnover'))).toBeLessThan(
      mean(series(mild, 'propertyTurnover')),
    );
    expect(mean(series(sharp, 'profitSharingShare'))).toBeGreaterThan(
      mean(series(mild, 'profitSharingShare')),
    );
    expect(mean(series(sharp, 'nonMortgageHousingShare'))).toBeGreaterThan(
      mean(series(mild, 'nonMortgageHousingShare')),
    );
  });

  it('uses the hybrid central bank only as a lender of last resort', () => {
    const shock = { tick: 6, kind: 'credit' as const, size: 0.25 };
    const sliders = { ...small, 'bank.capitalRatio': 0.04 };
    const bitcoin = simulate(
      loadScenario({
        name: 'lolr',
        seed: 6,
        ticks: 30,
        sliders: { ...sliders, 'regime.type': 'bitcoin' },
      }),
      shock,
    );
    const hybrid = simulate(
      loadScenario({
        name: 'lolr',
        seed: 6,
        ticks: 30,
        sliders: { ...sliders, 'regime.type': 'hybrid' },
      }),
      shock,
    );
    expect(bitcoin.audit.ok && hybrid.audit.ok).toBe(true);
    expect(series(bitcoin, 'bankFailures').at(-1) ?? 0).toBeGreaterThan(
      series(hybrid, 'bankFailures').at(-1) ?? 0,
    );
    const bitcoinBase = series(bitcoin, 'baseMoney');
    const hybridBase = series(hybrid, 'baseMoney');
    expect(Math.max(...bitcoinBase)).toBeCloseTo(bitcoinBase[0] ?? 0, 6);
    expect(Math.max(...hybridBase)).toBeGreaterThan(hybridBase[0] ?? 0);
  });
});

function run(sliders: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'regime', seed: 2, ticks: 48, sliders }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function relative(result: SimulationResult, left: MetricId, right: MetricId): number {
  const a = series(result, left);
  const b = series(result, right);
  return (a[a.length - 1] ?? 0) / (b[b.length - 1] ?? 1);
}
