import { describe, expect, it } from 'vitest';
import { cos, exp, log, sin } from './elementary.js';

describe('elementary functions', () => {
  it('matches the identities the simulation relies on', () => {
    expect(exp(0)).toBe(1);
    expect(exp(1)).toBeCloseTo(Math.E, 15);
    expect(log(1)).toBe(0);
    expect(log(Math.E)).toBeCloseTo(1, 14);
    expect(sin(0)).toBe(0);
    expect(cos(0)).toBe(1);
    expect(sin(Math.PI / 2)).toBeCloseTo(1, 15);
    expect(cos(Math.PI)).toBeCloseTo(-1, 15);
  });

  it('stays within two units in the last place of the platform library', () => {
    const samples = 512;
    let worst = 0;
    for (let index = 0; index < samples; index += 1) {
      const unit = (index + 0.5) / samples;
      worst = Math.max(
        worst,
        ulps(exp(unit * 80 - 40), Math.exp(unit * 80 - 40)),
        ulps(
          log(10 ** (((index + 1) / samples) * 8 - 6)),
          Math.log(10 ** (((index + 1) / samples) * 8 - 6)),
        ),
        ulps(sin(unit * Math.PI * 2), Math.sin(unit * Math.PI * 2)),
        ulps(cos(unit * Math.PI * 2), Math.cos(unit * Math.PI * 2)),
      );
    }
    // Host libraries already disagree by about one unit, so this bound has to
    // cover both. The pinned bits below are the cross-engine contract.
    expect(worst).toBeLessThanOrEqual(2);
  });

  it('pins a few results so a polynomial edit cannot pass silently', () => {
    expect(floatBits(exp(1))).toBe('4005bf0a8b14576a');
    expect(floatBits(log(2))).toBe('3fe62e42fefa39ef');
    expect(floatBits(sin(1))).toBe('3feaed548f090cee');
    expect(floatBits(cos(1))).toBe('3fe14a280fb5068c');
  });
});

function ulps(left: number, right: number): number {
  if (Object.is(left, right)) {
    return 0;
  }
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return left === right ? 0 : Number.POSITIVE_INFINITY;
  }
  const gap = Math.abs(left - right);
  const scale = Math.max(Math.abs(left), Math.abs(right), Number.MIN_VALUE);
  return gap / (Number.EPSILON * scale);
}

function floatBits(value: number): string {
  const bytes = new ArrayBuffer(8);
  const view = new DataView(bytes);
  view.setFloat64(0, value);
  return view.getBigUint64(0).toString(16).padStart(16, '0');
}
