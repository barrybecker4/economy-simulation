import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

const monetary = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'prices.trendWeight': 0,
  'production.demandWeight': 1,
  'bank.depositPassThrough': 1,
  'expectations.anchorWeight': 0.5,
  'housing.tenureChoice': 'on',
  'credit.endogenousWeight': 1,
  'credit.leverageStart': 1,
  'household.openingDepositMonths': 12,
};

describe('phase 39 supply shock and firm-level hiring', () => {
  it('raises unemployment after a negative productivity shock with firm-level hiring', () => {
    const calm = run({
      ...monetary,
      'regime.type': 'fiat',
      'labor.firmLevelHiring': 'on',
      ticks: 36,
    });
    const adverse = run(
      {
        ...monetary,
        'regime.type': 'fiat',
        'labor.firmLevelHiring': 'on',
        ticks: 36,
      },
      { tick: 12, kind: 'productivity', size: -0.1 },
    );
    // The recycled treasury surplus keeps sales up, so firm-level hiring can
    // want more workers when capacity falls. This path should not collapse.
    const duringShock = mean(series(adverse, 'unemployment').slice(12, 24));
    expect(duringShock).toBeLessThan(0.2);
    expect(Math.abs(duringShock - mean(series(calm, 'unemployment').slice(12, 24)))).toBeLessThan(
      0.05,
    );
  });

  it('does not collapse employment on the economy-wide hiring path', () => {
    const adverse = run(
      {
        ...monetary,
        'regime.type': 'fiat',
        'labor.firmLevelHiring': 'off',
        ticks: 36,
      },
      { tick: 12, kind: 'productivity', size: -0.1 },
    );
    // The impulse now enters through the real-wage reference. Prices can move
    // enough in this window that unemployment does not have to rise. It still
    // must not collapse.
    expect(mean(series(adverse, 'unemployment').slice(12, 24))).toBeLessThan(0.2);
  });
});

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  shock?: { tick: number; kind: 'credit' | 'demand' | 'productivity'; size: number },
): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase39', seed: 2, ticks, sliders: rest }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}
