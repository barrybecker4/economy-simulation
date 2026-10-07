import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { clearsInvestmentHurdle } from './credit.js';
import { simulate } from './simulate.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 13 investment hurdle', () => {
  it('clears only when expected return beats the real return plus premium', () => {
    expect(clearsInvestmentHurdle({ expectedReturn: 0.1, realReturn: 0.02, premium: 0.02 })).toBe(
      true,
    );
    expect(clearsInvestmentHurdle({ expectedReturn: 0.03, realReturn: 0.05, premium: 0.02 })).toBe(
      false,
    );
  });

  it('matches phase 12 when the hurdle is off', () => {
    const baseline = run({ ...small });
    const tagged = run({ ...small, 'firm.investmentHurdle': 'off' });
    expect(baseline.audit.ok && tagged.audit.ok).toBe(true);
    expect(series(baseline, 'realInvestment')).toEqual(series(tagged, 'realInvestment'));
    expect(series(baseline, 'profitSharingShare')).toEqual(series(tagged, 'profitSharingShare'));
  });

  it('cuts investment and raises measured profit-sharing under deflation', () => {
    const rising = run({
      ...small,
      'regime.type': 'fiat',
      'firm.investmentHurdle': 'on',
      'firm.hurdlePremium': 0.02,
      ticks: 72,
      shock: { tick: 12, kind: 'credit' as const, size: 0.25 },
    });
    const falling = run({
      ...small,
      'regime.type': 'bitcoin',
      'firm.investmentHurdle': 'on',
      'firm.hurdlePremium': 0.02,
      ticks: 72,
      shock: { tick: 12, kind: 'credit' as const, size: 0.25 },
    });
    expect(rising.audit.ok && falling.audit.ok).toBe(true);
    expect(mean(series(falling, 'realInvestment'))).toBeLessThan(
      mean(series(rising, 'realInvestment')),
    );
    expect(mean(series(falling, 'profitSharingShare'))).toBeGreaterThan(
      mean(series(rising, 'profitSharingShare')),
    );
  });
});

function run(
  input: Record<string, number | string | object | undefined> & {
    ticks?: number;
    shock?: { tick: number; kind: 'credit' | 'demand' | 'productivity'; size: number };
  },
): SimulationResult {
  const { ticks = 48, shock, ...rest } = input;
  const sliders: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'number' || typeof value === 'string') {
      sliders[key] = value;
    }
  }
  return simulate(loadScenario({ name: 'phase13', seed: 2, ticks, sliders }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
