import { describe, expect, it, vi } from 'vitest';
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
  });

  it('adds the bitcoin price level when comparing regimes', () => {
    const result = handleRequest({ kind: 'compare', seed: 1, ticks: 1, sliders: small });
    expect(result.kind).toBe('compare');
    expect(result.series.priceLevel).toHaveLength(1);
    expect(result.series.priceLevelBitcoin).toHaveLength(1);
    expect(result.series.meanWellbeingBitcoin).toBeUndefined();
  });

  it('reports every tick of a run, a band, and a comparison', () => {
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

    updates.length = 0;
    handleRequest({ kind: 'compare', seed: 1, ticks: 1, sliders: small }, record);
    expect(updates).toEqual([
      [1, 2],
      [2, 2],
    ]);
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
