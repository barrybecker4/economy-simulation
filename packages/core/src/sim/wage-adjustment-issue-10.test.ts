/**
 * Issue #10: wage adjustment shape from expected vs unexpected deflation.
 *
 * Bitcoin acceptance is gold-standard history, not fiat-era job-stayer cut
 * rates. See docs/wage-adjustment-issue-10.md.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate, type ForcedShock } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const VERIFY_TICKS = 240;
const VERIFY_START = 24;
const LONG_TEST_TIMEOUT = 180_000;
const SMALL = {
  'scale.households': 80,
  'scale.firms': 8,
  'scale.banks': 1,
  'ai.automatableShareStart': 0.3,
  'ai.automatableShareEnd': 0.3,
};

const monetaryPreset = JSON.parse(
  readFileSync(
    path.join(
      fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
    ),
    'utf8',
  ),
).sliders as Record<string, number | string>;

describe('wage adjustment formulas stay on the public labor seam', () => {
  it('does not freeze bitcoin expected-deflation cuts when the hold is off', () => {
    const result = run(
      {
        ...FEATURE_OFF,
        ...SMALL,
        'regime.type': 'bitcoin',
        'shock.frequency': 0,
        ticks: 48,
      },
      null,
    );
    const wages = nominalWages(result);
    expect(wages.at(-1) ?? 0).toBeLessThan(wages[12] ?? 0);
    expect(at(result, 'realWage', 47)).toBeGreaterThan(at(result, 'realWage', 12));
  });
});

describe('issue #10 fiat shape', () => {
  it('piles many fiat months at a near-zero wage change', () => {
    const result = run({
      ...SMALL,
      'regime.type': 'fiat',
      'shock.frequency': 0,
      ticks: 120,
    });
    const zeros = zeroChangeMonthShare(result, 24, 120);
    expect(zeros).toBeGreaterThan(0.25);
    expect(yoyDeclineShare(result, 24, 120)).toBeLessThan(0.08);
  });
});

describe('issue #10 bitcoin gold-standard shape', () => {
  it('lets expected deflation cut money wages while real wages rise', () => {
    const result = run({
      ...SMALL,
      'regime.type': 'bitcoin',
      'shock.frequency': 0,
      ticks: 180,
    });
    expect(yoyDeclineShare(result, 24, 180)).toBeGreaterThan(0.08);
    expect(at(result, 'realWage', 179)).toBeGreaterThan(at(result, 'realWage', 24) * 1.02);
  });

  it('holds money wages after an unexpected demand crash, then falls by less than prices', () => {
    const shock: ForcedShock = { tick: 36, kind: 'demand', size: -0.3 };
    const result = run(
      {
        ...FEATURE_OFF,
        ...SMALL,
        'regime.type': 'bitcoin',
        'wage.unexpectedHoldMonths': 18,
        'wage.reviewMonths': 0,
        'prices.trendWeight': 0,
        'production.demandWeight': 1,
        'shock.frequency': 0,
        ticks: 96,
      },
      shock,
    );
    const delay = frozenWageMonths(result, 36);
    expect(delay).toBeGreaterThanOrEqual(12);
    expect(delay).toBeLessThanOrEqual(24);

    const crashEnd = 48;
    const wageDrop = relativeChange(nominalWage(result, 36), nominalWage(result, crashEnd));
    const priceDrop = relativeChange(
      at(result, 'priceLevel', 36),
      at(result, 'priceLevel', crashEnd),
    );
    expect(priceDrop).toBeLessThan(-0.01);
    expect(wageDrop).toBeGreaterThan(priceDrop);
  });

  it('holds longer when expectations stay anchored than when they trail', () => {
    const shock: ForcedShock = { tick: 36, kind: 'demand', size: -0.3 };
    const sliders = {
      ...FEATURE_OFF,
      ...SMALL,
      'regime.type': 'bitcoin',
      'wage.unexpectedHoldMonths': 18,
      'wage.reviewMonths': 0,
      'shock.frequency': 0,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      ticks: 84,
    };
    const anchored = run({ ...sliders, 'expectations.anchorWeight': 0.9 }, shock);
    const trailing = run({ ...sliders, 'expectations.anchorWeight': 0 }, shock);
    expect(frozenWageMonths(anchored, 36)).toBeGreaterThanOrEqual(frozenWageMonths(trailing, 36));
  });
});

describe('issue #10 ten-seed verification', { timeout: LONG_TEST_TIMEOUT }, () => {
  it('reports mean and range for S0/M × fiat/bitcoin', () => {
    const rows = [
      measureArm('S0', 'fiat', false),
      measureArm('S0', 'bitcoin', false),
      measureArm('M', 'fiat', false),
      measureArm('M', 'bitcoin', false),
    ];
    for (const row of rows) {
      expect(row.auditOk).toBe(true);
    }
    const s0Fiat = rows[0];
    const s0Btc = rows[1];
    const mFiat = rows[2];
    const mBtc = rows[3];
    expect(s0Fiat && s0Fiat.yoyDecline.mean).toBeLessThan(0.1);
    expect(mFiat && mFiat.yoyDecline.mean).toBeLessThan(0.15);
    expect(s0Btc && s0Btc.yoyDecline.mean).toBeGreaterThan(s0Fiat?.yoyDecline.mean ?? 1);
    expect(mBtc && mBtc.realWageRatio.mean).toBeGreaterThan(1);
    expect(s0Btc && s0Btc.realWageRatio.mean).toBeGreaterThan(1);

    const shock = measureBitcoinShock();
    expect(shock.delay.mean).toBeGreaterThanOrEqual(12);
    expect(shock.delay.mean).toBeLessThanOrEqual(24);
    expect(shock.wageOverPrice.mean).toBeLessThan(1);
    for (const row of [...rows, shock]) {
      // Printed into the verification doc from the test run.
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(row));
    }
  });
});

function measureArm(preset: 'S0' | 'M', regime: 'fiat' | 'bitcoin', shocksOn: boolean): ArmReading {
  const yoy: number[] = [];
  const cuts: number[] = [];
  const zeros: number[] = [];
  const realRatios: number[] = [];
  let auditOk = true;
  for (const seed of SEEDS) {
    const result = simulate(
      loadScenario({
        name: `issue10-${preset}-${regime}`,
        seed,
        ticks: VERIFY_TICKS,
        sliders: {
          ...(preset === 'M' ? monetaryPreset : {}),
          ...SMALL,
          'regime.type': regime,
          'shock.frequency': shocksOn ? 0.1 : 0,
        },
      }),
    );
    auditOk = auditOk && result.audit.ok;
    yoy.push(yoyDeclineShare(result, VERIFY_START, VERIFY_TICKS));
    cuts.push(momCutShare(result, VERIFY_START, VERIFY_TICKS));
    zeros.push(zeroChangeMonthShare(result, VERIFY_START, VERIFY_TICKS));
    realRatios.push(
      at(result, 'realWage', VERIFY_TICKS - 1) / at(result, 'realWage', VERIFY_START),
    );
  }
  return {
    preset,
    regime,
    auditOk,
    yoyDecline: stats(yoy),
    jobStayerCut: stats(cuts),
    zeroShare: stats(zeros),
    realWageRatio: stats(realRatios),
  };
}

function measureBitcoinShock(): {
  delay: RangeStats;
  wageOverPrice: RangeStats;
} {
  const delays: number[] = [];
  const ratios: number[] = [];
  const shock: ForcedShock = { tick: 36, kind: 'demand', size: -0.3 };
  for (const seed of SEEDS) {
    const result = simulate(
      loadScenario({
        name: 'issue10-btc-shock',
        seed,
        ticks: 96,
        sliders: {
          ...FEATURE_OFF,
          ...SMALL,
          'regime.type': 'bitcoin',
          'wage.unexpectedHoldMonths': 18,
          'wage.reviewMonths': 0,
          'prices.trendWeight': 0,
          'production.demandWeight': 1,
          'shock.frequency': 0,
        },
      }),
      shock,
    );
    delays.push(frozenWageMonths(result, 36));
    const wageDrop = relativeChange(nominalWage(result, 36), nominalWage(result, 48));
    const priceDrop = relativeChange(at(result, 'priceLevel', 36), at(result, 'priceLevel', 48));
    ratios.push(priceDrop === 0 ? 1 : wageDrop / priceDrop);
  }
  return { delay: stats(delays), wageOverPrice: stats(ratios) };
}

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  shock: ForcedShock | null = null,
): SimulationResult {
  const { ticks = 120, ...rest } = sliders;
  return simulate(loadScenario({ name: 'issue10', seed: 7, ticks, sliders: rest }), shock);
}

function series(result: SimulationResult, id: MetricId): Array<number | null> {
  return result.metrics.series[id];
}

function at(result: SimulationResult, id: MetricId, tick: number): number {
  return series(result, id)[tick] ?? 0;
}

function nominalWage(result: SimulationResult, tick: number): number {
  return at(result, 'realWage', tick) * at(result, 'priceLevel', tick);
}

function nominalWages(result: SimulationResult): number[] {
  return result.metrics.ticks.map((tick) => nominalWage(result, tick));
}

function yoyDeclineShare(result: SimulationResult, start: number, end: number): number {
  let declines = 0;
  let total = 0;
  for (let tick = start; tick < end; tick += 1) {
    const current = nominalWage(result, tick);
    const prior = nominalWage(result, tick - 12);
    if (!(prior > 0) || !(current > 0)) {
      continue;
    }
    total += 1;
    if (current < prior) {
      declines += 1;
    }
  }
  return total > 0 ? declines / total : 0;
}

function momCutShare(result: SimulationResult, start: number, end: number): number {
  let cuts = 0;
  let total = 0;
  for (let tick = start; tick < end; tick += 1) {
    const current = nominalWage(result, tick);
    const prior = nominalWage(result, tick - 1);
    if (!(prior > 0) || !(current > 0)) {
      continue;
    }
    total += 1;
    if (current < prior * (1 - 1e-9)) {
      cuts += 1;
    }
  }
  return total > 0 ? cuts / total : 0;
}

function zeroChangeMonthShare(result: SimulationResult, start: number, end: number): number {
  let zeros = 0;
  let total = 0;
  for (let tick = start; tick < end; tick += 1) {
    const current = nominalWage(result, tick);
    const prior = nominalWage(result, tick - 1);
    if (!(prior > 0) || !(current > 0)) {
      continue;
    }
    total += 1;
    if (Math.abs(current / prior - 1) < 1e-9) {
      zeros += 1;
    }
  }
  return total > 0 ? zeros / total : 0;
}

function frozenWageMonths(result: SimulationResult, shockTick: number): number {
  let held = 0;
  let best = 0;
  for (let tick = shockTick + 1; tick < result.metrics.ticks.length; tick += 1) {
    const current = nominalWage(result, tick);
    const prior = nominalWage(result, tick - 1);
    if (!(prior > 0) || !(current > 0)) {
      continue;
    }
    if (Math.abs(current / prior - 1) < 1e-9) {
      held += 1;
      if (held > best) {
        best = held;
      }
    } else {
      held = 0;
    }
  }
  return best;
}

function relativeChange(start: number, end: number): number {
  if (!(start > 0)) {
    return 0;
  }
  return end / start - 1;
}

function stats(values: number[]): RangeStats {
  const sorted = [...values].sort((left, right) => left - right);
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    mean: values.length > 0 ? sum / values.length : 0,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
  };
}

interface RangeStats {
  mean: number;
  min: number;
  max: number;
}

interface ArmReading {
  preset: 'S0' | 'M';
  regime: 'fiat' | 'bitcoin';
  auditOk: boolean;
  yoyDecline: RangeStats;
  jobStayerCut: RangeStats;
  zeroShare: RangeStats;
  realWageRatio: RangeStats;
}
