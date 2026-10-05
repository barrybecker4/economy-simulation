/**
 * Split `total` across `weights.length` parts in proportion to the weights.
 * The last part takes whatever remains so the parts always sum to `total`.
 */
export function splitProportional(total: number, weights: readonly number[]): number[] {
  const count = weights.length;
  if (count === 0) {
    return [];
  }
  let weightSum = 0;
  for (const weight of weights) {
    weightSum += weight;
  }
  if (weightSum <= 0) {
    return new Array<number>(count).fill(0);
  }
  const parts = new Array<number>(count);
  let left = total;
  for (let index = 0; index < count; index += 1) {
    const share =
      index === count - 1
        ? left
        : Math.min(left, Math.round((total * (weights[index] ?? 0)) / weightSum));
    left -= share;
    parts[index] = share;
  }
  return parts;
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
