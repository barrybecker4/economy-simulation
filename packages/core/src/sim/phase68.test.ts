import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import {
  agreedWage,
  employmentTarget,
  fiatWageCatchUpScale,
  hiringReferenceRealWage,
} from './labor.js';
import { loadParameters } from './parameters.js';
import { simulate, type ForcedShock } from './simulate.js';

describe('phase 68 hiring reference without tightness or impulse', () => {
  it('builds the hiring reference from markup and productivity alone', () => {
    expect(hiringReferenceRealWage({ markup: 0.2, productivity: 1.1 })).toBeCloseTo(
      (1 / 1.2) * 1.1,
      12,
    );
  });

  it('keeps the agreed wage on tightness and omits the productivity impulse', () => {
    expect(
      agreedWage({
        priceLevel: 120,
        markup: 0.2,
        productivity: 1.1,
        tightness: -0.1,
      }),
    ).toBeCloseTo(120 * (1 / 1.2) * 1.1 * (1 + 0.4 * -0.1), 12);
  });

  it('leaves the employment quota unchanged when a productivity impulse is active', () => {
    const economy = opened({ 'labor.wageElasticity': 0.5 });
    economy.productivityImpulse = 0;
    const calm = employmentTarget(economy);
    economy.productivityImpulse = -0.2;
    expect(employmentTarget(economy)).toBe(calm);
  });

  it('keeps some upward wage catch-up under mild fiat inflation overshoot', () => {
    expect(fiatWageCatchUpScale(0, 0.02)).toBe(1);
    expect(fiatWageCatchUpScale(0.02, 0.02)).toBeGreaterThanOrEqual(0.5);
    expect(fiatWageCatchUpScale(0.02, 0.02)).toBeCloseTo(0.5, 12);
    expect(fiatWageCatchUpScale(0.01, 0.02)).toBeCloseTo(0.75, 12);
  });

  it('does not cap hiring for fiat inflation alone when there is no supply shock', () => {
    const economy = opened({ 'labor.wageElasticity': 1, 'regime.type': 'fiat' });
    // Cheap real wage → hiringScale above 1 unless capped.
    economy.wageLevel = economy.priceLevel * 0.5;
    economy.priceHistory.splice(
      0,
      economy.priceHistory.length,
      ...Array.from({ length: 13 }, (_, index) => 100 * 1.1 ** (index / 12)),
    );
    economy.productivityImpulse = 0;
    const open = employmentTarget(economy);
    economy.productivityImpulse = -0.2;
    const capped = employmentTarget(economy);
    expect(open).toBeGreaterThan(capped);
  });

  it('does not climb through high bitcoin unemployment under hoarding and firm-level hiring', () => {
    const result = simulate(
      loadScenario({
        name: 'phase68-hoarding',
        seed: 4,
        ticks: 240,
        sliders: {
          ...FEATURE_OFF,
          'scale.households': 40,
          'scale.firms': 4,
          'scale.banks': 1,
          'shock.frequency': 0,
          'regime.type': 'bitcoin',
          'prices.trendWeight': 0,
          'production.demandWeight': 1,
          'labor.firmLevelHiring': 'on',
          'household.realReturnSensitivity': 3,
        },
      }),
    );
    expect(result.audit.ok).toBe(true);
    const path = series(result, 'unemployment');
    const average = path.reduce((sum, value) => sum + value, 0) / Math.max(path.length, 1);
    expect(average).toBeLessThan(0.2);
    expect(path.at(-1) ?? 0).toBeLessThan(0.25);
  });

  it('cuts real GDP in a supply shock without a hiring boom in the window or recovery', () => {
    const calm = runSticky('fiat', null);
    const slump = runSticky('fiat', { tick: 24, kind: 'productivity', size: -0.1 });
    const flexible = runFlexible('fiat', { tick: 24, kind: 'productivity', size: -0.1 });
    const flexibleCalm = runFlexible('fiat', null);
    expect(calm.audit.ok && slump.audit.ok && flexible.audit.ok).toBe(true);
    expect(gdpLoss(slump, calm, 24, 47)).toBeGreaterThan(0.02);
    // Capacity-only shock: unemployment may stay flat, but must not fall into a boom.
    // A mild under-shoot in recovery is allowed while wages catch up under soft damp.
    expect(meanUnemploymentGap(slump, calm, 24, 47)).toBeGreaterThanOrEqual(-0.02);
    expect(meanUnemploymentGap(slump, calm, 48, 71)).toBeGreaterThanOrEqual(-0.04);
    expect(meanUnemploymentGap(flexible, flexibleCalm, 24, 35)).toBeGreaterThanOrEqual(-0.02);
  });

  it('keeps bitcoin and fiat real-GDP losses close with firm-level hiring off', () => {
    const fiatCalm = runHiringOff('fiat', null);
    const fiatSlump = runHiringOff('fiat', { tick: 24, kind: 'productivity', size: -0.1 });
    const bitcoinCalm = runHiringOff('bitcoin', null);
    const bitcoinSlump = runHiringOff('bitcoin', {
      tick: 24,
      kind: 'productivity',
      size: -0.1,
    });
    expect(fiatSlump.audit.ok && bitcoinSlump.audit.ok).toBe(true);
    const fiatLoss = gdpLoss(fiatSlump, fiatCalm, 24, 47);
    const bitcoinLoss = gdpLoss(bitcoinSlump, bitcoinCalm, 24, 47);
    expect(fiatLoss).toBeGreaterThan(0);
    expect(bitcoinLoss).toBeGreaterThan(0);
    expect(Math.abs(fiatLoss - bitcoinLoss)).toBeLessThan(0.04);
  });
});

