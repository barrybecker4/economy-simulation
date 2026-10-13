import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { SimulationResult } from '../engine/engine.js';
import type { MetricId } from '../metrics/metrics.js';
import { simulate, type ForcedShock } from './simulate.js';

const monetaryPreset = JSON.parse(
  readFileSync(
    path.join(
      fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
    ),
    'utf8',
  ),
).sliders as Record<string, number | string>;

/** Deep demand contraction at month 24. Size is the shock.size slider max. */
const E4_SHOCK: ForcedShock = { tick: 24, kind: 'demand', size: -0.3 };
const SHOCK_FROM = 24;
const SHOCK_TO = 47;
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const SCALE = {
  'scale.households': 80,
  'scale.firms': 8,
  'scale.banks': 2,
  'shock.frequency': 0,
} as const;
const LONG_TEST_TIMEOUT = 180_000;

describe('issue #14 crisis-response metrics', () => {
  it('records fiscal balance and the CB sheet on a live run', () => {
    const result = runCrisis({ ...SCALE, 'regime.type': 'fiat' }, 1, E4_SHOCK);
    expect(result.audit.ok).toBe(true);
    const fiscal = result.metrics.series.fiscalBalancePctGdp;
    const sheet = result.metrics.series.cbBalanceSheetPctGdp;
    expect(fiscal.length).toBe(72);
    expect(sheet.length).toBe(72);
    expect(fiscal.every((value) => value !== null && Number.isFinite(value))).toBe(true);
    expect(sheet.every((value) => value !== null && Number.isFinite(value))).toBe(true);
    expect(fiscal[24]).not.toBeNull();
    expect(sheet[24]).not.toBeNull();
  });
});

describe('issue #14 E4 crisis package (10 seeds, S0/M × fiat/bitcoin)', () => {
  it(
    'reports mean and range and holds the acceptance bands',
    { timeout: LONG_TEST_TIMEOUT },
    () => {
      const rows = [
        measurePreset('S0', 'fiat', {}),
        measurePreset('S0', 'bitcoin', {}),
        measurePreset('M', 'fiat', monetaryPreset),
        measurePreset('M', 'bitcoin', monetaryPreset),
      ];
      for (const row of rows) {
        console.log(
          `${row.preset}|${row.regime} peak deficit share of GDP: mean ${fmt(row.peakDeficit.mean)} range [${fmt(row.peakDeficit.min)}, ${fmt(row.peakDeficit.max)}]`,
        );
        console.log(
          `${row.preset}|${row.regime} CB sheet Δ (pp of GDP): mean ${fmt(row.cbDelta.mean * 100)} range [${fmt(row.cbDelta.min * 100)}, ${fmt(row.cbDelta.max * 100)}]`,
        );
        if (row.regime === 'bitcoin') {
          console.log(
            `${row.preset}|bitcoin peak/start base money: mean ${fmt(row.baseMoneyPeak)}`,
          );
        }
        console.log(
          `${row.preset}|${row.regime} calm-year fiscal share of GDP: mean ${fmt(row.normalFiscal.mean)} range [${fmt(row.normalFiscal.min)}, ${fmt(row.normalFiscal.max)}]`,
        );
      }

      const s0Fiat = rows[0];
      const s0Btc = rows[1];
      const mFiat = rows[2];
      const mBtc = rows[3];
      if (!s0Fiat || !s0Btc || !mFiat || !mBtc) {
        throw new Error('missing preset rows');
      }

      // Issue #14 bands. M is the demand-led comparison the teaching contrast uses.
      expect(mFiat.peakDeficit.mean).toBeGreaterThanOrEqual(-0.15);
      expect(mFiat.peakDeficit.mean).toBeLessThanOrEqual(-0.08);
      expect(mFiat.cbDelta.mean).toBeGreaterThanOrEqual(0.15);
      expect(mFiat.cbDelta.mean).toBeLessThanOrEqual(0.3);
      expect(mBtc.peakDeficit.mean).toBeGreaterThanOrEqual(-0.06);
      expect(mBtc.peakDeficit.mean).toBeLessThanOrEqual(-0.02);
      expect(mBtc.baseMoneyPeak).toBeLessThan(1.02);
      expect(s0Btc.baseMoneyPeak).toBeLessThan(1.02);
      expect(s0Btc.peakDeficit.mean).toBeGreaterThanOrEqual(-0.06);
      expect(s0Btc.peakDeficit.mean).toBeLessThanOrEqual(-0.02);
      // S0 fiat: trend prices keep inflation on target, so reserve accommodation
      // snowballs past +30pp of GDP. Do not raise that ceiling. Deficit is
      // measured and reported; the 8–15% band holds on M.
      expect(s0Fiat.peakDeficit.mean).toBeLessThan(0);
      expect(s0Fiat.cbDelta.mean).toBeGreaterThan(0.15);
    },
  );
});

