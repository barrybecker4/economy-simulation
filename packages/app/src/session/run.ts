import { assertPositiveTicks } from '../worker/budget.js';
import type { RunKind, RunRequest } from '../worker/protocol.js';

export const MIN_SEEDS = 1;
export const MAX_SEEDS = 20;

export function assertSeed(seed: number): void {
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new Error('Seed must be a non-negative safe integer');
  }
}

export function assertSeedCount(count: number): void {
  if (!Number.isSafeInteger(count) || count < MIN_SEEDS || count > MAX_SEEDS) {
    throw new Error(`Seed count must be an integer from ${MIN_SEEDS} to ${MAX_SEEDS}`);
  }
}

export function bandSeeds(seed: number, count: number): number[] {
  assertSeed(seed);
  assertSeedCount(count);
  const seeds = Array.from({ length: count }, (_, index) => seed + index);
  const last = seeds[seeds.length - 1];
  if (last === undefined || !Number.isSafeInteger(last)) {
    throw new Error('Band seeds exceed the safe integer range');
  }
  return seeds;
}

export function runKind(seedCount: number): RunKind {
  assertSeedCount(seedCount);
  return seedCount > 1 ? 'band' : 'run';
}

export function runRequest(
  seed: number,
  ticks: number,
  seedCount: number,
  sliders: Record<string, number | string>,
): RunRequest {
  assertSeed(seed);
  assertPositiveTicks(ticks);
  const kind = runKind(seedCount);
  if (kind === 'band') {
    return { kind: 'band', seed, ticks, sliders, seeds: bandSeeds(seed, seedCount) };
  }
  return { kind: 'run', seed, ticks, sliders };
}

export function activityLabel(seedCount: number): string {
  assertSeedCount(seedCount);
  if (seedCount === 1) {
    return 'Running…';
  }
  return `Running ${seedCount} seeds…`;
}

export function readyLabel(): string {
  return 'Run ready.';
}
