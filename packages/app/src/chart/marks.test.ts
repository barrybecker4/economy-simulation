import { describe, expect, it } from 'vitest';
import type { RunSuccess } from '../worker/protocol.js';
import { eventsAt, hasMarks, mergeMarks, runMarks } from './marks.js';

function impulses(
  demand: number[],
  credit: number[],
  productivity: number[],
): Record<string, number[]> {
  return {
    demandImpulse: demand,
    creditImpulse: credit,
    productivityImpulse: productivity,
  };
}

function singleRun(series: Record<string, number[]>): RunSuccess {
  const ticks = series.demandImpulse?.map((_, index) => index) ?? [];
  return { kind: 'run', ticks, series };
}

describe('runMarks', () => {
  it('finds demand expansion and contraction spells', () => {
    const demand = [
      0, 0, 0.1, 0.1, 0.1, -0.05, -0.05, -0.05, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    const zeros = demand.map(() => 0);
    const marks = runMarks(singleRun(impulses(demand, zeros, zeros)), 0);
    expect(marks.bands).toEqual([
      {
        kind: 'demand-expansion',
        label: 'Demand expansion',
        color: '#0f766e',
        start: 2,
        end: 4,
        style: 'solo',
      },
      {
        kind: 'demand-contraction',
        label: 'Demand contraction',
        color: '#b91c1c',
        start: 5,
        end: 7,
        style: 'solo',
      },
    ]);
    expect(marks.rules).toEqual([]);
  });

  it('marks a credit write-off on the first contraction month', () => {
    const credit = [
      0, 0, 0.05, 0.05, 0.05, -0.05, -0.05, -0.05, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    const zeros = credit.map(() => 0);
    const marks = runMarks(singleRun(impulses(zeros, credit, zeros)), 0, 'variant');
    expect(marks.bands.map((band) => ({ kind: band.kind, start: band.start, end: band.end }))).toEqual(
      [
        { kind: 'credit-expansion', start: 2, end: 4 },
        { kind: 'credit-contraction', start: 5, end: 7 },
      ],
    );
    expect(marks.rules).toEqual([
      {
        kind: 'credit-write-off',
        label: 'Credit write-off',
        color: '#b91c1c',
        tick: 5,
        style: 'variant',
      },
    ]);
  });

  it('draws only the expansion band for a productivity shock', () => {
    const productivity = [
      0, 0, 0.08, 0.08, 0.08, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    const zeros = productivity.map(() => 0);
    const marks = runMarks(singleRun(impulses(zeros, zeros, productivity)), 0);
    expect(marks.bands).toEqual([
      {
        kind: 'productivity-expansion',
        label: 'Productivity expansion',
        color: '#0f766e',
        start: 2,
        end: 4,
        style: 'solo',
      },
    ]);
    expect(marks.rules).toEqual([]);
  });

  it('keeps a partial band when the run ends mid-spell', () => {
    const demand = [0.1, 0.1, 0.1];
    const zeros = [0, 0, 0];
    const marks = runMarks(singleRun(impulses(demand, zeros, zeros)), 0);
    expect(marks.bands).toEqual([
      {
        kind: 'demand-expansion',
        label: 'Demand expansion',
        color: '#0f766e',
        start: 0,
        end: 2,
        style: 'solo',
      },
    ]);
  });

  it('adds a transition band and rebase rule from the length', () => {
    const zeros = Array.from({ length: 10 }, () => 0);
    const marks = runMarks(singleRun(impulses(zeros, zeros, zeros)), 6, 'baseline');
    expect(marks.bands).toEqual([
      {
        kind: 'fiat-transition',
        label: 'Fiat transition',
        color: '#64748b',
        start: 0,
        end: 5,
        style: 'baseline',
      },
    ]);
    expect(marks.rules).toEqual([
      {
        kind: 'bitcoin-rebase',
        label: 'Bitcoin rebase',
        color: '#64748b',
        tick: 5,
        style: 'baseline',
      },
    ]);
  });

  it('draws nothing for a zero transition length', () => {
    const zeros = [0, 0, 0];
    const marks = runMarks(singleRun(impulses(zeros, zeros, zeros)), 0);
    expect(hasMarks(marks)).toBe(false);
  });

  it('shades a truncated transition without a rebase rule', () => {
    const zeros = [0, 0, 0];
    const marks = runMarks(singleRun(impulses(zeros, zeros, zeros)), 12);
    expect(marks.bands).toEqual([
      {
        kind: 'fiat-transition',
        label: 'Fiat transition',
        color: '#64748b',
        start: 0,
        end: 2,
        style: 'solo',
      },
    ]);
    expect(marks.rules).toEqual([]);
  });

  it('omits shocks on a multi-seed median and keeps the transition', () => {
    const ticks = [0, 1, 2, 3];
    const result: RunSuccess = {
      kind: 'band',
      ticks,
      series: {},
      bands: {},
    };
    const marks = runMarks(result, 3);
    expect(marks.bands).toEqual([
      {
        kind: 'fiat-transition',
        label: 'Fiat transition',
        color: '#64748b',
        start: 0,
        end: 2,
        style: 'solo',
      },
    ]);
    expect(marks.rules).toEqual([
      {
        kind: 'bitcoin-rebase',
        label: 'Bitcoin rebase',
        color: '#64748b',
        tick: 2,
        style: 'solo',
      },
    ]);
  });
});

describe('eventsAt', () => {
  it('lists baseline events before variant events on the same month', () => {
    const zeros = Array.from({ length: 8 }, () => 0);
    const demand = [0, 0, 0.1, 0.1, -0.05, -0.05, 0, 0];
    const baseline = runMarks(singleRun(impulses(demand, zeros, zeros)), 4, 'baseline');
    const variant = runMarks(singleRun(impulses(zeros, zeros, zeros)), 4, 'variant');
    const merged = mergeMarks(baseline, variant);
    expect(eventsAt(merged, 3).map((event) => ({ label: event.label, style: event.style }))).toEqual(
      [
        { label: 'Demand expansion', style: 'baseline' },
        { label: 'Fiat transition', style: 'baseline' },
        { label: 'Bitcoin rebase', style: 'baseline' },
        { label: 'Fiat transition', style: 'variant' },
        { label: 'Bitcoin rebase', style: 'variant' },
      ],
    );
    expect(eventsAt(merged, 5).map((event) => ({ label: event.label, style: event.style }))).toEqual(
      [{ label: 'Demand contraction', style: 'baseline' }],
    );
  });

  it('includes the write-off and rebase on their months', () => {
    const credit = [0.05, 0.05, -0.05, -0.05];
    const zeros = [0, 0, 0, 0];
    const marks = runMarks(singleRun(impulses(zeros, credit, zeros)), 3);
    expect(eventsAt(marks, 2).map((event) => event.label)).toEqual([
      'Credit contraction',
      'Fiat transition',
      'Credit write-off',
      'Bitcoin rebase',
    ]);
  });
});