function opened(sliders: Record<string, number | string>) {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'phase68-quota',
        seed: 1,
        ticks: 1,
        sliders: {
          ...FEATURE_OFF,
          'scale.households': 40,
          'scale.firms': 4,
          'scale.banks': 1,
          'regime.type': 'fiat',
          ...sliders,
        },
      }),
    ),
    1,
    null,
  );
}

function runSticky(regime: string, shock: ForcedShock | null): SimulationResult {
  return simulate(
    loadScenario({
      name: 'phase68-sticky',
      seed: 3,
      ticks: 72,
      sliders: {
        ...FEATURE_OFF,
        'scale.households': 60,
        'scale.firms': 6,
        'scale.banks': 1,
        'shock.frequency': 0,
        'regime.type': regime,
        'wage.nominalRigidity': 0.95,
        'labor.wageElasticity': 0.5,
      },
    }),
    shock,
  );
}

function runFlexible(regime: string, shock: ForcedShock | null): SimulationResult {
  return simulate(
    loadScenario({
      name: 'phase68-flexible',
      seed: 3,
      ticks: 72,
      sliders: {
        ...FEATURE_OFF,
        'scale.households': 60,
        'scale.firms': 6,
        'scale.banks': 1,
        'shock.frequency': 0,
        'regime.type': regime,
        'wage.nominalRigidity': 0,
        'labor.wageElasticity': 0.5,
      },
    }),
    shock,
  );
}

function runHiringOff(regime: string, shock: ForcedShock | null): SimulationResult {
  return simulate(
    loadScenario({
      name: 'phase68-hiring-off',
      seed: 3,
      ticks: 72,
      sliders: {
        ...FEATURE_OFF,
        'scale.households': 60,
        'scale.firms': 6,
        'scale.banks': 1,
        'shock.frequency': 0,
        'regime.type': regime,
        'labor.firmLevelHiring': 'off',
        'wage.nominalRigidity': 0.9,
        'labor.wageElasticity': 0.5,
      },
    }),
    shock,
  );
}

function meanUnemploymentGap(
  shocked: SimulationResult,
  calm: SimulationResult,
  from: number,
  to: number,
): number {
  let total = 0;
  let count = 0;
  for (let tick = from; tick <= to; tick += 1) {
    total +=
      (series(shocked, 'unemployment')[tick] ?? 0) - (series(calm, 'unemployment')[tick] ?? 0);
    count += 1;
  }
  return total / Math.max(count, 1);
}

function gdpLoss(
  shocked: SimulationResult,
  calm: SimulationResult,
  from: number,
  to: number,
): number {
  let shockedTotal = 0;
  let calmTotal = 0;
  for (let tick = from; tick <= to; tick += 1) {
    shockedTotal += series(shocked, 'realGdp')[tick] ?? 0;
    calmTotal += series(calm, 'realGdp')[tick] ?? 0;
  }
  return (calmTotal - shockedTotal) / Math.max(calmTotal, 1);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
