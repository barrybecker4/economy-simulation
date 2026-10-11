import { describe, expect, it } from 'vitest';
import { DIGITAL_FRICTION } from './monies.js';
import { nextPayCurrency } from './hybrid-money.js';

describe('pay currency hysteresis', () => {
  it('opens on the higher score without a prior currency', () => {
    expect(nextPayCurrency(undefined, 1, 1.01)).toBe('bitcoin');
    expect(nextPayCurrency(undefined, 1, 0.99)).toBe('fiat');
  });

  it('does not flip when scores wiggle inside the friction band', () => {
    const fiat = 1;
    const nearTieBitcoin = fiat + DIGITAL_FRICTION * 0.5;
    expect(nextPayCurrency('fiat', fiat, nearTieBitcoin)).toBe('fiat');
    expect(nextPayCurrency('bitcoin', fiat, nearTieBitcoin)).toBe('bitcoin');

    // Real-return style ±0.01 wiggle around trust=legal=1 (bitcoin score ≈ 0.98 + r).
    // From fiat, neither wiggle clears the +friction lead needed to switch.
    expect(nextPayCurrency('fiat', 1, 0.98 + 0.01)).toBe('fiat');
    expect(nextPayCurrency('fiat', 1, 0.98 - 0.01)).toBe('fiat');
    // From bitcoin, a small positive return keeps the sticky bitcoin choice.
    expect(nextPayCurrency('bitcoin', 1, 0.98 + 0.01)).toBe('bitcoin');
    // At exact digital-friction deficit (score 0.98), fiat does not yet lead by the band.
    expect(nextPayCurrency('bitcoin', 1, 0.98)).toBe('bitcoin');
  });

  it('flips only when the other score leads by more than the friction band', () => {
    expect(nextPayCurrency('fiat', 1, 1 + DIGITAL_FRICTION)).toBe('fiat');
    expect(nextPayCurrency('fiat', 1, 1 + DIGITAL_FRICTION + 0.001)).toBe('bitcoin');
    expect(nextPayCurrency('bitcoin', 1 + DIGITAL_FRICTION, 1)).toBe('bitcoin');
    expect(nextPayCurrency('bitcoin', 1 + DIGITAL_FRICTION + 0.001, 1)).toBe('fiat');
  });
});
