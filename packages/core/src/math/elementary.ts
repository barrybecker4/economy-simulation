/**
 * Exp, log, sin, and cos for the simulation.
 *
 * V8's platform versions of these four functions are not bit-identical across
 * builds. Chrome 148 and Node 25 (V8 14.1) disagreed by about one unit in the
 * last place on a few percent of arguments, which is enough to flip a rounded
 * satoshi decision. Square root and `**` matched on that pair and stay on the
 * platform. Every step here is addition, subtraction, multiplication, or
 * division, so two IEEE-754 engines produce the same doubles.
 *
 * Exp, log, sin, and cos follow the fdlibm kernels: an argument split into a
 * high part and a low part, then a polynomial. Each result stays within one
 * unit in the last place of Node's library.
 */

const INV_LN2 = 1.4426950408889634;
/** ln(2) split so that an integer multiple of the high part is exact. */
const LN2_HI = 0.6931471803691238;
const LN2_LO = 1.9082149292705877e-10;
const EXP_OVERFLOW = 709.78271289338397;
const EXP_UNDERFLOW = -745.1332191019411;
/** |x| above half a ln(2) uses the exponential argument reduction. */
const EXP_REDUCE = 0.34657359027997264;

const P1 = 1.6666666666666602e-1;
const P2 = -2.7777777777015593e-3;
const P3 = 6.613756321437934e-5;
const P4 = -1.6533902205465252e-6;
const P5 = 4.1381367970572385e-8;

/** pi/2 split. The high part has trailing zeros so small integer multiples are exact. */
const PIO2_HI = 1.5707963267341256;
const PIO2_LO = 6.077100506506192e-11;
const TWO_OVER_PI = 0.6366197723675814;

/** Further pi/2 corrections. Each high part has trailing zeros, so a small integer multiple is exact. */
const PIO2_2 = bitsToFloat(0x3dd0b4611a600000n);
const PIO2_2T = bitsToFloat(0x3ba3198a2e037073n);
const PIO2_3 = bitsToFloat(0x3ba3198a2e000000n);
const PIO2_3T = bitsToFloat(0x397b839a252049c1n);

/** fdlibm log polynomial on the reduced fraction. */
const LG1 = 6.66666666666673513e-1;
const LG2 = 3.999999999940941908e-1;
const LG3 = 2.857142874366239149e-1;
const LG4 = 2.222219843214978396e-1;
const LG5 = 1.818357216161805012e-1;
const LG6 = 1.531383769920937332e-1;
const LG7 = 1.479819860511658591e-1;

/** fdlibm sine kernel on an argument inside ±pi/4. */
const S1 = -1.66666666666666324348e-1;
const S2 = 8.33333333332248946124e-3;
const S3 = -1.98412698298579493134e-4;
const S4 = 2.75573137070700676789e-6;
const S5 = -2.50507602534068634195e-8;
const S6 = 1.58969099521155010221e-10;

/** fdlibm cosine kernel on an argument inside ±pi/4. */
const C1 = 4.16666666666666019037e-2;
const C2 = -1.38888888888741095749e-3;
const C3 = 2.48015872894767294178e-5;
const C4 = -2.75573143513906633035e-7;
const C5 = 2.0875723212981748279e-9;
const C6 = -1.13596475577881948265e-11;

export function exp(x: number): number {
  if (Number.isNaN(x)) {
    return Number.NaN;
  }
  if (x > EXP_OVERFLOW) {
    return Number.POSITIVE_INFINITY;
  }
  if (x < EXP_UNDERFLOW) {
    return 0;
  }
  const magnitude = Math.abs(x);
  if (magnitude < twoTo(-28)) {
    return 1 + x;
  }

  let hi = x;
  let lo = 0;
  let steps = 0;
  if (magnitude > EXP_REDUCE) {
    steps = roundHalfAwayFromZero(INV_LN2 * x);
    hi = x - steps * LN2_HI;
    lo = steps * LN2_LO;
    x = hi - lo;
  }

  const square = x * x;
  const correction =
    x - square * (P1 + square * (P2 + square * (P3 + square * (P4 + square * P5))));
  if (steps === 0) {
    return 1 - ((x * correction) / (correction - 2) - x);
  }
  const reduced = 1 - (lo - (x * correction) / (2 - correction) - hi);
  return scalePow2(reduced, steps);
}

export function log(x: number): number {
  if (Number.isNaN(x) || x < 0) {
    return Number.NaN;
  }
  if (x === 0) {
    return Number.NEGATIVE_INFINITY;
  }
  if (x === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }
  if (x === 1) {
    return 0;
  }

  const parts = frexp(x);
  let mantissa = parts.mantissa;
  let exponent = parts.exponent;
  if (mantissa < Math.SQRT1_2) {
    mantissa *= 2;
    exponent -= 1;
  }
  const fraction = mantissa - 1;
  const steps = exponent;
  if (Math.abs(fraction) < twoTo(-20)) {
    const correction = fraction * fraction * (0.5 - fraction / 3);
    if (steps === 0) {
      return fraction - correction;
    }
    return steps * LN2_HI - (correction - steps * LN2_LO - fraction);
  }
  const s = fraction / (2 + fraction);
  const z = s * s;
  const w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6));
  const t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  const remainder = t2 + t1;
  const halfSquare = 0.5 * fraction * fraction;
  if (steps === 0) {
    return fraction - (halfSquare - s * (halfSquare + remainder));
  }
  return steps * LN2_HI - (halfSquare - (s * (halfSquare + remainder) + steps * LN2_LO) - fraction);
}

