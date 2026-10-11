import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

/**
 * Regression test for synchronized firm-failure wave bug.
 *
 * With household AI agents on (Substantial and Modest presets), real output
 * drops by about 50% in one month: month 21 in Substantial, month 22 in Modest.
 *
 * Root cause: The annual credit round at month 12 roughly doubles loans for all firms
 * simultaneously. Falling prices push all firms into negative equity together.
 * After 6 months, they all get replaced at once.
 *
 * This test verifies the fix prevents such synchronized waves:
 * - The largest single-month fall in real output must be under 15%
 * - The largest 3-month fall in real output must be under 15%
 */
describe('firm failure wave regression', () => {
  function maxOutputDrop(result: SimulationResult): number {
    const realGdp = series(result, 'realGdp');
    let maxDrop = 0;
    for (let i = 1; i < realGdp.length; i++) {
      const prev = realGdp[i - 1] ?? 1;
      const curr = realGdp[i] ?? 1;
      if (prev > 0) {
        const drop = (prev - curr) / prev;
        if (drop > maxDrop) {
          maxDrop = drop;
        }
      }
    }
    return maxDrop;
  }

  function max3MonthDrop(result: SimulationResult): number {
    const realGdp = series(result, 'realGdp');
    let maxDrop = 0;
    for (let i = 3; i < realGdp.length; i++) {
      const start = realGdp[i - 3] ?? 1;
      const curr = realGdp[i] ?? 1;
      if (start > 0) {
        const drop = (start - curr) / start;
        if (drop > maxDrop) {
          maxDrop = drop;
        }
      }
    }
    return maxDrop;
  }

  it('Modest fiat: no wave', () => {
    const result = simulate(
      loadScenario({
        name: 'modest-fiat-no-wave',
        seed: 1,
        ticks: 240,
        sliders: {}, // Use all defaults - Modest AI is the default
      }),
    );

    const drop1 = maxOutputDrop(result);
    const drop3 = max3MonthDrop(result);

    expect(drop1).toBeLessThan(0.15);
    expect(drop3).toBeLessThan(0.15);
  }, 30000);

  it('Substantial fiat: no wave', () => {
    const result = simulate(
      loadScenario({
        name: 'substantial-fiat-no-wave',
        seed: 1,
        ticks: 240,
        sliders: {
          'ai.bullishness': 1,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 5,
          'ai.adoptionSteepness': 0.4,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 8,
          'ai.roboticsRampYears': 12,
          'agent.energyStepMonth': 96,
          'agent.energyStepSize': 0.5,
        },
      }),
    );

    const drop1 = maxOutputDrop(result);
    const drop3 = max3MonthDrop(result);

    expect(drop1).toBeLessThan(0.15);
    expect(drop3).toBeLessThan(0.15);
  }, 30000);

  it('Substantial bitcoin: no wave', () => {
    const result = simulate(
      loadScenario({
        name: 'substantial-bitcoin-no-wave',
        seed: 1,
        ticks: 240,
        sliders: {
          'regime.type': 'bitcoin',
          'ai.bullishness': 1,
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 5,
          'ai.adoptionSteepness': 0.4,
          'ai.physicalTaskShare': 0.3,
          'ai.roboticsStartYear': 8,
          'ai.roboticsRampYears': 12,
          'agent.energyStepMonth': 96,
          'agent.energyStepSize': 0.5,
        },
      }),
    );

    const drop1 = maxOutputDrop(result);
    const drop3 = max3MonthDrop(result);

    expect(drop1).toBeLessThan(0.15);
    expect(drop3).toBeLessThan(0.15);
  }, 30000);
});
