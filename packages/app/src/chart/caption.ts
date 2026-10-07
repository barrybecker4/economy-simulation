import { formatAxisNumber } from './options.js';

export type BetterDirection = 'higher' | 'lower';

export interface CaptionSeries {
  label: string;
  baseline: readonly number[];
  variant: readonly number[];
  better?: BetterDirection;
}

const REL_EPS = 1e-6;
const ABS_EPS = 1e-9;

const MIXED_UNITS =
  'The baseline and scenario use different money units, so this chart does not score the scenario.';

/** One paragraph comparing paired series when a baseline is pinned. */
export function comparisonCaption(
  series: readonly CaptionSeries[],
  options?: { mixedUnits?: boolean },
): string {
  if (options?.mixedUnits === true) {
    return MIXED_UNITS;
  }
  if (series.length === 0) {
    return 'Every series matches the baseline.';
  }

  const matching: string[] = [];
  const sentences: string[] = [];
  for (const item of series) {
    const sentence = seriesSentence(item);
    if (sentence === null) {
      matching.push(item.label);
      continue;
    }
    sentences.push(sentence);
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

function seriesSentence(item: CaptionSeries): string | null {
  const ending = compareEnding(item.baseline, item.variant);
  const path = majorityPath(item.baseline, item.variant);
  if (ending === 'same' && path === 'same') {
    return null;
  }

  const body = endingBody(item, ending, path);
  if (item.better === undefined) {
    return body;
  }
  const verdict = verdictSentence(item.better, ending, path);
  if (verdict === null) {
    return body;
  }
  return `${body} ${verdict}`;
}

function endingBody(
  item: CaptionSeries,
  ending: CompareSide,
  path: CompareSide,
): string {
  if (ending === 'same') {
    if (path === 'same') {
      return `${item.label} matches the baseline.`;
    }
    return `${item.label} matches the baseline at the end, but it was ${path} in most months.`;
  }

  const from = formatAxisNumber(last(item.baseline));
  const to = formatAxisNumber(last(item.variant));
  const change = `${item.label} ends ${ending} (${from} → ${to})`;
  if (path === 'same' || path === ending) {
    return `${change}.`;
  }
  return `${change}, but it was ${path} in most months.`;
}

function verdictSentence(
  better: BetterDirection,
  ending: CompareSide,
  path: CompareSide,
): string | null {
  const endVerdict = sideVerdict(better, ending);
  const pathVerdict = sideVerdict(better, path);
  if (ending !== 'same' && path !== 'same' && path !== ending) {
    return `The ending is ${endVerdict}, and most of the run was ${pathVerdict}.`;
  }
  if (ending !== 'same' && (path === 'same' || path === ending)) {
    return `That is ${endVerdict}.`;
  }
  if (ending === 'same' && path !== 'same') {
    return `Most of the run was ${pathVerdict}.`;
  }
  return null;
}

function sideVerdict(better: BetterDirection, side: CompareSide): string {
  if (side === 'same') {
    return 'unchanged';
  }
  if (side === better) {
    return 'an improvement';
  }
  return 'worse';
}

type CompareSide = 'higher' | 'lower' | 'same';

function compareEnding(baseline: readonly number[], variant: readonly number[]): CompareSide {
  return compareValues(last(baseline), last(variant));
}

function majorityPath(baseline: readonly number[], variant: readonly number[]): CompareSide {
  if (baseline.length !== variant.length) {
    throw new Error('Baseline and scenario must share the same month count');
  }
  let higher = 0;
  let lower = 0;
  for (let i = 0; i < baseline.length; i += 1) {
    const side = compareValues(baseline[i] ?? 0, variant[i] ?? 0);
    if (side === 'higher') {
      higher += 1;
    } else if (side === 'lower') {
      lower += 1;
    }
  }
  const half = baseline.length / 2;
  if (higher > half) {
    return 'higher';
  }
  if (lower > half) {
    return 'lower';
  }
  return 'same';
}

function compareValues(baseline: number, variant: number): CompareSide {
  if (!Number.isFinite(baseline) || !Number.isFinite(variant)) {
    return 'same';
  }
  if (nearlyEqual(baseline, variant)) {
    return 'same';
  }
  return variant > baseline ? 'higher' : 'lower';
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
