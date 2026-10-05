import { describe, expect, it, vi } from 'vitest';
import { formatWorkerError, percentComplete, publishPercent } from './worker-protocol.js';
import { handleRequest } from './run-request.js';
import { safeHandleRequest } from './worker-safe.js';

const small = {
  'scale.households': 20,
  'scale.firms': 4,
  'scale.banks': 1,
};

describe('percentComplete', () => {
  it('stays at zero until a whole percent of the run is done', () => {
    expect(percentComplete(0, 120)).toBe(0);
    expect(percentComplete(0, 0)).toBe(0);
    expect(percentComplete(1, 200)).toBe(0);
    expect(percentComplete(2, 200)).toBe(1);
    expect(percentComplete(200, 200)).toBe(100);
  });
});

describe('publishPercent', () => {
  it('publishes only when the integer percent increases', () => {
    expect(publishPercent(1, 200, 0)).toBeNull();
    expect(publishPercent(2, 200, 0)).toBe(1);
    expect(publishPercent(3, 200, 1)).toBeNull();
    expect(publishPercent(200, 200, 99)).toBe(100);
  });
});

describe('formatWorkerError', () => {
  it('prefers an Error message', () => {
    expect(formatWorkerError(new Error('Debits must equal credits'))).toBe(
      'Debits must equal credits',
    );
  });

  it('falls back for unknown values', () => {
    expect(formatWorkerError(null)).toBe('Unknown worker error');
  });
});

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
  });

  it('reports every tick of a run, a band, and a comparison', () => {
    const updates: Array<[number, number]> = [];
    handleRequest({ kind: 'run', seed: 1, ticks: 3, sliders: small }, (completed, total) =>
      updates.push([completed, total]),
    );
    expect(updates).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);

    updates.length = 0;
    handleRequest(
      { kind: 'band', seed: 1, ticks: 1, seeds: [1, 2], sliders: small },
      (completed, total) => updates.push([completed, total]),
    );
    expect(updates).toEqual([
      [1, 2],
      [2, 2],
    ]);

    updates.length = 0;
    handleRequest({ kind: 'compare', seed: 1, ticks: 1, sliders: small }, (completed, total) =>
      updates.push([completed, total]),
    );
    expect(updates).toEqual([
      [1, 2],
      [2, 2],
    ]);
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
