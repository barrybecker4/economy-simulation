import { describe, expect, it } from 'vitest';
import { optionById } from '../config/presets.js';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { agentTakeup, quotedServicePrice, realUnitCost } from './agent-cost.js';
import { computeCapacityFactor } from './capacity.js';
import { adoptionProgress } from './population.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';
import { INITIAL_WAGE } from './rules.js';

const scale = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('agent real cost', () => {
  it('halves on the halving time and applies the energy step only when size is positive', () => {
    const openingWage = INITIAL_WAGE;
    const half = realUnitCost({
      tick: 24,
      openingWage,
      initialCostShare: 0.04,
      costHalvingMonths: 24,
      energyStepMonth: 120,
      energyStepSize: 0,
    });
    expect(half).toBeCloseTo(0.04 * openingWage * 0.5, 12);

    const before = realUnitCost({
      tick: 95,
      openingWage,
      initialCostShare: 0.04,
      costHalvingMonths: 24,
      energyStepMonth: 96,
      energyStepSize: 0.5,
    });
    const after = realUnitCost({
      tick: 96,
      openingWage,
      initialCostShare: 0.04,
      costHalvingMonths: 24,
      energyStepMonth: 96,
      energyStepSize: 0.5,
    });
    const noStep = realUnitCost({
      tick: 96,
      openingWage,
      initialCostShare: 0.04,
      costHalvingMonths: 24,
      energyStepMonth: 96,
      energyStepSize: 0,
    });
    expect(after).toBeCloseTo(before * 0.5 ** (1 / 24) * 0.5, 10);
    expect(noStep).toBeGreaterThan(after);
    expect(after / noStep).toBeCloseTo(0.5, 12);
  });

  it('prices from the price level and depth, not a later wage share', () => {
    const cost = 4;
    const ask = quotedServicePrice({
      realUnitCost: cost,
      priceLevel: 200,
      openingPriceLevel: 100,
      friction: 0.02,
      depth: 0,
      agents: 10,
      firms: 5,
    });
    expect(ask).toBeCloseTo(cost * (200 / 100) * 1.02, 12);

    const crowded = quotedServicePrice({
      realUnitCost: cost,
      priceLevel: 100,
      openingPriceLevel: 100,
      friction: 0,
      depth: 1,
      agents: 10,
      firms: 5,
    });
    expect(crowded).toBeCloseTo(cost * (1 + 1 * (10 / 5)), 12);
    expect(ask / 200).not.toBeCloseTo(0.042, 3);
  });

  it('reduces takeup smoothly as the real price rises and never hard-zeros', () => {
    const half = agentTakeup({ ask: 4, wage: 100, valueWageShare: 0.04, demandElasticity: 2 });
    expect(half).toBeCloseTo(0.5, 12);
    const expensive = agentTakeup({
      ask: 40,
      wage: 100,
      valueWageShare: 0.04,
      demandElasticity: 2,
    });
    expect(expensive).toBeGreaterThan(0);
    expect(expensive).toBeLessThan(half);
    const cheap = agentTakeup({ ask: 0.4, wage: 100, valueWageShare: 0.04, demandElasticity: 2 });
    expect(cheap).toBeGreaterThan(half);
    expect(cheap).toBeLessThanOrEqual(1);
  });

  it('saturates compute capacity and leaves zero units unchanged', () => {
    expect(computeCapacityFactor(0, 0.2, 1)).toBe(1);
    expect(computeCapacityFactor(2, 0, 1)).toBe(1);
    expect(computeCapacityFactor(0.001, 0.2, 1)).toBeCloseTo(1 + 0.2 * 0.001, 6);
    const large = computeCapacityFactor(100, 0.2, 1);
    expect(large).toBeLessThanOrEqual(1 + 1);
    expect(large).toBeGreaterThan(1.5);
    expect(computeCapacityFactor(2, 0.5, 0)).toBe(1);
    expect(computeCapacityFactor(100, 0.2, 0)).toBe(1);
  });

  it('keeps agent trade alive after the old wage-share cutoff while real cost falls', () => {
    const depth = 0.25;
    const friction = 0.02;
    const sliders = {
      ...scale,
      'ai.automatableShareStart': 0.1,
      'ai.automatableShareEnd': 0.9,
      'ai.adoptionMidpointYear': 1,
      'ai.adoptionSteepness': 1.5,
      'ai.ownerShareCeiling': 0.95,
      'ai.agentsPerOwnerCeiling': 20,
      'ai.computeProductivity': 0.2,
      'agent.marketDepth': depth,
      'ai.paymentFrictionFiat': friction,
      'agent.costHalvingMonths': 24,
    };
    const ticks = 240;
    const result = run(sliders, ticks);
    expect(result.audit.ok).toBe(true);
    const volumes = series(result, 'agentVolume');
    let crossedAt = -1;
    for (let tick = 0; tick < ticks; tick += 1) {
      const years = tick / 12;
      const progress = adoptionProgress(0.1, 0.9, 1.5, 1, years);
      const slots = Math.max(0, Math.round(60 * 0.95 * progress));
      const agentCount = Math.max(0, Math.round(slots * 20 * progress));
      const legacyRatio = 0.04 * progress * (1 + friction) * (1 + depth * (agentCount / 6));
      if (legacyRatio >= 0.042) {
        crossedAt = tick;
        break;
      }
    }
    expect(crossedAt).toBeGreaterThanOrEqual(0);
    // Old cutoff would zero every later month. Real cost keeps falling, so trade
    // must return: some month after the crossover has positive volume.
    const after = volumes.slice(crossedAt);
    expect(after.some((value) => value > 0)).toBe(true);
    expect(after.at(-1) ?? 0).toBeGreaterThan(0);
  });

  it('leaves the economy unchanged when no agents become autonomous', () => {
    const plain = run({ ...scale, 'ai.ownerShareCeiling': 0 });
    const costly = run({
      ...scale,
      'ai.ownerShareCeiling': 0,
      'agent.costHalvingMonths': 6,
      'agent.energyStepSize': 0.9,
      'agent.capabilityGrowth': 1,
    });
    expect(plain.audit.ok && costly.audit.ok).toBe(true);
    expect(series(plain, 'realGdp')).toEqual(series(costly, 'realGdp'));
    expect(series(plain, 'priceLevel')).toEqual(series(costly, 'priceLevel'));
  });

  it('sets energy steps on Substantial, High, and Extreme while Modest stays at zero', () => {
    expect(optionById('aiBullishness', 'none').values['agent.energyStepSize']).toBe(0);
    expect(optionById('aiBullishness', 'modest').values['agent.energyStepSize']).toBe(0);
    expect(optionById('aiBullishness', 'substantial').values['agent.energyStepSize']).toBe(0.5);
    expect(optionById('aiBullishness', 'substantial').values['agent.energyStepMonth']).toBe(96);
    expect(optionById('aiBullishness', 'high').values['agent.energyStepSize']).toBe(0.75);
    expect(optionById('aiBullishness', 'high').values['agent.energyStepMonth']).toBe(72);
    expect(optionById('aiBullishness', 'extreme').values['agent.energyStepSize']).toBe(0.9);
    expect(optionById('aiBullishness', 'extreme').values['agent.energyStepMonth']).toBe(48);
  });
});

function run(sliders: Record<string, number | string>, ticks = 48): SimulationResult {
  return simulate(loadScenario({ name: 'agent-cost', seed: 3, ticks, sliders }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