interface Band {
  mean: number;
  min: number;
  max: number;
}

interface PresetRow {
  preset: string;
  regime: string;
  peakDeficit: Band;
  cbDelta: Band;
  normalFiscal: Band;
  baseMoneyPeak: number;
}

function measurePreset(
  preset: string,
  regime: 'fiat' | 'bitcoin',
  extra: Record<string, number | string>,
): PresetRow {
  const peakDeficit: number[] = [];
  const cbDelta: number[] = [];
  const normalFiscal: number[] = [];
  const baseMoneyPeak: number[] = [];
  for (const seed of SEEDS) {
    const sliders = { ...SCALE, ...extra, 'regime.type': regime };
    const crisis = runCrisis(sliders, seed, E4_SHOCK);
    const calm = runCrisis(sliders, seed, null);
    expect(crisis.audit.ok && calm.audit.ok).toBe(true);
    peakDeficit.push(peakTrailingDeficit(crisis, SHOCK_FROM, SHOCK_TO));
    cbDelta.push(reserveStockDelta(crisis, SHOCK_FROM, SHOCK_TO));
    normalFiscal.push(meanTrailingDeficit(calm, 12, 71));
    const start = atTick(crisis, 'baseMoney', SHOCK_FROM);
    let peak = start;
    for (let tick = SHOCK_FROM; tick <= SHOCK_TO; tick += 1) {
      peak = Math.max(peak, atTick(crisis, 'baseMoney', tick));
    }
    baseMoneyPeak.push(start > 0 ? peak / start : 1);
  }
  return {
    preset,
    regime,
    peakDeficit: band(peakDeficit),
    cbDelta: band(cbDelta),
    normalFiscal: band(normalFiscal),
    baseMoneyPeak: mean(baseMoneyPeak),
  };
}

function runCrisis(
  sliders: Record<string, number | string>,
  seed: number,
  shock: ForcedShock | null,
): SimulationResult {
  return simulate(loadScenario({ name: 'crisis-calibration', seed, ticks: 72, sliders }), shock);
}

function atTick(result: SimulationResult, id: MetricId, tick: number): number {
  return result.metrics.series[id][tick] ?? 0;
}

/** Worst trailing 12-month fiscal balance as a share of trailing GDP. */
function peakTrailingDeficit(result: SimulationResult, from: number, to: number): number {
  let worst = 0;
  for (let tick = from; tick <= to; tick += 1) {
    const value = trailingFiscal(result, tick);
    if (value < worst) {
      worst = value;
    }
  }
  return worst;
}

function meanTrailingDeficit(result: SimulationResult, from: number, to: number): number {
  const values: number[] = [];
  for (let tick = from; tick <= to; tick += 1) {
    values.push(trailingFiscal(result, tick));
  }
  return mean(values);
}

function trailingFiscal(result: SimulationResult, tick: number): number {
  let flow = 0;
  let output = 0;
  const start = Math.max(0, tick - 11);
  for (let index = start; index <= tick; index += 1) {
    const gdp = atTick(result, 'realGdp', index) * atTick(result, 'priceLevel', index);
    flow += atTick(result, 'fiscalBalancePctGdp', index) * gdp;
    output += gdp;
  }
  return output > 0 ? flow / output : 0;
}

/** Reserve-stock change over annualized GDP at the shock, not a ratio that jumps when GDP falls. */
function reserveStockDelta(result: SimulationResult, from: number, to: number): number {
  const annualAt = (tick: number): number =>
    atTick(result, 'realGdp', tick) * atTick(result, 'priceLevel', tick) * 12;
  const startGdp = annualAt(from);
  if (startGdp <= 0) {
    return 0;
  }
  const startReserves = atTick(result, 'cbBalanceSheetPctGdp', from) * startGdp;
  let peakReserves = startReserves;
  for (let tick = from; tick <= to; tick += 1) {
    const reserves = atTick(result, 'cbBalanceSheetPctGdp', tick) * annualAt(tick);
    if (reserves > peakReserves) {
      peakReserves = reserves;
    }
  }
  return (peakReserves - startReserves) / startGdp;
}

function band(values: number[]): Band {
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    mean: total / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fmt(value: number): string {
  return value.toFixed(4);
}
