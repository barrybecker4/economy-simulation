/** Discarded draws so the first user-visible value is mixed. Recommended for sfc32. */
const SFC32_WARMUP = 12;

/**
 * Knuth's poisson sampler loops once per event. Larger rates need a different sampler.
 * Shock counts in this model stay far below the cap.
 */
const POISSON_MAX_LAMBDA = 10_000;

const UINT32_RANGE = 0x100000000;

/**
 * Deterministic generator. sfc32 is the stream; splitmix32 and FNV-1a only expand the seed.
 * A fork depends on the root seed and the stream id, never on how many draws another stream used.
 */
export class Rng {
  readonly seed: number;
  private readonly streamKey: string;
  private readonly nextUint32: () => number;
  private spareNormal: number | null = null;

  constructor(seed: number, streamKey = '') {
    if (!Number.isSafeInteger(seed) || seed < 0) {
      throw new Error('Seed must be a non-negative safe integer');
    }
    this.seed = seed;
    this.streamKey = streamKey;
    this.nextUint32 = warmedSfc32(mixStream(seed, streamKey));
  }

  fork(streamId: string | number): Rng {
    if (typeof streamId === 'number') {
      if (!Number.isSafeInteger(streamId) || streamId < 0) {
        throw new Error('Numeric stream ids must be non-negative safe integers');
      }
    } else if (streamId.length === 0) {
      throw new Error('Stream id must not be empty');
    }
    const suffix = String(streamId);
    const nextKey = this.streamKey.length === 0 ? suffix : `${this.streamKey}/${suffix}`;
    return new Rng(this.seed, nextKey);
  }

  /** Uniform draw on [0, 1). */
  uniform(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  /** Inclusive integer bounds. Rejection sampling avoids modulo bias. */
  uniformInt(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error('uniformInt expects integer bounds with max >= min');
    }
    const span = max - min + 1;
    if (span > UINT32_RANGE) {
      throw new Error('uniformInt range exceeds 2^32');
    }
    const limit = Math.floor(UINT32_RANGE / span) * span;
    let draw = this.nextUint32();
    while (draw >= limit) {
      draw = this.nextUint32();
    }
    return min + (draw % span);
  }

  normal(mean: number, std: number): number {
    if (!Number.isFinite(mean) || !Number.isFinite(std)) {
      throw new Error('normal expects a finite mean and standard deviation');
    }
    if (std < 0) {
      throw new Error('Standard deviation must be non-negative');
    }
    if (std === 0) {
      return mean;
    }
    if (this.spareNormal !== null) {
      const spare = this.spareNormal;
      this.spareNormal = null;
      return mean + std * spare;
    }
    let u = this.uniform();
    while (u === 0) {
      u = this.uniform();
    }
    const v = this.uniform();
    const magnitude = Math.sqrt(-2 * Math.log(u));
    const angle = 2 * Math.PI * v;
    this.spareNormal = magnitude * Math.sin(angle);
    return mean + std * magnitude * Math.cos(angle);
  }

  lognormal(mu: number, sigma: number): number {
    return Math.exp(this.normal(mu, sigma));
  }

  poisson(lambda: number): number {
    if (!Number.isFinite(lambda) || lambda < 0) {
      throw new Error('poisson expects a non-negative finite lambda');
    }
    if (lambda === 0) {
      return 0;
    }
    if (lambda > POISSON_MAX_LAMBDA) {
      throw new Error(`poisson lambda must be <= ${POISSON_MAX_LAMBDA}`);
    }
    const limit = Math.exp(-lambda);
    let count = 0;
    let product = 1;
    do {
      count += 1;
      product *= this.uniform();
    } while (product > limit);
    return count - 1;
  }

  weightedIndex(weights: readonly number[]): number {
    let total = 0;
    for (const weight of weights) {
      if (!Number.isFinite(weight) || weight < 0) {
        throw new Error('Weights must be finite and non-negative');
      }
      total += weight;
    }
    if (total <= 0) {
      throw new Error('Weights must sum to a positive number');
    }
    let pick = this.uniform() * total;
    for (let index = 0; index < weights.length; index += 1) {
      const weight = weights[index] ?? 0;
      if (weight === 0) {
        continue;
      }
      pick -= weight;
      if (pick < 0) {
        return index;
      }
    }
    for (let index = weights.length - 1; index >= 0; index -= 1) {
      if ((weights[index] ?? 0) > 0) {
        return index;
      }
    }
    throw new Error('Weights must sum to a positive number');
  }
}

function mixStream(seed: number, streamKey: string): number {
  let hash = 0x811c9dc5;
  const text = `${seed}|${streamKey}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function warmedSfc32(mixed: number): () => number {
  const split = splitmix32(mixed);
  const next = sfc32(split(), split(), split(), split());
  for (let index = 0; index < SFC32_WARMUP; index += 1) {
    next();
  }
  return next;
}

function splitmix32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x9e3779b9) | 0;
    let mixed = state ^ (state >>> 16);
    mixed = Math.imul(mixed, 0x21f0aaad);
    mixed ^= mixed >>> 15;
    mixed = Math.imul(mixed, 0x735a2d97);
    mixed ^= mixed >>> 15;
    return mixed >>> 0;
  };
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  let sa = a | 0;
  let sb = b | 0;
  let sc = c | 0;
  let sd = d | 0;
  return () => {
    const t = (((sa + sb) | 0) + sd) | 0;
    sd = (sd + 1) | 0;
    sa = sb ^ (sb >>> 9);
    sb = (sc + (sc << 3)) | 0;
    sc = (sc << 21) | (sc >>> 11);
    sc = (sc + t) | 0;
    return t >>> 0;
  };
}
