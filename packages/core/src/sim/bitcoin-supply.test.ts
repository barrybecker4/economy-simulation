import { describe, expect, it } from 'vitest';
import { bitcoinIssuanceRate, bitcoinReward, bitcoinSupply } from './bitcoin-supply.js';

describe('bitcoin issuance schedule', () => {
  it('starts in October 2026 with about 95 percent of the cap already mined', () => {
    const { stock, monthlyFlow } = bitcoinSupply(0);
    expect(stock / 21_000_000).toBeGreaterThan(0.95);
    expect(stock / 21_000_000).toBeLessThan(0.97);
    expect(monthlyFlow).toBeGreaterThan(0);
    expect(bitcoinReward(0)).toBe(3.125);
  });

  it('halves the block reward 18 months later and keeps issuance positive', () => {
    expect(bitcoinReward(18)).toBeCloseTo(1.5625, 12);
    expect(bitcoinIssuanceRate(0)).toBeGreaterThan(0);
    expect(bitcoinIssuanceRate(18)).toBeLessThan(bitcoinIssuanceRate(0));
    expect(bitcoinSupply(18).stock).toBeGreaterThan(bitcoinSupply(0).stock);
  });
});
