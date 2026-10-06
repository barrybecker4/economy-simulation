import { assertPositiveTicks } from '../worker/budget.js';
import type { RunKind, RunRequest } from '../worker/protocol.js';

export const BAND_LENGTH = 5;

export function assertSeed(seed: number): void {
  if (!Number.isSafeInteger(seed) || seed < 0) {
    throw new Error('Seed must be a non-negative safe integer');
  }
}

export function bandSeeds(seed: number): number[] {
  assertSeed(seed);
  const seeds = Array.from({ length: BAND_LENGTH }, (_, index) => seed + index);
  const last = seeds[seeds.length - 1];
  if (last === undefined || !Number.isSafeInteger(last)) {
    throw new Error('Band seeds exceed the safe integer range');
  }
  return seeds;
}

export function runRequest(
  kind: RunKind,
  seed: number,
  ticks: number,
  sliders: Record<string, number | string>,
): RunRequest {
  assertSeed(seed);
  assertPositiveTicks(ticks);
  if (kind === 'band') {
    return { kind: 'band', seed, ticks, sliders, seeds: bandSeeds(seed) };
  }
  return { kind: 'run', seed, ticks, sliders };
}

export function activityLabel(kind: RunKind): string {
  if (kind === 'band') {
    return 'Running five seeds…';
  }
  return 'Running…';
}

export function readyLabel(kind: RunKind): string {
  if (kind === 'band') {
    return 'Band ready.';
  }
  return 'Run ready.';
}
