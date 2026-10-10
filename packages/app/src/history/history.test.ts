import { describe, expect, it } from 'vitest';
import type { PercentileBand, RunSuccess } from '../worker/protocol.js';
import { CHART_METRICS } from '../worker/series.js';
import { chartViews } from '../chart/view.js';
import {
  HISTORY_DASH,
  HISTORY_MONTHS,
  calendarMonthKey,
  historyAxisTicks,
  historyValue,
} from './history.js';

const origin = new Date(2026, 9, 1);

function series(values: number[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const id of CHART_METRICS) {
    out[id] = [...values];
  }
  return out;
}

function bands(mid: number[]): Record<string, PercentileBand> {
  const out: Record<string, PercentileBand> = {};
  for (const id of CHART_METRICS) {
    out[id] = {
      low: mid.map((value) => value - 1),
      mid: [...mid],
      high: mid.map((value) => value + 1),
    };
  }
  return out;
}

function runOf(ticks: number[], values: number[]): RunSuccess {
  return { kind: 'run', ticks, series: series(values) };
}

describe('history helpers', () => {
  it('names the calendar month for a tick relative to the origin', () => {
    expect(calendarMonthKey(origin, 0)).toBe('2026-10');
    expect(calendarMonthKey(origin, -1)).toBe('2026-09');
    expect(calendarMonthKey(origin, -120)).toBe('2016-10');
  });

  it('looks up unemployment from the checked-in series', () => {
    expect(historyValue('unemployment', origin, -120)).toBe(0.049);
    expect(historyValue('unemployment', origin, 0)).toBeNull();
  });

  it('prefixes the axis with 120 months before the run', () => {
    expect(historyAxisTicks([0, 1]).slice(0, 3)).toEqual([-120, -119, -118]);
    expect(historyAxisTicks([0, 1]).at(-1)).toBe(1);
    expect(historyAxisTicks([0, 1])).toHaveLength(HISTORY_MONTHS + 2);
  });
});

describe('chartViews with US history', () => {
  it('leaves the axis and line count unchanged when history is off', () => {
    const ticks = [0, 1];
    const views = chartViews(runOf(ticks, [0.05, 0.06]), 'fiat', null, 0, {
      showHistory: false,
      origin,
    });
    const labor = views.find((view) => view.key === 'labor');
    expect(labor?.ticks).toEqual(ticks);
    expect(labor?.lines).toHaveLength(3);
    expect(labor?.note).toBeUndefined();
  });

  it('pads the axis and nulls model lines before the run', () => {
    const ticks = [0, 1];
    const views = chartViews(runOf(ticks, [0.05, 0.06]), 'fiat', null, 0, {
      showHistory: true,
      origin,
    });
    const labor = views.find((view) => view.key === 'labor');
    expect(labor?.ticks[0]).toBe(-HISTORY_MONTHS);
    expect(labor?.ticks.at(-1)).toBe(1);
    expect(labor?.ticks).toHaveLength(HISTORY_MONTHS + 2);
    const unemployment = labor?.lines.find((line) => line.label === 'Unemployment');
    expect(unemployment?.values.slice(0, HISTORY_MONTHS).every((value) => value === null)).toBe(
      true,
    );
    expect(unemployment?.values.slice(HISTORY_MONTHS)).toEqual([0.05, 0.06]);
  });

  it('draws a US unemployment line from the file that stops at the run', () => {
    const ticks = [0, 1];
    const views = chartViews(runOf(ticks, [0.99, 0.99]), 'fiat', null, 0, {
      showHistory: true,
      origin,
    });
    const labor = views.find((view) => view.key === 'labor');
    const us = labor?.lines.find((line) => line.label === 'US Unemployment');
    expect(us?.dash).toEqual(HISTORY_DASH);
    expect(us?.values[0]).toBe(0.049);
    expect(us?.values.at(-1)).toBeNull();
    expect(us?.values.at(-2)).toBeNull();
    const lastHistory = us?.values[HISTORY_MONTHS - 1];
    expect(lastHistory).not.toBe(0.99);
    expect(lastHistory).toBe(historyValue('unemployment', origin, -1));
  });

  it('rebases a US price line so the last historical month matches the run opening', () => {
    const ticks = [0, 1];
    const openCpi = 200;
    const values = series([openCpi, openCpi + 1]);
    const views = chartViews({ kind: 'run', ticks, series: values }, 'fiat', null, 0, {
      showHistory: true,
      origin,
    });
    const prices = views.find((view) => view.key === 'prices');
    const us = prices?.lines.find((line) => line.label === 'US CPI');
    const historyPoints = us?.values.filter((value): value is number => value !== null) ?? [];
    expect(historyPoints.at(-1)).toBeCloseTo(openCpi, 6);
    expect(us?.values.at(-1)).toBeNull();
  });

  it('keeps the history prefix length independent of the run length', () => {
    const short = chartViews(runOf([0, 1], [1, 2]), 'fiat', null, 0, {
      showHistory: true,
      origin,
    });
    const long = chartViews(
      runOf(
        Array.from({ length: 24 }, (_, i) => i),
        Array.from({ length: 24 }, () => 1),
      ),
      'fiat',
      null,
      0,
      { showHistory: true, origin },
    );
    expect(short[0]?.ticks.slice(0, HISTORY_MONTHS)).toEqual(
      long[0]?.ticks.slice(0, HISTORY_MONTHS),
    );
  });

  it('extends the CPI band axis without adding a US line', () => {
    const ticks = [0, 1];
    const views = chartViews(
      { kind: 'band', ticks, series: {}, bands: bands([100, 101]) },
      'fiat',
      null,
      0,
      { showHistory: true, origin },
    );
    const band = views.find((view) => view.key === 'cpi-band');
    expect(band?.ticks[0]).toBe(-HISTORY_MONTHS);
    expect(band?.lines.every((line) => !line.label.startsWith('US '))).toBe(true);
  });
});
