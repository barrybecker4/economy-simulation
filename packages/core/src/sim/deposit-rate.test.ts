import { describe, expect, it } from 'vitest';
import { effectiveDepositPassThrough } from './deposit-rate.js';

describe('effective deposit pass-through', () => {
  it('applies the monetary preset beta to fiat only', () => {
    const monetary = { depositPassThrough: 1, fiatDepositPassThrough: 0.45 };
    expect(effectiveDepositPassThrough({ regime: 'fiat', ...monetary })).toBe(0.45);
    expect(effectiveDepositPassThrough({ regime: 'bitcoin', ...monetary })).toBe(1);
    expect(effectiveDepositPassThrough({ regime: 'hybrid', ...monetary })).toBe(1);
  });

  it('follows the shared slider when the fiat slider inherits', () => {
    const shared = { depositPassThrough: 0.45, fiatDepositPassThrough: -1 };
    expect(effectiveDepositPassThrough({ regime: 'fiat', ...shared })).toBe(0.45);
    expect(effectiveDepositPassThrough({ regime: 'bitcoin', ...shared })).toBe(0.45);
    expect(effectiveDepositPassThrough({ regime: 'hybrid', ...shared })).toBe(0.45);
  });

  it('keeps a fiat zero pass-through when the fiat slider is not set', () => {
    expect(
      effectiveDepositPassThrough({
        regime: 'fiat',
        depositPassThrough: 0,
        fiatDepositPassThrough: -1,
      }),
    ).toBe(0);
  });
});
