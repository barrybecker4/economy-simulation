/** Plain-language comparison words for classroom captions and snapshots. */

const REL_EPS = 1e-6;
const ABS_EPS = 1e-9;

/** Same, half, double, or a coarse multiple. */
export function plainRatioWords(from: number, to: number): string {
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return 'about the same';
  }
  if (nearlyEqual(from, to)) {
    return 'about the same';
  }
  if (nearlyEqual(from, 0)) {
    return to > from ? 'higher' : 'lower';
  }
  const ratio = to / from;
  if (ratio >= 1.8 && ratio < 2.3) {
    return 'about doubled';
  }
  if (ratio > 2.3) {
    return `about ${Math.round(ratio)} times as high`;
  }
  if (ratio <= 0.55 && ratio > 0.4) {
    return 'about half';
  }
  if (ratio <= 0.4) {
    return `about ${Math.max(2, Math.round(1 / ratio))} times as low`;
  }
  if (ratio > 1) {
    return 'higher';
  }
  return 'lower';
}

export function plainEndingSentence(label: string, from: number, to: number): string {
  const words = plainRatioWords(from, to);
  if (words === 'about the same') {
    return `${label} ends about the same.`;
  }
  if (words === 'about doubled' || words === 'about half') {
    return `${label} ends ${words}.`;
  }
  if (words.startsWith('about ')) {
    return `${label} ends ${words}.`;
  }
  return `${label} ends ${words}.`;
}

/** Classroom caption for one series pair. */
export function plainComparisonCaption(
  series: readonly { label: string; baseline: readonly number[]; variant: readonly number[] }[],
): string {
  if (series.length === 0) {
    return 'Every series matches the baseline.';
  }
  const sentences: string[] = [];
  const matching: string[] = [];
  for (const item of series) {
    const from = last(item.baseline);
    const to = last(item.variant);
    if (nearlyEqual(from, to)) {
      matching.push(item.label);
      continue;
    }
    sentences.push(plainEndingSentence(item.label, from, to));
  }
  if (matching.length === series.length) {
    return 'Every series matches the baseline.';
  }
  if (matching.length === 1) {
    sentences.push(`${matching[0]} matches the baseline.`);
  } else if (matching.length > 1) {
    sentences.push(`${joinLabels(matching)} match the baseline.`);
  }
  return sentences.join(' ');
}

function nearlyEqual(a: number, b: number): boolean {
  const gap = Math.abs(a - b);
  return gap <= Math.max(ABS_EPS, REL_EPS * Math.max(Math.abs(a), Math.abs(b)));
}

function last(values: readonly number[]): number {
  const value = values[values.length - 1];
  if (value === undefined) {
    throw new Error('Series has no points');
  }
  return value;
}

function joinLabels(labels: readonly string[]): string {
  if (labels.length === 1) {
    return labels[0] ?? '';
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  const head = labels.slice(0, -1).join(', ');
  return `${head}, and ${labels[labels.length - 1]}`;
}
