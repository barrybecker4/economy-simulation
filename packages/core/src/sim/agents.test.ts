import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

const scale = {
  'scale.households': 80,
  'scale.firms': 8,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('AI agents', () => {
  it('leaves the economy unchanged when no agents become autonomous', () => {
    const plain = run({ ...scale, 'ai.agentAutonomyShareEnd': 0, 'ai.paymentFrictionFiat': 0 });
    const costly = run({ ...scale, 'ai.agentAutonomyShareEnd': 0, 'ai.paymentFrictionFiat': 0.1 });
    expect(plain.audit.ok && costly.audit.ok).toBe(true);
    expect(series(plain, 'realGdp')).toEqual(series(costly, 'realGdp'));
    expect(series(plain, 'priceLevel')).toEqual(series(costly, 'priceLevel'));
    expect(series(plain, 'aiShareOfAgents').every((value) => value === 0)).toBe(true);
  });

  it('trades more when payment friction is lower, and conserves money', () => {
    const easy = run({ ...scale, 'ai.agentAutonomyShareEnd': 0.5, 'ai.paymentFrictionFiat': 0 });
    const hard = run({ ...scale, 'ai.agentAutonomyShareEnd': 0.5, 'ai.paymentFrictionFiat': 0.1 });
    const bitcoin = run({
      ...scale,
      'regime.type': 'bitcoin',
      'ai.agentAutonomyShareEnd': 0.5,
      'deflation.sensitivity': 0,
    });
    expect(easy.audit.ok && hard.audit.ok && bitcoin.audit.ok).toBe(true);
    expect(last(easy, 'aiShareOfTransactions')).toBeGreaterThan(
      last(hard, 'aiShareOfTransactions'),
    );
    expect(last(easy, 'aiShareOfAgents')).toBeGreaterThan(0.2);
    expect(Number.isFinite(last(easy, 'meanWellbeing'))).toBe(true);
    const money = series(bitcoin, 'moneySupply');
    expect((money[money.length - 1] ?? 0) % 1).not.toBe(0);
  });
});

function run(sliders: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'agents', seed: 9, ticks: 80, sliders }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
