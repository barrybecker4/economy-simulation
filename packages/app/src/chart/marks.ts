import type { RunSuccess } from '../worker/protocol.js';
import { requireSeries } from '../worker/series.js';

/** How a mark is drawn when a baseline is pinned. Solo is a single run. */
export type MarkStyle = 'solo' | 'baseline' | 'variant';

export type MarkKind =
  | 'demand-expansion'
  | 'demand-contraction'
  | 'credit-expansion'
  | 'credit-contraction'
  | 'credit-write-off'
  | 'productivity-expansion'
  | 'fiat-transition'
  | 'bitcoin-rebase';

export interface ChartBand {
  kind: MarkKind;
  label: string;
  color: string;
  /** Inclusive start month index. */
  start: number;
  /** Inclusive end month index. */
  end: number;
  style: MarkStyle;
}

export interface ChartRule {
  kind: MarkKind;
  label: string;
  color: string;
  /** Month index of the vertical rule. */
  tick: number;
  style: MarkStyle;
}

export interface ChartMarks {
  bands: ChartBand[];
  rules: ChartRule[];
}

export interface ChartEvent {
  kind: MarkKind;
  label: string;
  color: string;
  style: MarkStyle;
}

/** Expansion bands (demand, credit, productivity). */
const EXPANSION = '#0f766e';
/** Contraction bands and the credit write-off rule. */
const CONTRACTION = '#b91c1c';
const TRANSITION = '#64748b';

const LABELS: Record<MarkKind, string> = {
  'demand-expansion': 'Demand expansion',
  'demand-contraction': 'Demand contraction',
  'credit-expansion': 'Credit expansion',
  'credit-contraction': 'Credit contraction',
  'credit-write-off': 'Credit write-off',
  'productivity-expansion': 'Productivity expansion',
  'fiat-transition': 'Fiat to bitcoin transition',
  'bitcoin-rebase': 'Bitcoin rebase',
};

/** Sentence appended to a chart description when that chart has marks. */
export const MARKS_TIP =
  'Shaded bands mark shocks and a fiat to bitcoin transition. Hover a month to see the event name in the legend.';

export function emptyMarks(): ChartMarks {
  return { bands: [], rules: [] };
}

/**
 * Named events for one run. Single-seed shocks come from the impulse series.
 * Multi-seed medians omit shocks. A positive transition length always adds the
 * transition band and, when the run reaches that month, the rebase rule.
 */
export function runMarks(
  result: RunSuccess,
  transitionLength: number,
  style: MarkStyle = 'solo',
): ChartMarks {
  const marks = emptyMarks();
  if (result.kind === 'run') {
    addShockBands(marks, requireSeries(result.series, 'demandImpulse'), 'demand', style);
    addShockBands(marks, requireSeries(result.series, 'creditImpulse'), 'credit', style);
    addShockBands(marks, requireSeries(result.series, 'productivityImpulse'), 'productivity', style);
  }
  addTransition(marks, result.ticks.length, transitionLength, style);
  return marks;
}

export function mergeMarks(baseline: ChartMarks, variant: ChartMarks): ChartMarks {
  return {
    bands: [...baseline.bands, ...variant.bands],
    rules: [...baseline.rules, ...variant.rules],
  };
}

export function hasMarks(marks: ChartMarks): boolean {
  return marks.bands.length > 0 || marks.rules.length > 0;
}

/** Events active on a month, baseline then scenario, bands before rules of the same style. */
export function eventsAt(marks: ChartMarks, month: number): ChartEvent[] {
  const events: ChartEvent[] = [];
  for (const style of ['solo', 'baseline', 'variant'] as const) {
    for (const band of marks.bands) {
      if (band.style === style && month >= band.start && month <= band.end) {
        events.push(eventOf(band));
      }
    }
    for (const rule of marks.rules) {
      if (rule.style === style && rule.tick === month) {
        events.push(eventOf(rule));
      }
    }
  }
  return events;
}

function eventOf(mark: { kind: MarkKind; label: string; color: string; style: MarkStyle }): ChartEvent {
  return { kind: mark.kind, label: mark.label, color: mark.color, style: mark.style };
}

function addShockBands(
  marks: ChartMarks,
  values: readonly number[],
  channel: 'demand' | 'credit' | 'productivity',
  style: MarkStyle,
): void {
  for (const spell of signedSpells(values)) {
    if (spell.sign > 0) {
      const kind = expansionKind(channel);
      marks.bands.push(band(kind, spell.start, spell.end, EXPANSION, style));
      continue;
    }
    if (channel === 'productivity') {
      continue;
    }
    const kind = contractionKind(channel);
    marks.bands.push(band(kind, spell.start, spell.end, CONTRACTION, style));
    if (channel === 'credit') {
      marks.rules.push(rule('credit-write-off', spell.start, CONTRACTION, style));
    }
  }
}

function addTransition(
  marks: ChartMarks,
  tickCount: number,
  length: number,
  style: MarkStyle,
): void {
  const months = Math.round(length);
  if (months <= 0 || tickCount <= 0) {
    return;
  }
  const lastMonth = months - 1;
  const end = Math.min(lastMonth, tickCount - 1);
  marks.bands.push(band('fiat-transition', 0, end, TRANSITION, style));
  if (lastMonth < tickCount) {
    marks.rules.push(rule('bitcoin-rebase', lastMonth, TRANSITION, style));
  }
}

function signedSpells(
  values: readonly number[],
): Array<{ start: number; end: number; sign: 1 | -1 }> {
  const spells: Array<{ start: number; end: number; sign: 1 | -1 }> = [];
  let start = -1;
  let sign: 1 | -1 | 0 = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    const next: 1 | -1 | 0 = value > 0 ? 1 : value < 0 ? -1 : 0;
    if (next === 0) {
      if (sign !== 0 && start >= 0) {
        spells.push({ start, end: index - 1, sign });
      }
      start = -1;
      sign = 0;
      continue;
    }
    if (sign === next) {
      continue;
    }
    if (sign !== 0 && start >= 0) {
      spells.push({ start, end: index - 1, sign });
    }
    start = index;
    sign = next;
  }
  if (sign !== 0 && start >= 0) {
    spells.push({ start, end: values.length - 1, sign });
  }
  return spells;
}

function band(
  kind: MarkKind,
  start: number,
  end: number,
  color: string,
  style: MarkStyle,
): ChartBand {
  return { kind, label: LABELS[kind], color, start, end, style };
}

function rule(kind: MarkKind, tick: number, color: string, style: MarkStyle): ChartRule {
  return { kind, label: LABELS[kind], color, tick, style };
}

function expansionKind(channel: 'demand' | 'credit' | 'productivity'): MarkKind {
  if (channel === 'demand') {
    return 'demand-expansion';
  }
  if (channel === 'credit') {
    return 'credit-expansion';
  }
  return 'productivity-expansion';
}

function contractionKind(channel: 'demand' | 'credit'): MarkKind {
  return channel === 'demand' ? 'demand-contraction' : 'credit-contraction';
}
