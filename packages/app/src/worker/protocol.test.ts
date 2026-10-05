import { describe, expect, it } from 'vitest';
import { formatWorkerError, percentComplete, publishPercent } from './protocol.js';

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

  it('uses a string error as its own message', () => {
    expect(formatWorkerError('scenario rejected')).toBe('scenario rejected');
  });

  it('rejects blank messages', () => {
    expect(formatWorkerError(new Error('  '))).toBe('Unknown worker error');
    expect(formatWorkerError('')).toBe('Unknown worker error');
    expect(formatWorkerError(null)).toBe('Unknown worker error');
  });
});
