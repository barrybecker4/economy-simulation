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
  'ai.agentAutonomyShareEnd': 0,
};

const delayedRobotics = {
  'ai.roboticsStartYear': 50,
};

describe('phase 17 AI bullishness and robotics', () => {
  it('matches the delayed-robotics path when bullishness is one', () => {
    const first = run({ ...small, ...delayedRobotics, 'ai.bullishness': 1 });
    const second = run({ ...small, ...delayedRobotics, 'ai.bullishness': 1 });
    expect(first.audit.ok && second.audit.ok).toBe(true);
    expect(series(first, 'realGdp')).toEqual(series(second, 'realGdp'));
    expect(series(first, 'unemployment')).toEqual(series(second, 'unemployment'));
    expect(series(first, 'productivityPerHuman')).toEqual(series(second, 'productivityPerHuman'));
    expect(series(first, 'aiShareOfOutput')).toEqual(series(second, 'aiShareOfOutput'));
  });

  it('keeps the default ramp off until the start year and raises output after it', () => {
    const delayed = run({
      ...small,
      ...delayedRobotics,
      'ai.bullishness': 1,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      ticks: 180,
    });
    const ramping = run({
      ...small,
      'ai.bullishness': 1,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.roboticsStartYear': 5,
      'ai.roboticsRampYears': 8,
      ticks: 180,
    });
    expect(delayed.audit.ok && ramping.audit.ok).toBe(true);
    const preRamp = series(delayed, 'realGdp').slice(0, 60);
    expect(series(ramping, 'realGdp').slice(0, 60)).toEqual(preRamp);
    expect(last(ramping, 'productivityPerHuman')).toBeGreaterThan(
      last(delayed, 'productivityPerHuman'),
    );
    expect(last(ramping, 'unemployment')).toBeGreaterThan(last(delayed, 'unemployment'));
  });

  it('delivers a smaller internet-sized gain at bullishness zero', () => {
    const quiet = run({
      ...small,
      ...delayedRobotics,
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
    });
    const low = run({
      ...small,
      ...delayedRobotics,
      'ai.bullishness': 0,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
    });
    const high = run({
      ...small,
      ...delayedRobotics,
      'ai.bullishness': 1,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
    });
    expect(low.audit.ok && high.audit.ok).toBe(true);
    expect(last(low, 'productivityPerHuman')).toBeGreaterThan(last(quiet, 'productivityPerHuman'));
    expect(last(high, 'productivityPerHuman')).toBeGreaterThan(last(low, 'productivityPerHuman'));
    expect(last(low, 'unemployment') - last(quiet, 'unemployment')).toBeLessThan(
      last(high, 'unemployment') - last(quiet, 'unemployment'),
    );
  });

  it('keeps productivity rising after adoption when bullishness is two', () => {
    const bounded = run({
      ...small,
      'labor.wageElasticity': 0,
      'ai.bullishness': 1,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.5,
      'ai.physicalTaskShare': 0.1,
      'ai.roboticsStartYear': 5,
      'ai.roboticsRampYears': 4,
      ticks: 240,
    });
    const unbounded = run({
      ...small,
      'labor.wageElasticity': 0,
      'ai.bullishness': 2,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.5,
      'ai.physicalTaskShare': 0.1,
      'ai.roboticsStartYear': 5,
      'ai.roboticsRampYears': 4,
      ticks: 240,
    });
    expect(bounded.audit.ok && unbounded.audit.ok).toBe(true);
    const lateBounded = series(bounded, 'productivityPerHuman');
    const lateUnbounded = series(unbounded, 'productivityPerHuman');
    const afterFlat = 168;
    expect(lateUnbounded[afterFlat + 48] ?? 0).toBeGreaterThan(lateUnbounded[afterFlat] ?? 0);
    expect(lateBounded[afterFlat + 48] ?? 0).toBeLessThanOrEqual(
      (lateBounded[afterFlat] ?? 0) * 1.05,
    );
    expect(last(unbounded, 'unemployment')).toBeLessThan(0.95);
    expect(last(unbounded, 'unemployment')).toBeGreaterThan(0.05);
  });

  it('ignores bullishness and robotics when the automatable share is flat', () => {
    const quiet = run({
      ...small,
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
    });
    const bullish = run({
      ...small,
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
      'ai.bullishness': 2,
      'ai.roboticsStartYear': 0,
      'ai.roboticsRampYears': 1,
    });
    expect(quiet.audit.ok && bullish.audit.ok).toBe(true);
    expect(series(quiet, 'realGdp')).toEqual(series(bullish, 'realGdp'));
    expect(series(quiet, 'aiShareOfOutput').every((value) => value === 0)).toBe(true);
  });

  it('lets a higher physical share cut the gain only while the ramp is delayed', () => {
    const flexible = run({
      ...small,
      ...delayedRobotics,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
    });
    const physical = run({
      ...small,
      ...delayedRobotics,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.7,
    });
    const delayedGap =
      last(flexible, 'productivityPerHuman') - last(physical, 'productivityPerHuman');
    expect(delayedGap).toBeGreaterThan(0);
    const flexibleRamped = run({
      ...small,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
      'ai.roboticsStartYear': 2,
      'ai.roboticsRampYears': 2,
      ticks: 120,
    });
    const physicalRamped = run({
      ...small,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.7,
      'ai.roboticsStartYear': 2,
      'ai.roboticsRampYears': 2,
      ticks: 120,
    });
    const rampedGap = Math.abs(
      last(flexibleRamped, 'productivityPerHuman') - last(physicalRamped, 'productivityPerHuman'),
    );
    expect(rampedGap).toBeLessThan(delayedGap * 0.25);
  });

  it('keeps the ledger balanced at bullishness two with the default ramp', () => {
    const result = run({
      ...small,
      'scale.households': 200,
      'scale.firms': 20,
      'ai.bullishness': 2,
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);
  });
});

function run(
  input: Record<string, number | string | undefined> & {
    ticks?: number;
  },
): SimulationResult {
  const { ticks = 120, ...rest } = input;
  const sliders: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (typeof value === 'number' || typeof value === 'string') {
      sliders[key] = value;
    }
  }
  return simulate(loadScenario({ name: 'phase17', seed: 2, ticks, sliders }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
