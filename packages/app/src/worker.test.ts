import { describe, expect, it, vi } from 'vitest';
import { formatWorkerError } from './worker-protocol.js';
import { handleRequest } from './run-request.js';
import { safeHandleRequest } from './worker-safe.js';

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
