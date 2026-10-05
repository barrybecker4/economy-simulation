/** Shared request and response shapes for the simulation worker. */

export type RunKind = 'run' | 'band' | 'compare';

export interface RunRequest {
  kind: RunKind;
  seed: number;
  ticks: number;
  sliders: Record<string, number | string>;
  seeds?: number[];
}

export interface RunSuccess {
  kind: 'run' | 'band' | 'compare';
  ticks: number[];
  series: Record<string, number[]>;
  bands?: Record<string, { low: number[]; mid: number[]; high: number[] }>;
}

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
