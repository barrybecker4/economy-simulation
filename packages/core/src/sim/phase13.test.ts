import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { clearsInvestmentHurdle } from './credit.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
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

  it('keeps bitcoin borrowing no higher than fiat under a credit shock', () => {
    const substantialAi = {
      'ai.bullishness': 1,
      'ai.adoptionMidpointYear': 10,
      'ai.adoptionSteepness': 0.4,
      'ai.physicalTaskShare': 0.3,
      'ai.roboticsStartYear': 8,
      'ai.roboticsRampYears': 12,
    };
    const shared = {
      ...small,
      ...substantialAi,
      'centralBank.moneyGrowth': 0.05,
      'centralBank.stimulus': 0.05,
      'firm.investmentHurdle': 'on',
      'firm.hurdlePremium': 0.02,
      ticks: 72,
      shock: { tick: 12, kind: 'credit' as const, size: 0.25 },
    };
    const rising = run({ ...shared, 'regime.type': 'fiat' });
    const falling = run({ ...shared, 'regime.type': 'bitcoin' });
    expect(rising.audit.ok && falling.audit.ok).toBe(true);
    expect(mean(series(falling, 'newBorrowing'))).toBeLessThanOrEqual(
      mean(series(rising, 'newBorrowing')),
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
