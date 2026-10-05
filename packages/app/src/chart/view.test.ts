import { describe, expect, it } from 'vitest';
import type { PercentileBand, RunSuccess } from '../worker/protocol.js';
import { CHART_METRICS } from '../worker/series.js';
import { chartViews, moneyUnit } from './view.js';

const ticks = [0, 1];

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

describe('moneyUnit', () => {
  it('uses cents for fiat and satoshis for bitcoin and hybrid', () => {
    expect(moneyUnit('fiat')).toBe('cents');
    expect(moneyUnit('bitcoin')).toBe('satoshis');
    expect(moneyUnit('hybrid')).toBe('satoshis');
    expect(() => moneyUnit('gold')).toThrow(/Unknown regime gold/);
  });
});

describe('chartViews', () => {
  it('draws a fiat run in cents and a bitcoin run in satoshis', () => {
    const fiat = chartViews({ kind: 'run', ticks, series: series([1, 2]) }, 'fiat');
    const bitcoin = chartViews({ kind: 'run', ticks, series: series([1, 2]) }, 'bitcoin');
    expect(fiat.map((view) => view.key)).toEqual([
      'wellbeing',
      'prices',
      'labor',
      'ubi',
      'credit',
      'ai',
    ]);
    expect(fiat.find((view) => view.key === 'prices')?.unit).toBe('cents');
    expect(bitcoin.find((view) => view.key === 'ubi')?.unit).toBe('satoshis');
    expect(fiat[0]?.lines.map((line) => line.label)).toEqual([
      'Mean well-being',
      'Median well-being',
    ]);
  });

  it('puts the two-regime CPI first and keeps the other charts in fiat cents', () => {
    const compared = series([1, 2]);
    compared.priceLevelBitcoin = [8, 9];
    const views = chartViews({ kind: 'compare', ticks, series: compared }, 'bitcoin');
    expect(views[0]?.key).toBe('regimes');
    expect(views[0]?.unit).toBe('');
    expect(views[0]?.note).toMatch(/fiat run only/);
    expect(views[0]?.lines.map((line) => line.values)).toEqual([
      [1, 2],
      [8, 9],
    ]);
    expect(views.find((view) => view.key === 'prices')?.unit).toBe('cents');
  });

  it('draws band medians and a CPI percentile chart', () => {
    const views = chartViews({ kind: 'band', ticks, series: {}, bands: bands([3, 4]) }, 'hybrid');
    expect(views[0]?.lines[0]?.values).toEqual([3, 4]);
    expect(views.at(-1)?.key).toBe('cpi-band');
    expect(views.at(-1)?.unit).toBe('satoshis');
    expect(views.at(-1)?.lines.map((line) => line.label)).toEqual(['5th', 'Median', '95th']);
  });

  it('rejects a run with no ticks, a missing series, or a short series', () => {
    const empty: RunSuccess = { kind: 'run', ticks: [], series: series([]) };
    expect(() => chartViews(empty, 'fiat')).toThrow(/no ticks/);
    expect(() => chartViews({ kind: 'run', ticks, series: {} }, 'fiat')).toThrow(/Missing series/);
    const short = series([1, 2]);
    short.meanWellbeing = [1];
    expect(() => chartViews({ kind: 'run', ticks, series: short }, 'fiat')).toThrow(
      /Mean well-being/,
    );
    const compared = series([1, 2]);
    expect(() => chartViews({ kind: 'compare', ticks, series: compared }, 'fiat')).toThrow(
      /priceLevelBitcoin/,
    );
  });
});
