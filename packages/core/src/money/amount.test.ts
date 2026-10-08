import { describe, expect, it } from 'vitest';
import { exactCentSum } from './amount.js';

describe('exactCentSum', () => {
  it('keeps the total exact after the parts pass the safe integer range', () => {
    const part = 5_000_000_000_000_000;
    expect(Number.isSafeInteger(part)).toBe(true);
    expect(Number.isSafeInteger(part + part)).toBe(false);
    expect(exactCentSum([part, part, 0.4, 0.4])).toBe(10_000_000_000_000_001n);
  });
});
