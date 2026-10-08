import { describe, expect, it } from 'vitest';
import { listSliders } from '../config/registry.js';
import { loadScenario } from '../config/load.js';
import { applyCategoryOption } from '../config/presets.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

/** Same monetary overrides as the web app default page. */
const MONETARY: Record<string, number | string> = {
  'prices.trendWeight': 0.8,
  'production.demandWeight': 1,
  'bank.depositPassThrough': 1,
  'household.realReturnSensitivity': 1,
  'expectations.anchorWeight': 0.5,
  'housing.tenureChoice': 'on',
  'credit.endogenousWeight': 1,
  'credit.leverageStart': 1,
  'bank.capitalRatio': 0.04,
  'household.openingDepositMonths': 12,
  'government.bondRate': 0.02,
  'shock.frequency': 0,
};

function resolved(
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const slider of listSliders()) {
    out[slider.id] =
      slider.id === 'regime.type' ? regime : (overrides[slider.id] ?? slider.default);
  }
  return out;
}

describe('monetary opening path', () => {
  it('does not spike unemployment when AI capacity ramps on', () => {
    for (const preset of ['modest', 'substantial'] as const) {
      const overrides = applyCategoryOption('aiBullishness', preset, MONETARY);
      const result = simulate(
        loadScenario({ name: 'opening-path', seed: 1, ticks: 36, sliders: resolved('fiat', overrides) }),
      );
      expect(result.audit.ok).toBe(true);
      const unemployment = series(result, 'unemployment');
      for (let index = 1; index < unemployment.length; index += 1) {
        const jump = (unemployment[index] ?? 0) - (unemployment[index - 1] ?? 0);
        expect(jump, preset).toBeLessThan(0.12);
      }
      expect(Math.max(...unemployment), preset).toBeLessThan(0.35);
    }
  });
});

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
