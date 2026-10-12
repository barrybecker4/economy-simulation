import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  SUPPLY_SHOCK_HORIZON_MONTHS,
  SUPPLY_SHOCK_START_PRICE_USD,
  supplyShockPriceCents,
  supplyShockPriceUsd,
} from './supply-shock-price.js';

describe('supply-shock bitcoin price path', () => {
  it('opens at the published start price in dollars and cents', () => {
    expect(supplyShockPriceUsd(0)).toBe(SUPPLY_SHOCK_START_PRICE_USD);
    expect(supplyShockPriceCents(0)).toBe(SUPPLY_SHOCK_START_PRICE_USD * 100);
  });

  it('is deterministic across the 25-year model horizon', () => {
    const first = pricesThrough(SUPPLY_SHOCK_HORIZON_MONTHS);
    const second = pricesThrough(SUPPLY_SHOCK_HORIZON_MONTHS);
    expect(second).toEqual(first);
    expect(first).toHaveLength(SUPPLY_SHOCK_HORIZON_MONTHS + 1);
    // Golden hash is pinned on CI's Node version (.nvmrc). Host Math.sqrt in the
    // volatility draw is not bit-identical across V8 versions; see ADR 0026.
    expect(createHash('sha256').update(first.join(',')).digest('hex')).toBe(
      'c43fa9147ff1f0b1dd54bd3b9f523e8e90da96a41f1c46127f8da1237dad8de3',
    );
  });

  it('extrapolates past month 300 with constant log growth and no jump', () => {
    const p300 = supplyShockPriceUsd(SUPPLY_SHOCK_HORIZON_MONTHS);
    const p301 = supplyShockPriceUsd(SUPPLY_SHOCK_HORIZON_MONTHS + 1);
    const p302 = supplyShockPriceUsd(SUPPLY_SHOCK_HORIZON_MONTHS + 2);
    const p360 = supplyShockPriceUsd(SUPPLY_SHOCK_HORIZON_MONTHS + 60);
    expect(p301 / p300).toBeCloseTo(p302 / p301, 12);
    expect(p360 / p300).toBeCloseTo((p301 / p300) ** 60, 8);
    expect(Math.abs(Math.log(p301 / p300))).toBeGreaterThan(0);
  });
});

function pricesThrough(lastMonth: number): number[] {
  const prices: number[] = [];
  for (let month = 0; month <= lastMonth; month += 1) {
    prices.push(supplyShockPriceUsd(month));
  }
  return prices;
}
