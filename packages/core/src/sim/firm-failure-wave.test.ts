import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';
import { composeScenario } from '../config/presets.js';

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
 */
describe('firm failure wave regression', () => {
  const small = {
    households: 4000,
    firms: 200,
    banks: 4,
    ticks: 240,
  };

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

  it(
    'passes with fix: Modest (default) AI preset',
    () => {
      // Modest is the registry default for AI bullishness
      const result = simulate(
        loadScenario({
          name: 'modest-crash-test',
          seed: 1,
          ...small,
          sliders: {}, // Use all defaults - Modest AI is the default
        }),
      );

      const maxDrop = maxOutputDrop(result);

      // After fix: should be under 15%
      expect(maxDrop).toBeLessThan(0.15);
    },
    60000,
  ); // 60 second timeout

  it(
    'passes with fix: Substantial AI preset',
    () => {
      const result = simulate(
        loadScenario({
          name: 'substantial-crash-test',
          seed: 1,
          ...small,
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

      const maxDrop = maxOutputDrop(result);

      // After fix: should be under 15%
      expect(maxDrop).toBeLessThan(0.15);
    },
    60000,
  ); // 60 second timeout

  it(
    'passes with fix: Modest (default) AI preset (seeds 1-3)',
    () => {
      for (const seed of [1, 2, 3]) {
        const result = simulate(
          loadScenario({
            name: 'modest-fix-test',
            seed,
            ...small,
            sliders: {},
          }),
        );

        const maxDrop = maxOutputDrop(result);

        expect(maxDrop).toBeLessThan(0.15);
      }
    },
    180000,
  ); // 3 minutes for 3 seeds

  it(
    'passes with fix: Substantial AI preset (seeds 1-3)',
    () => {
      for (const seed of [1, 2, 3]) {
        const result = simulate(
          loadScenario({
            name: 'substantial-fix-test',
            seed,
            ...small,
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

        const maxDrop = maxOutputDrop(result);

        expect(maxDrop).toBeLessThan(0.15);
      }
    },
    180000,
  ); // 3 minutes for 3 seeds
});
