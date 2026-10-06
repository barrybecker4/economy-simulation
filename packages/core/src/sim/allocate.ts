/**
 * Weights proportional to each base raised to a non-negative `exponent`.
 * A large exponent is scored against the biggest base so the powers stay finite
 * and that base still takes the share.
 */
export function powerWeights(bases: readonly number[], exponent: number): number[] {
  const direct = bases.map((base) => (base > 0 ? base ** exponent : 0));
  if (direct.every((weight) => Number.isFinite(weight))) {
    return direct;
  }
  let maxBase = 0;
  for (const base of bases) {
    if (base > maxBase) {
      maxBase = base;
    }
  }
  if (!(maxBase > 0)) {
    return bases.map(() => 0);
  }
  return bases.map((base) => {
    if (!(base > 0)) {
      return 0;
    }
    if (base === maxBase) {
      return 1;
    }
    const gap = exponent * Math.log(maxBase / base);
    return gap > 0 && gap <= 700 ? Math.exp(-gap) : 0;
  });
}

/**
 * Split `total` across `weights.length` parts in proportion to the weights.
 * The last part takes whatever remains so the parts always sum to `total`.
 * Overflowing weights share the total. Other non-finite weights take nothing.
 */
export function splitProportional(total: number, weights: readonly number[]): number[] {
  const count = weights.length;
  if (count === 0) {
    return [];
  }
  const usable = usableWeights(weights);
  let weightSum = 0;
  for (const weight of usable) {
    weightSum += weight;
  }
  if (!(weightSum > 0)) {
    return new Array<number>(count).fill(0);
  }
  const parts = new Array<number>(count);
  let left = total;
  for (let index = 0; index < count; index += 1) {
    const share =
      index === count - 1
        ? left
        : Math.min(left, Math.round((total * (usable[index] ?? 0)) / weightSum));
    left -= share;
    parts[index] = share;
  }
  return parts;
}

/** Finite copies of the weights. Infinite weights dominate; other non-finite weights are zero. */
function usableWeights(weights: readonly number[]): number[] {
  if (weights.every((weight) => Number.isFinite(weight))) {
    let sum = 0;
    let max = 0;
    for (const weight of weights) {
      sum += weight;
      if (weight > max) {
        max = weight;
      }
    }
    if (Number.isFinite(sum) || !(max > 0)) {
      return weights.slice();
    }
    return weights.map((weight) => weight / max);
  }
  if (weights.some((weight) => weight === Number.POSITIVE_INFINITY)) {
    return weights.map((weight) => (weight === Number.POSITIVE_INFINITY ? 1 : 0));
  }
  return weights.map((weight) => (Number.isFinite(weight) && weight > 0 ? weight : 0));
}

/**
 * Split `total` into `count` equal integer parts.
 * The last part takes whatever remains so the parts always sum to `total`.
 */
export function splitEqual(total: number, count: number): number[] {
  if (count <= 0) {
    return [];
  }
  const parts = new Array<number>(count);
  let left = total;
  const each = Math.floor(total / count);
  for (let index = 0; index < count; index += 1) {
    const share = index === count - 1 ? left : each;
    left -= share;
    parts[index] = share;
  }
  return parts;
}