export function sin(x: number): number {
  return sinCos(x).sin;
}

export function cos(x: number): number {
  return sinCos(x).cos;
}

function sinCos(x: number): { sin: number; cos: number } {
  if (!Number.isFinite(x)) {
    return { sin: Number.NaN, cos: Number.NaN };
  }
  const reduced = remPio2(x);
  const sine = kernelSin(reduced.y0, reduced.y1);
  const cosine = kernelCos(reduced.y0, reduced.y1);
  const quadrant = ((reduced.steps % 4) + 4) % 4;
  if (quadrant === 0) {
    return { sin: sine, cos: cosine };
  }
  if (quadrant === 1) {
    return { sin: cosine, cos: -sine };
  }
  if (quadrant === 2) {
    return { sin: -sine, cos: -cosine };
  }
  return { sin: -cosine, cos: sine };
}

/**
 * Reduce x to y0 + y1 = x - steps * pi/2, with |y0| ≤ pi/4.
 * The low part keeps the bits the first subtraction rounds away.
 */
function remPio2(x: number): { steps: number; y0: number; y1: number } {
  const steps = roundHalfAwayFromZero(x * TWO_OVER_PI);
  const multiple = steps;
  let remainder = x - multiple * PIO2_HI;
  let correction = multiple * PIO2_LO;
  let y0 = remainder - correction;
  const argumentExponent = biasedExponent(x);
  if (y0 !== 0 && argumentExponent - biasedExponent(y0) > 16) {
    const first = remainder;
    correction = multiple * PIO2_2;
    remainder = first - correction;
    correction = multiple * PIO2_2T - (first - remainder - correction);
    y0 = remainder - correction;
    if (argumentExponent - biasedExponent(y0) > 49) {
      const second = remainder;
      correction = multiple * PIO2_3;
      remainder = second - correction;
      correction = multiple * PIO2_3T - (second - remainder - correction);
      y0 = remainder - correction;
    }
  }
  return { steps, y0, y1: remainder - y0 - correction };
}

function kernelSin(x: number, y: number): number {
  if (Math.abs(x) < twoTo(-27)) {
    return x;
  }
  const square = x * x;
  const cube = square * x;
  const polynomial = S2 + square * (S3 + square * (S4 + square * (S5 + square * S6)));
  return x - (square * (0.5 * y - cube * polynomial) - y - cube * S1);
}

function kernelCos(x: number, y: number): number {
  const magnitude = Math.abs(x);
  if (magnitude < twoTo(-27)) {
    return 1;
  }
  const square = x * x;
  const polynomial =
    square * (C1 + square * (C2 + square * (C3 + square * (C4 + square * (C5 + square * C6)))));
  const high = highWord(magnitude);
  if (high < 0x3fd33333) {
    return 1 - (0.5 * square - (square * polynomial - x * y));
  }
  const split =
    high > 0x3fe90000 ? 0.28125 : bitsToFloat((BigInt(high - 0x200000) & 0xffffffffn) << 32n);
  const head = 1 - split;
  return head - (0.5 * square - split - (square * polynomial - x * y));
}

/** Round halves away from zero. `Math.round` rounds halves toward +infinity. */
function roundHalfAwayFromZero(value: number): number {
  if (value > 0) {
    return Math.floor(value + 0.5);
  }
  if (value < 0) {
    return Math.ceil(value - 0.5);
  }
  return 0;
}

function scalePow2(value: number, exponent: number): number {
  if (value === 0 || !Number.isFinite(value) || exponent === 0) {
    return value;
  }
  const bits = floatToBits(value);
  const sign = bits & 0x8000000000000000n;
  const stored = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & 0xfffffffffffffn;
  if (stored === 0 || stored === 0x7ff) {
    return value * twoTo(exponent);
  }
  const next = stored + exponent;
  if (next >= 0x7ff) {
    return sign === 0n ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  if (next <= 0) {
    return value * twoTo(exponent);
  }
  return bitsToFloat(sign | (BigInt(next) << 52n) | fraction);
}

function twoTo(exponent: number): number {
  if (exponent > 1023) {
    return Number.POSITIVE_INFINITY;
  }
  if (exponent < -1074) {
    return 0;
  }
  if (exponent >= -1022) {
    return bitsToFloat(BigInt(exponent + 1023) << 52n);
  }
  return bitsToFloat(1n << BigInt(exponent + 1074));
}

function frexp(value: number): { mantissa: number; exponent: number } {
  if (value === 0 || !Number.isFinite(value)) {
    return { mantissa: value, exponent: 0 };
  }
  const bits = floatToBits(value);
  const sign = bits & 0x8000000000000000n;
  const stored = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & 0xfffffffffffffn;
  if (stored === 0) {
    const scaled = frexp(value * twoTo(54));
    return { mantissa: scaled.mantissa, exponent: scaled.exponent - 54 };
  }
  return {
    mantissa: bitsToFloat(sign | (0x3fen << 52n) | fraction),
    exponent: stored - 1022,
  };
}

function biasedExponent(value: number): number {
  return Number((floatToBits(value) >> 52n) & 0x7ffn);
}

function highWord(value: number): number {
  return Number((floatToBits(value) >> 32n) & 0xffffffffn);
}

function floatToBits(value: number): bigint {
  const bytes = new ArrayBuffer(8);
  const view = new DataView(bytes);
  view.setFloat64(0, value);
  return view.getBigUint64(0);
}

function bitsToFloat(bits: bigint): number {
  const bytes = new ArrayBuffer(8);
  const view = new DataView(bytes);
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
}
