import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { quotedServicePrice } from './agent-trade.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 27 agent market depth', () => {
  it('matches the prior agent volume when depth is zero', () => {
    const prior = run(small);
    const neutral = run({ ...small, 'agent.marketDepth': 0 });
    expect(prior.audit.ok && neutral.audit.ok).toBe(true);
    expect(series(neutral, 'agentVolume')).toEqual(series(prior, 'agentVolume'));
  });

  it('leaves the ask unchanged at depth zero and raises it when agents crowd firms', () => {
    const base = {
      realUnitCost: 4,
      priceLevel: 100,
      openingPriceLevel: 100,
      friction: 0.02,
      agents: 8,
      firms: 2,
    };
    expect(quotedServicePrice({ ...base, depth: 0 })).toBeCloseTo(4 * 1.02, 8);
    expect(quotedServicePrice({ ...base, depth: 1 })).toBeGreaterThan(
      quotedServicePrice({ ...base, depth: 0 }),
    );
  });

  it('cuts agent sales when crowding raises the ask', () => {
    const crowded = {
      ...small,
      'ai.adoptionMidpointYear': 1,
      'ai.adoptionSteepness': 1.5,
      'ai.agentsPerOwnerCeiling': 20,
      'ai.ownerShareCeiling': 0.95,
    };
    const open = run({ ...crowded, 'agent.marketDepth': 0 });
    const tight = run({ ...crowded, 'agent.marketDepth': 1 });
    expect(open.audit.ok && tight.audit.ok).toBe(true);
    const openTotal = series(open, 'agentVolume').reduce((sum, value) => sum + value, 0);
    const tightTotal = series(tight, 'agentVolume').reduce((sum, value) => sum + value, 0);
    expect(openTotal).toBeGreaterThan(0);
    expect(tightTotal).toBeLessThan(openTotal);
  });
});

function run(input: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'phase27', seed: 2, ticks: 48, sliders: input }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
