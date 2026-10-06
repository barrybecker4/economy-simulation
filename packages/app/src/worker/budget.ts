import type { RunRequest } from './protocol.js';

export function assertPositiveTicks(ticks: number): void {
  if (!Number.isSafeInteger(ticks) || ticks < 1) {
    throw new Error('Ticks must be a positive integer');
  }
}

export function runCount(request: RunRequest): number {
  if (request.kind === 'band') {
    if (!Array.isArray(request.seeds) || request.seeds.length === 0) {
      throw new Error('A band needs at least one seed');
    }
    return request.seeds.length;
  }
  return 1;
}

export function tickBudget(request: RunRequest): number {
  assertPositiveTicks(request.ticks);
  return runCount(request) * request.ticks;
}
