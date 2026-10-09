import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

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
    expect(series(low, 'unemployment')).toEqual(series(high, 'unemployment'));
    expect(series(low, 'aiShareOfOutput').every((value) => value === 0)).toBe(true);
    expect(series(low, 'ubiOutlay').every((value) => value === 0)).toBe(true);
    expect(series(high, 'ubiOutlay').every((value) => value === 0)).toBe(true);
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

  it('raises unemployment without cutting real GDP when adoption is fast', () => {
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
      expect(last(fast, 'unemployment'), regime).toBeGreaterThan(last(quiet, 'unemployment'));
      expect(last(fast, 'naturalUnemployment'), regime).toBeGreaterThan(
        last(quiet, 'naturalUnemployment'),
      );
      expect(last(fast, 'realGdp'), regime).toBeGreaterThan(last(quiet, 'realGdp'));
    }
  });

  it('moves wages and the fiat policy rate less for a given unemployment gap once AI has grown', () => {
    const quiet = run({
      ...scale,
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
      'shock.frequency': 0,
      'wage.nominalRigidity': 0,
      'centralBank.outputWeight': 1.5,
    });
    const fast = run({
      ...scale,
      'ai.bullishness': 1,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
      'shock.frequency': 0,
      'wage.nominalRigidity': 0,
      'centralBank.outputWeight': 1.5,
    });
    const quietGap = last(quiet, 'naturalUnemployment') - last(quiet, 'unemployment');
    const fastGap = last(fast, 'naturalUnemployment') - last(fast, 'unemployment');
    const quietWage = last(quiet, 'realWage');
    const fastWage = last(fast, 'realWage');
    const quietRate = last(quiet, 'interestRate');
    const fastRate = last(fast, 'interestRate');
    expect(Math.abs(fastGap)).toBeLessThan(0.05);
    expect(Math.abs(quietGap)).toBeLessThan(0.05);
    expect(last(fast, 'unemployment')).toBeGreaterThan(last(quiet, 'unemployment') + 0.1);
    expect(Math.abs(fastRate - quietRate)).toBeLessThan(0.05);
    expect(fastWage).toBeGreaterThan(quietWage * 0.5);
  });

  it('pays a GDP-proportional grant that grows with the AI share of output', () => {
    const quiet = run({
      ...scale,
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
    });
    const off = run({
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
      'government.ubiShare': 0,
    });
    const on = run({
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
    });
    expect(series(quiet, 'ubiOutlay').every((value) => value === 0)).toBe(true);
    expect(series(off, 'ubiOutlay').every((value) => value === 0)).toBe(true);
    expect(last(on, 'ubiOutlay')).toBeGreaterThan(0);
    const early = series(on, 'ubiOutlay')[24] ?? 0;
    const late = last(on, 'ubiOutlay');
    expect(late).toBeGreaterThan(early);
    const aiShare = last(on, 'aiShareOfOutput');
    const nominalGdp = last(on, 'priceLevel') * last(on, 'realGdp');
    expect(late).toBeCloseTo(0.25 * aiShare * nominalGdp, -1);
    expect(last(on, 'meanRealConsumption')).toBeGreaterThan(last(off, 'meanRealConsumption'));
  });

  it('schedules owners in id order and ignores ownership concentration', () => {
    const shared = {
      ...scale,
      'ai.adoptionMidpointYear': 1,
      'ai.adoptionSteepness': 0.4,
      'ai.ownerShareCeiling': 0.95,
      'ai.agentsPerOwnerCeiling': 20,
    };
    const low = run({ ...shared, 'ai.ownershipConcentration': 0.2 });
    const high = run({ ...shared, 'ai.ownershipConcentration': 0.9 });
    expect(last(low, 'aiShareOfAgents')).toBeGreaterThan(0.9);
    expect(last(high, 'aiShareOfAgents')).toBeCloseTo(last(low, 'aiShareOfAgents'), 12);
    expect(last(low, 'ownerWealthShare')).toBeGreaterThan(0.9);
    expect(last(high, 'ownerWealthShare')).toBeGreaterThan(0.9);
  });

  it('creates no agents when the automatable share is flat', () => {
    const result = run({
      ...scale,
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
      'ai.adoptionMidpointYear': 1,
    });
    expect(series(result, 'aiShareOfAgents').every((value) => value === 0)).toBe(true);
  });

  it('taxes and shops agents when the adoption curve is underway', () => {
    const none = run({
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
      'ai.ownerShareCeiling': 0,
    });
    const agents = run({
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
      'ai.paymentFrictionFiat': 0,
    });
    expect(last(none, 'aiShareOfAgents')).toBe(0);
    expect(last(agents, 'aiShareOfAgents')).toBeGreaterThan(0);
    expect(last(agents, 'agentTaxRevenue')).toBeGreaterThan(0);
    expect(last(none, 'agentTaxRevenue')).toBe(0);
    expect(last(agents, 'taxRevenue')).toBeGreaterThanOrEqual(last(agents, 'agentTaxRevenue'));
    expect(Math.max(...series(agents, 'agentGoodsSpend'))).toBeGreaterThan(0);
    expect(Math.max(...series(none, 'agentGoodsSpend'))).toBe(0);
  });

  it('delivers less growth when more tasks stay physical', () => {
    const flexible = run({
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
      'ai.roboticsStartYear': 50,
    });
    const physical = run({
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.7,
      'ai.roboticsStartYear': 50,
    });
    expect(last(physical, 'productivityPerHuman')).toBeLessThan(
      last(flexible, 'productivityPerHuman'),
    );
  });
});

function run(sliders: Record<string, number | string>): SimulationResult {
  return simulate(
    loadScenario({ name: 'ai', seed: 8, ticks: 120, sliders: { ...FEATURE_OFF, ...sliders } }),
  );
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
