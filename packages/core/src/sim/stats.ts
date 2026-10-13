/**
 * Gini of a sample. For income/consumption, negative values are shifted so the measure
 * stays defined. For wealth, pass shift=false to preserve negative net worth in the
 * calculation, matching the approach used for US wealth Gini where the bottom quintiles
 * can have negative net worth (debt exceeding assets).
 */
export function gini(values: readonly number[], shift = true): number {
  return giniOfSorted(shift ? prepareSorted(values) : sortedCopy(values));
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
  return medianOfSorted(sortedCopy(values));
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
  return tailShareOfSorted(sortedCopy(values), fraction, end);
}

export function topShare(values: readonly number[], fraction: number): number {
  return tailShare(values, fraction, 'top');
}

export function bottomShare(values: readonly number[], fraction: number): number {
  return tailShare(values, fraction, 'bottom');
}

/**
 * Five shares of total, poorest to richest. Negatives count as zero.
 * An empty or zero-total sample returns equal fifths.
 */
export function quintileShares(
  values: readonly number[],
): [number, number, number, number, number] {
  return quintileSharesOfSorted(sortedCopy(values));
}

/**
 * One ascending sort feeds Gini, mean, median, tail shares, and quintiles.
 * For income/consumption, Gini shifts negatives to stay defined (shiftGini=true).
 * For wealth, pass shiftGini=false to preserve negative net worth in the Gini calculation,
 * matching the approach for US wealth Gini where bottom quintiles can have negative net worth.
 * Total (denominator) always counts only non-negative wealth. Tail shares (numerator) include
 * negative net worth, so the bottom quintile can have a negative share when debt exceeds assets.
 */
export function distributionOf(
  values: readonly number[],
  shiftGini = true,
): {
  gini: number;
  mean: number;
  median: number;
  topDecile: number;
  bottomQuintile: number;
  quintiles: [number, number, number, number, number];
  total: number;
} {
  const sorted = sortedCopy(values);
  return {
    gini: giniOfSorted(shiftGini ? prepareSortedFromSorted(sorted) : sorted),
    mean: mean(values),
    median: medianOfSorted(sorted),
    topDecile: tailShareOfSorted(sorted, 0.1, 'top'),
    bottomQuintile: tailShareOfSorted(sorted, 0.2, 'bottom'),
    quintiles: quintileSharesOfSorted(sorted),
    total: nonNegativeTotal(sorted),
  };
}

export function monthlyFromAnnual(rate: number): number {
  return (1 + rate) ** (1 / 12) - 1;
}

/** Fisher–Yates shuffle. Mutates `items` and returns it. */
export function shuffleInPlace<T>(
  items: T[],
  rng: { uniformInt(min: number, max: number): number },
): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const draw = rng.uniformInt(0, index);
    const current = items[index];
    const picked = items[draw];
    if (current !== undefined && picked !== undefined) {
      items[index] = picked;
      items[draw] = current;
    }
  }
  return items;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sortedCopy(values: readonly number[]): number[] {
  return [...values].sort((left, right) => left - right);
}

function prepareSorted(values: readonly number[]): number[] {
  return prepareSortedFromSorted(sortedCopy(values));
}

/** Shift negatives so the Gini stays defined, without another sort when already ascending. */
function prepareSortedFromSorted(sorted: readonly number[]): number[] {
  const min = sorted[0] ?? 0;
  if (min >= 0) {
    return sorted as number[];
  }
  return sorted.map((value) => value - min);
}

function giniOfSorted(sorted: readonly number[]): number {
  const count = sorted.length;
  if (count === 0) {
    return 0;
  }
  let sum = 0;
  for (const value of sorted) {
    sum += value;
  }
  // For wealth with negative net worth, use sum of absolute values to stay well-defined
  if (sum <= 0) {
    let absSum = 0;
    for (const value of sorted) {
      absSum += Math.abs(value);
    }
    if (absSum === 0) {
      return 0;
    }
    // Compute with absolute sum denominator
    let weighted = 0;
    for (let index = 0; index < count; index += 1) {
      weighted += (2 * (index + 1) - count - 1) * (sorted[index] ?? 0);
    }
    return Math.abs(weighted) / (count * absSum);
  }
  let weighted = 0;
  for (let index = 0; index < count; index += 1) {
    weighted += (2 * (index + 1) - count - 1) * (sorted[index] ?? 0);
  }
  return weighted / (count * sum);
}

function medianOfSorted(sorted: readonly number[]): number {
  if (sorted.length === 0) {
    return 0;
  }
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

function tailShareOfSorted(
  sorted: readonly number[],
  fraction: number,
  end: 'top' | 'bottom',
): number {
  if (sorted.length === 0) {
    return 0;
  }
  const count = Math.max(1, Math.floor(sorted.length * fraction));
  let total = 0;
  let slice = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const value = sorted[index] ?? 0;
    // Total (denominator) counts only non-negative wealth
    total += Math.max(0, value);
    const inSlice = end === 'top' ? index >= sorted.length - count : index < count;
    if (inSlice) {
      // Slice (numerator) includes negative net worth, so bottom quintile can be negative
      slice += value;
    }
  }
  return total === 0 ? 0 : slice / total;
}

function nonNegativeTotal(sorted: readonly number[]): number {
  let total = 0;
  for (const value of sorted) {
    total += Math.max(0, value);
  }
  return total;
}

function quintileSharesOfSorted(
  sorted: readonly number[],
): [number, number, number, number, number] {
  if (sorted.length === 0) {
    return [0.2, 0.2, 0.2, 0.2, 0.2];
  }
  const total = nonNegativeTotal(sorted);
  if (total === 0) {
    return [0.2, 0.2, 0.2, 0.2, 0.2];
  }
  const shares: number[] = [];
  const count = sorted.length;
  for (let quintile = 0; quintile < 5; quintile += 1) {
    const start = Math.floor((quintile * count) / 5);
    const end = Math.floor(((quintile + 1) * count) / 5);
    let slice = 0;
    for (let index = start; index < end; index += 1) {
      // Include negative net worth in quintile shares (actual value, not floored at zero)
      slice += sorted[index] ?? 0;
    }
    shares.push(slice / total);
  }
  return [shares[0] ?? 0, shares[1] ?? 0, shares[2] ?? 0, shares[3] ?? 0, shares[4] ?? 0];
}
