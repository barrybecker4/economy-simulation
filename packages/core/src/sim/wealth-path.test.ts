import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

describe('default wealth path', () => {
  it('raises total real wealth and real GDP over a default decade', () => {
    const result = simulate(loadScenario({ name: 'wealth-path', seed: 1, ticks: 120 }));
    expect(result.audit.ok).toBe(true);
    expect(last(result, 'totalRealWealth')).toBeGreaterThan(first(result, 'totalRealWealth'));
    expect(last(result, 'realGdp')).toBeGreaterThan(first(result, 'realGdp'));
  });

  it('does not sawtooth wealth from once-a-year investment lumps', () => {
    const result = simulate(loadScenario({ name: 'wealth-smooth', seed: 1, ticks: 36 }));
    const wealth = series(result, 'totalRealWealth');
    const invest = series(result, 'realInvestment');
    expect(invest.filter((value, index) => index > 0 && index % 12 !== 0 && value > 0).length).toBeGreaterThan(
      0,
    );
    const jumps = [];
    for (let index = 1; index < wealth.length; index += 1) {
      jumps.push((wealth[index] ?? 0) - (wealth[index - 1] ?? 0));
    }
    const anniversary = jumps[11] ?? 0;
    const typical = medianAbs(jumps.filter((_, index) => index !== 11));
    expect(Math.abs(anniversary)).toBeLessThan(typical * 8);
  });

  it('raises wealth more when AI adoption is stronger', () => {
    const modest = simulate(
      loadScenario({
        name: 'wealth-ai-modest',
        seed: 1,
        ticks: 120,
        sliders: {
          'ai.automatableShareStart': 0.3,
          'ai.automatableShareEnd': 0.5,
          'shock.frequency': 0,
        },
      }),
    );
    const substantial = simulate(
      loadScenario({
        name: 'wealth-ai-strong',
        seed: 1,
        ticks: 120,
        sliders: {
          'shock.frequency': 0,
        },
      }),
    );
    const modestGain =
      last(modest, 'totalRealWealth') / first(modest, 'totalRealWealth');
    const strongGain =
      last(substantial, 'totalRealWealth') / first(substantial, 'totalRealWealth');
    expect(strongGain).toBeGreaterThan(modestGain);
  });
});

function first(result: SimulationResult, id: MetricId): number {
  return Number(result.metrics.series[id][0]);
}

function last(result: SimulationResult, id: MetricId): number {
  return Number(result.metrics.series[id].at(-1));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function medianAbs(values: readonly number[]): number {
  const sorted = [...values].map(Math.abs).sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}
