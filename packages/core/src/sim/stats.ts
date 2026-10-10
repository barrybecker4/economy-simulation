/** Gini of a sample. Negative values are shifted so the measure stays defined. */
export function gini(values: readonly number[]): number {
  return giniOfSorted(prepareSorted(values));
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
 * Gini still shifts negatives; shares and total treat negatives as zero.
 */
export function distributionOf(values: readonly number[]): {
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
    gini: giniOfSorted(prepareSortedFromSorted(sorted)),
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
  if (sum === 0) {
    return 0;
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
    const value = Math.max(0, sorted[index] ?? 0);
    total += value;
    const inSlice = end === 'top' ? index >= sorted.length - count : index < count;
    if (inSlice) {
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
      slice += Math.max(0, sorted[index] ?? 0);
    }
    shares.push(slice / total);
  }
  return [shares[0] ?? 0, shares[1] ?? 0, shares[2] ?? 0, shares[3] ?? 0, shares[4] ?? 0];
}
