/** Shared request and response shapes for the simulation worker. */

export type RunKind = 'run' | 'band' | 'compare';

interface RunFields {
  seed: number;
  ticks: number;
  sliders: Record<string, number | string>;
}

export interface SingleRunRequest extends RunFields {
  kind: 'run';
}

export interface BandRunRequest extends RunFields {
  kind: 'band';
  seeds: readonly number[];
}

export interface CompareRunRequest extends RunFields {
  kind: 'compare';
}

export type RunRequest = SingleRunRequest | BandRunRequest | CompareRunRequest;

export interface PercentileBand {
  low: number[];
  mid: number[];
  high: number[];
}

interface SuccessFields {
  ticks: number[];
  series: Record<string, number[]>;
}

export interface SingleRunResult extends SuccessFields {
  kind: 'run';
}

export interface BandRunResult extends SuccessFields {
  kind: 'band';
  bands: Record<string, PercentileBand>;
}

export interface CompareRunResult extends SuccessFields {
  kind: 'compare';
}

export type RunSuccess = SingleRunResult | BandRunResult | CompareRunResult;

export interface RunError {
  kind: 'error';
  message: string;
}

export type RunResponse = RunSuccess | RunError;

export interface RunProgress {
  kind: 'progress';
  completed: number;
  total: number;
}

export type WorkerMessage = RunProgress | RunResponse;

/** Integer percent of ticks finished. Zero until the first whole percent, then 100 at the end. */
export function percentComplete(completed: number, total: number): number {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0 || completed <= 0) {
    return 0;
  }
  const done = Math.min(completed, total);
  return Math.min(100, Math.floor((done * 100) / total));
}

/** Percent to publish, or null when the integer percent has not moved. */
export function publishPercent(
  completed: number,
  total: number,
  lastPercent: number,
): number | null {
  const percent = percentComplete(completed, total);
  if (percent <= lastPercent) {
    return null;
  }
  return percent;
}

export function formatWorkerError(err: unknown): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    return err.message;
  }
  if (typeof err === 'string' && err.trim().length > 0) {
    return err;
  }
  return 'Unknown worker error';
}
