import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { SimulationResult } from '../engine/engine.js';
import type { MetricId } from '../metrics/metrics.js';
import { runTransitionComparison } from './transition.js';
import { simulate } from '../sim/simulate.js';

const scale = {
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
};

const otherPrices = [
  'priceGeneral',
  'priceFood',
  'priceHousing',
  'priceEnergy',
  'priceApparel',
  'priceTransportation',
  'priceMedical',
  'priceEducation',
  'priceRecreation',
] as const satisfies readonly MetricId[];

const transitionMetrics = [
  'medianRealConsumption',
  'medianRealWealth',
  'unemployment',
  'medianDebtService',
  'mortgageShare',
  'rentShare',
  'ownedShare',
] as const satisfies readonly MetricId[];

const transitionSeeds = [1, 2, 3, 4, 5];

describe('methods claims', () => {
  it('lowers the CPI when fixed money meets rapid AI adoption and sticky wages', () => {
    const quiet = run({
      ...scale,
      'regime.type': 'bitcoin',
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
    });
    const fast = run({
      ...scale,
      'regime.type': 'bitcoin',
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'wage.nominalRigidity': 0.9,
    });
    expect(last(fast, 'priceLevel')).toBeLessThan(last(quiet, 'priceLevel'));
  });

  it('changes ending real GDP when both regimes take the same shocks', () => {
    const shocks = { ...scale, 'shock.frequency': 1, 'shock.size': 0.1 };
    const fiat = run({ ...shocks, 'regime.type': 'fiat' });
    const bitcoin = run({ ...shocks, 'regime.type': 'bitcoin' });
    expect(series(fiat, 'demandImpulse')).toEqual(series(bitcoin, 'demandImpulse'));
    expect(series(fiat, 'creditImpulse')).toEqual(series(bitcoin, 'creditImpulse'));
    expect(series(fiat, 'productivityImpulse')).toEqual(series(bitcoin, 'productivityImpulse'));
    const moved = series(fiat, 'demandImpulse').some(
      (value, index) =>
        value !== 0 ||
        (series(fiat, 'creditImpulse')[index] ?? 0) !== 0 ||
        (series(fiat, 'productivityImpulse')[index] ?? 0) !== 0,
    );
    expect(moved).toBe(true);
    expect(last(fiat, 'realGdp')).not.toBe(last(bitcoin, 'realGdp'));
  });

  it('lowers the labor share under fast adoption and changes the wealth Gini with ownership', () => {
    const quiet = run({ ...scale, 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3 });
    const fast = run({ ...scale, 'ai.adoptionMidpointYear': 3, 'ai.adoptionSteepness': 1.2 });
    const spread = run({
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.ownershipConcentration': 0.2,
    });
    expect(last(fast, 'laborShare')).toBeLessThan(last(quiet, 'laborShare'));
    expect(last(fast, 'giniWealth')).not.toBe(last(spread, 'giniWealth'));
  });

  it('raises the AI transaction share when fiat payment friction is lower', () => {
    const fast = {
      ...scale,
      'regime.type': 'fiat',
      'ai.adoptionMidpointYear': 1,
      'ai.adoptionSteepness': 1.5,
    };
    const easy = run({ ...fast, 'ai.paymentFrictionFiat': 0 }, 48);
    const hard = run({ ...fast, 'ai.paymentFrictionFiat': 0.1 }, 48);
    expect(last(easy, 'aiShareOfTransactions')).toBeGreaterThan(
      last(hard, 'aiShareOfTransactions'),
    );
  });

  it('holds full-reserve credit no higher than maturity-matched credit', () => {
    const bitcoin = { ...scale, 'regime.type': 'bitcoin', 'shock.frequency': 1 };
    const matched = run({ ...bitcoin, 'bitcoin.lendingModel': 'maturityMatched' });
    const full = run({ ...bitcoin, 'bitcoin.lendingModel': 'fullReserve' });
    expect(last(full, 'loanToSavings')).toBeLessThanOrEqual(last(matched, 'loanToSavings'));
  });

  it('lowers productivity per human when more tasks stay physical', () => {
    const adopting = {
      ...scale,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.roboticsStartYear': 50,
    };
    const flexible = run({ ...adopting, 'ai.physicalTaskShare': 0.1 });
    const physical = run({ ...adopting, 'ai.physicalTaskShare': 0.7 });
    expect(last(physical, 'productivityPerHuman')).toBeLessThan(
      last(flexible, 'productivityPerHuman'),
    );
  });

  it('cuts credit to GDP and raises the profit-sharing share when deflation sensitivity is higher', () => {
    const mild = run({ ...scale, 'regime.type': 'bitcoin', 'deflation.sensitivity': 0 });
    const sharp = run({ ...scale, 'regime.type': 'bitcoin', 'deflation.sensitivity': 5 });
    expect(last(sharp, 'creditToGdp')).toBeLessThan(last(mild, 'creditToGdp'));
    expect(last(sharp, 'profitSharingShare')).toBeGreaterThan(last(mild, 'profitSharingShare'));
  });

  it('cheapens electronics and raises housing inside a rising fiat CPI and a falling bitcoin CPI', () => {
    const fiat = run(scale);
    const bitcoin = run({ ...scale, 'regime.type': 'bitcoin' });
    expect(last(fiat, 'priceLevel')).toBeGreaterThan(opening(fiat, 'priceLevel'));
    expect(last(bitcoin, 'priceLevel')).toBeLessThan(opening(bitcoin, 'priceLevel'));
    expect(last(bitcoin, 'inflation')).toBeLessThan(last(fiat, 'inflation'));
    expectBasket(fiat);
    expectBasket(bitcoin);
  });

  it('reports median, 5th, and 95th percentile bands for the three transition paths', () => {
    const reports = runTransitionComparison(transitionSeeds);
    expect(reports.map((report) => report.path)).toEqual(['fiat', 'bitcoin', 'transition']);
    for (const spec of transitionPaths()) {
      const endings = Object.fromEntries(
        transitionMetrics.map((id) => [id, [] as number[]]),
      ) as Record<(typeof transitionMetrics)[number], number[]>;
      for (const seed of transitionSeeds) {
        const result = simulate(
          loadScenario({ name: 'methods-transition', seed, ticks: 120, sliders: spec.sliders }),
        );
        expect(result.audit.ok, `${spec.path} seed ${seed}`).toBe(true);
        for (const id of transitionMetrics) {
          endings[id].push(last(result, id));
        }
      }
      const report = reports.find((item) => item.path === spec.path);
      for (const id of transitionMetrics) {
        const sorted = [...endings[id]].sort((left, right) => left - right);
        const band = report?.bands[id];
        expect(band?.p5, `${spec.path} ${id}`).toBe(sorted[0]);
        expect(band?.median, `${spec.path} ${id}`).toBe(sorted[2]);
        expect(band?.p95, `${spec.path} ${id}`).toBe(sorted[4]);
      }
    }
  }, 60_000);
});

