export interface MetricSummary {
  mean: number;
  median: number;
  p05: number;
  p95: number;
}

export function summarize(values: readonly number[]): MetricSummary {
  if (values.length === 0) {
    return { mean: 0, median: 0, p05: 0, p95: 0 };
  }
  const sorted = [...values].sort((left, right) => left - right);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    mean: total / sorted.length,
    median: percentile(sorted, 0.5),
    p05: percentile(sorted, 0.05),
    p95: percentile(sorted, 0.95),
  };
}

export function pairedDifference(left: readonly number[], right: readonly number[]): MetricSummary {
  const count = Math.min(left.length, right.length);
  const gaps = Array.from(
    { length: count },
    (_, index) => (right[index] ?? 0) - (left[index] ?? 0),
  );
  return summarize(gaps);
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 1) {
    return sorted[0] ?? 0;
  }
  const position = fraction * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}
