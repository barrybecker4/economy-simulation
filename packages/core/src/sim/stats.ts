/** Gini of a sample. Negative values are shifted so the measure stays defined. */
export function gini(values: readonly number[]): number {
  const count = values.length;
  if (count === 0) {
    return 0;
  }
  let min = values[0] ?? 0;
  for (const value of values) {
    if (value < min) {
      min = value;
    }
  }
  const shifted = min < 0 ? values.map((value) => value - min) : values;
  const sorted = [...shifted].sort((left, right) => left - right);
  let sum = 0;
  for (const value of sorted) {
    sum += value;
  }
  if (sum === 0) {
    return 0;
  }
  let weighted = 0;
  for (let index = 0; index < count; index += 1) {
    weighted += (2 * (index + 1) - count - 1) * (sorted[index] ?? 0);
  }
  return weighted / (count * sum);
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return sum / values.length;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

/**
 * Share of total held by the richest (`'top'`) or poorest (`'bottom'`) fraction.
 * Negative values count as zero in the total.
 */
export function tailShare(
  values: readonly number[],
  fraction: number,
  end: 'top' | 'bottom',
): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const count = Math.max(1, Math.floor(sorted.length * fraction));
  let total = 0;
  let slice = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const value = Math.max(0, sorted[index] ?? 0);
    total += value;
    const inSlice = end === 'top' ? index >= sorted.length - count : index < count;
    if (inSlice) {
      slice += value;
    }
  }
  return total === 0 ? 0 : slice / total;
}

export function topShare(values: readonly number[], fraction: number): number {
  return tailShare(values, fraction, 'top');
}

export function bottomShare(values: readonly number[], fraction: number): number {
  return tailShare(values, fraction, 'bottom');
}

export function monthlyFromAnnual(rate: number): number {
  return (1 + rate) ** (1 / 12) - 1;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