function transitionPaths(): {
  path: 'fiat' | 'bitcoin' | 'transition';
  sliders: Record<string, number | string>;
}[] {
  const shared = {
    'housing.tenureChoice': 'on',
    'shock.frequency': 0,
    'scale.households': 40,
    'scale.firms': 4,
    'scale.banks': 1,
  };
  return [
    { path: 'fiat', sliders: { ...shared, 'regime.type': 'fiat', 'transition.lengthMonths': 0 } },
    {
      path: 'bitcoin',
      sliders: { ...shared, 'regime.type': 'bitcoin', 'transition.lengthMonths': 0 },
    },
    {
      path: 'transition',
      sliders: {
        ...shared,
        'regime.type': 'fiat',
        'transition.lengthMonths': 12,
        'transition.debtHaircut': 0.05,
        'transition.holderConcentration': 0.7,
      },
    },
  ];
}

function expectBasket(result: SimulationResult): void {
  const electronics = last(result, 'priceElectronics');
  for (const id of otherPrices) {
    expect(electronics, id).toBeLessThan(last(result, id));
  }
  expect(last(result, 'priceHousing')).toBeGreaterThan(last(result, 'priceLevel'));
}

function run(sliders: Record<string, number | string>, ticks = 36): SimulationResult {
  const result = simulate(loadScenario({ name: 'methods', seed: 4, ticks, sliders }));
  expect(result.audit.ok).toBe(true);
  return result;
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].map((value) => {
    if (value === null) {
      throw new Error(`${id} has a missing point`);
    }
    return value;
  });
}

function opening(result: SimulationResult, id: MetricId): number {
  return series(result, id)[0] ?? 0;
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
