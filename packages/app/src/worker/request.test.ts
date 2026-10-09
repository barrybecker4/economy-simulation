import { describe, expect, it, vi } from 'vitest';
import { FEATURE_OFF } from '../../../core/src/sim/feature-off.js';
import { handleRequest } from './request.js';
import { safeHandleRequest } from './safe.js';

const small = {
  'scale.households': 20,
  'scale.firms': 4,
  'scale.banks': 1,
};

describe('handleRequest', () => {
  it('runs the Austrian-leaning bitcoin path that used to break the stock journal', () => {
    const result = handleRequest({
      kind: 'run',
      seed: 3,
      ticks: 360,
      sliders: {
        ...FEATURE_OFF,
        'regime.type': 'bitcoin',
        'bank.capitalRatio': 0.16,
        'government.spendingShareOfGDP': 0.1,
        'deflation.sensitivity': 2,
      },
    });
    expect(result.kind).toBe('run');
    expect(result.ticks).toHaveLength(360);
    expect(result.series.unemployment).toHaveLength(360);
    expect(result.series.interestRate).toHaveLength(360);
    expect(result.series.creditToGdp).toHaveLength(360);
    expect(result.series.giniWealth).toHaveLength(360);
    expect(result.series.priceGeneral).toBeUndefined();
  }, 60_000);

  it('reports every tick of a run and a band', () => {
    const updates: Array<[number, number]> = [];
    const record = (completed: number, total: number): void => {
      updates.push([completed, total]);
    };
    handleRequest({ kind: 'run', seed: 1, ticks: 3, sliders: small }, record);
    expect(updates).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);

    updates.length = 0;
    handleRequest({ kind: 'band', seed: 1, ticks: 1, seeds: [1, 2], sliders: small }, record);
    expect(updates).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  it('charts the mean absolute shock impulse across seeds', () => {
    const result = handleRequest({
      kind: 'band',
      seed: 1,
      ticks: 36,
      seeds: [1, 2, 3],
      sliders: { ...small, 'shock.frequency': 1, 'shock.size': 0.1 },
    });
    expect(result.kind).toBe('band');
    if (result.kind !== 'band') {
      return;
    }
    expect(result.bands.demandImpulse?.mid[0]).toBe(0);
    expect(result.bands.creditImpulse?.mid[0]).toBe(0);
    expect(result.bands.productivityImpulse?.mid[0]).toBe(0);
    for (let month = 24; month < 36; month += 1) {
      const demand = result.bands.demandImpulse?.mid[month] ?? 0;
      const credit = result.bands.creditImpulse?.mid[month] ?? 0;
      const productivity = result.bands.productivityImpulse?.mid[month] ?? 0;
      expect(demand + credit + productivity).toBeCloseTo(0.1);
    }
  });

  it('rejects a band with no seeds before starting', () => {
    expect(() =>
      handleRequest({ kind: 'band', seed: 1, ticks: 1, seeds: [], sliders: small }),
    ).toThrow(/at least one seed/);
  });
});

describe('safeHandleRequest', () => {
  it('returns a structured error instead of throwing when the scenario is invalid', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = safeHandleRequest({
      kind: 'run',
      seed: 1,
      ticks: 12,
      sliders: { 'firm.markup': 9 },
    });
    spy.mockRestore();
    expect(response.kind).toBe('error');
    if (response.kind === 'error') {
      expect(response.message).toMatch(/between|markup|0\.6/i);
    }
  });
});
