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

describe('AI productivity', () => {
  it('matches a no-transition economy when the automatable share does not rise', () => {
    const low = run({ ...scale, 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3 });
    const high = run({
      ...scale,
      'ai.automatableShareStart': 0.5,
      'ai.automatableShareEnd': 0.5,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.6,
    });
    expect(low.audit.ok && high.audit.ok).toBe(true);
    expect(series(low, 'realGdp')).toEqual(series(high, 'realGdp'));
    expect(series(low, 'priceLevel')).toEqual(series(high, 'priceLevel'));
    expect(series(low, 'laborShare')).toEqual(series(high, 'laborShare'));
    expect(series(low, 'aiShareOfOutput').every((value) => value === 0)).toBe(true);
  });

  it('raises productivity per human and lowers the labor share when adoption is fast', () => {
    for (const regime of ['fiat', 'bitcoin'] as const) {
      const quiet = run({
        ...scale,
        'regime.type': regime,
        'ai.automatableShareStart': 0.3,
        'ai.automatableShareEnd': 0.3,
      });
      const fast = run({
        ...scale,
        'regime.type': regime,
        'ai.adoptionMidpointYear': 3,
        'ai.adoptionSteepness': 1.2,
        'ai.physicalTaskShare': 0.1,
      });
      expect(fast.audit.ok, regime).toBe(true);
      expect(last(fast, 'productivityPerHuman'), regime).toBeGreaterThan(
        last(quiet, 'productivityPerHuman'),
      );
      expect(last(fast, 'laborShare'), regime).toBeLessThan(last(quiet, 'laborShare'));
    }
  });

  it('delivers less growth when more tasks stay physical', () => {
    const flexible = run({
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
    });
    const physical = run({
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.7,
    });
    expect(last(physical, 'productivityPerHuman')).toBeLessThan(
      last(flexible, 'productivityPerHuman'),
    );
  });
});

function run(sliders: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'ai', seed: 8, ticks: 120, sliders }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
