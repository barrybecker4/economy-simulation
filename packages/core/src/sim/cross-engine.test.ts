import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import { simulate } from './simulate.js';

/**
 * Chrome 148 and Node 25 disagreed on these two satoshi paths when exp, log,
 * sin, and cos came from the host. The checksum is FNV-1a of the IEEE-754 bits,
 * so a one-ulp change fails. Fiat cent paths round that noise away; these do not.
 */
const SERIES = [
  'unemployment',
  'inflation',
  'priceLevel',
  'realGdp',
  'moneySupply',
  'meanRealConsumption',
] as const satisfies readonly MetricId[];

const SCALE = {
  'scale.households': 80,
  'scale.firms': 8,
  'scale.banks': 2,
} as const;

describe('cross-engine series', () => {
  it('pins bitcoin with no inherited mortgages for seed 1 through year 20', () => {
    const result = run({
      ...SCALE,
      'regime.type': 'bitcoin',
      'housing.openingMortgageShareOfOwners': 0,
    });
    expect(result.audit.ok).toBe(true);
    expect(checksum(result)).toBe('c03c19d96fc248dc');
  });

  it('pins a gradual fiat-to-bitcoin transition for seed 1 through year 20', () => {
    const result = run({
      ...SCALE,
      'regime.type': 'fiat',
      'transition.lengthMonths': 120,
      'transition.gradualWeight': 1,
    });
    expect(result.audit.ok).toBe(true);
    expect(checksum(result)).toBe('4ff293a433f8dc97');
  });
});

function run(sliders: Record<string, number | string>) {
  return simulate(loadScenario({ name: 'cross-engine', seed: 1, ticks: 240, sliders }));
}

function checksum(result: ReturnType<typeof run>): string {
  let hash = 0xcbf29ce484222325n;
  const bytes = new ArrayBuffer(8);
  const view = new DataView(bytes);
  for (const id of SERIES) {
    for (const value of result.metrics.series[id]) {
      if (value === null) {
        hash ^= 0xffn;
      } else {
        view.setFloat64(0, value);
        hash ^= view.getBigUint64(0);
      }
      hash = BigInt.asUintN(64, hash * 0x100000001b3n);
    }
  }
  return hash.toString(16).padStart(16, '0');
}
