import { describe, expect, it } from 'vitest';
import type { PercentileBand, RunSuccess } from '../worker/protocol.js';
import { CHART_METRICS } from '../worker/series.js';
import { chartViews, moneyUnit, VARIANT_DASH } from './view.js';

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
      'tax',
      'credit',
      'ai',
      'ai-spend',
      'output',
      'living',
      'inequality',
      'turnover',
      'money',
      'shocks',
      'flows',
    ]);
    expect(fiat.find((view) => view.key === 'prices')?.unit).toBe('cents');
    expect(fiat.find((view) => view.key === 'tax')?.unit).toBe('cents');
    expect(bitcoin.find((view) => view.key === 'ubi')?.unit).toBe('satoshis');
    expect(fiat.find((view) => view.key === 'output')?.group).toBe('Output');
    expect(fiat.find((view) => view.key === 'shocks')?.lines.map((line) => line.label)).toEqual([
      'Demand',
      'Credit',
      'Productivity',
    ]);
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
    const pricesAt = views.findIndex((view) => view.key === 'prices');
    expect(views[pricesAt + 1]?.key).toBe('cpi-band');
    expect(views[pricesAt + 1]?.unit).toBe('satoshis');
    expect(views[pricesAt + 1]?.lines.map((line) => line.label)).toEqual(['5th', 'Median', '95th']);
  });

  it('shows fiat money charts in dollars when a point is above 1000 cents', () => {
    const cents = [500, 250_000];
    const dollars = [5, 2_500];
    const views = chartViews({ kind: 'run', ticks, series: series(cents) }, 'fiat');
    for (const key of ['prices', 'ubi', 'tax', 'ai-spend', 'living', 'money', 'flows']) {
      const view = views.find((item) => item.key === key);
      expect(view?.unit).toBe('dollars');
      expect(view?.lines[0]?.values).toEqual(dollars);
    }
    expect(views.find((view) => view.key === 'tax')?.lines[1]?.values).toEqual(dollars);
    expect(views.find((view) => view.key === 'labor')?.unit).toBe('share');
    expect(views.find((view) => view.key === 'labor')?.lines[0]?.values).toEqual(cents);
    expect(views.find((view) => view.key === 'output')?.unit).toBe('real units');
    expect(views.find((view) => view.key === 'wellbeing')?.unit).toBe('log points');
  });

  it('keeps money charts in cents at 1000 and in satoshis under bitcoin', () => {
    const atCap = chartViews({ kind: 'run', ticks, series: series([0, 1_000]) }, 'fiat');
    const capped = atCap.find((view) => view.key === 'ubi');
    expect(capped?.unit).toBe('cents');
    expect(capped?.lines[0]?.values).toEqual([0, 1_000]);

    const justOver = chartViews({ kind: 'run', ticks, series: series([0, 1_100]) }, 'fiat');
    const grant = justOver.find((view) => view.key === 'ubi');
    expect(grant?.unit).toBe('dollars');
    expect(grant?.lines[0]?.values).toEqual([0, 11]);

    const bitcoin = chartViews({ kind: 'run', ticks, series: series([0, 250_000]) }, 'bitcoin');
    const ubi = bitcoin.find((view) => view.key === 'ubi');
    expect(ubi?.unit).toBe('satoshis');
    expect(ubi?.lines[0]?.values).toEqual([0, 250_000]);
  });

  it('scales a fiat CPI band to dollars and leaves the two-regime chart in its own units', () => {
    const wide = chartViews(
      { kind: 'band', ticks, series: {}, bands: bands([200, 20_000]) },
      'fiat',
    );
    const band = wide.find((view) => view.key === 'cpi-band');
    expect(band?.unit).toBe('dollars');
    expect(band?.lines.find((line) => line.label === 'Median')?.values).toEqual([2, 200]);

    const compared = series([500, 250_000]);
    compared.priceLevelBitcoin = [8, 9];
    const views = chartViews({ kind: 'compare', ticks, series: compared }, 'fiat');
    expect(views[0]?.unit).toBe('');
    expect(views[0]?.lines[0]?.values).toEqual([500, 250_000]);
    expect(views.find((view) => view.key === 'prices')?.unit).toBe('dollars');
    expect(views.find((view) => view.key === 'prices')?.lines[0]?.values).toEqual([5, 2_500]);
  });

  it('overlays a solid baseline and a dashed variant in the same color', () => {
    const baseline = { kind: 'run' as const, ticks, series: series([1, 2]) };
    const variant = { kind: 'run' as const, ticks, series: series([3, 4]) };
    const views = chartViews(variant, 'fiat', { result: baseline, regime: 'fiat' });
    const prices = views.find((view) => view.key === 'prices');
    expect(prices?.lines.map((line) => line.label)).toEqual([
      'CPI baseline',
      'CPI',
      'Food and bev baseline',
      'Food and bev',
      'Housing baseline',
      'Housing',
      'Energy baseline',
      'Energy',
      'Apparel baseline',
      'Apparel',
      'Transportation baseline',
      'Transportation',
      'Medical baseline',
      'Medical',
      'Education baseline',
      'Education',
      'Recreation baseline',
      'Recreation',
      'Electronics baseline',
      'Electronics',
    ]);
    expect(prices?.lines[0]?.values).toEqual([1, 2]);
    expect(prices?.lines[1]?.values).toEqual([3, 4]);
    expect(prices?.lines[0]?.color).toBe('#1e3a8a');
    expect(prices?.lines[1]?.color).toBe('#1e3a8a');
    expect(prices?.lines[0]?.dash).toBeUndefined();
    expect(prices?.lines[1]?.dash).toEqual([...VARIANT_DASH]);
    expect(prices?.unit).toBe('cents');
  });

  it('scales paired fiat money charts from the combined peak', () => {
    const baseline = { kind: 'run' as const, ticks, series: series([100, 200]) };
    const variant = { kind: 'run' as const, ticks, series: series([500, 2_000]) };
    const views = chartViews(variant, 'fiat', { result: baseline, regime: 'fiat' });
    const ubi = views.find((view) => view.key === 'ubi');
    expect(ubi?.unit).toBe('dollars');
    expect(ubi?.lines.map((line) => line.values)).toEqual([
      [1, 2],
      [5, 20],
    ]);
    expect(ubi?.lines[1]?.dash).toEqual([...VARIANT_DASH]);
  });

  it('annotates mixed money units on paired charts', () => {
    const baseline = { kind: 'run' as const, ticks, series: series([500, 250_000]) };
    const variant = { kind: 'run' as const, ticks, series: series([8, 9]) };
    const views = chartViews(variant, 'bitcoin', { result: baseline, regime: 'fiat' });
    const prices = views.find((view) => view.key === 'prices');
    expect(prices?.unit).toBe('');
    expect(prices?.note).toMatch(/unit is in its label/);
    expect(prices?.lines[0]?.label).toBe('CPI baseline (cents)');
    expect(prices?.lines[1]?.label).toBe('CPI (satoshis)');
    expect(prices?.lines[0]?.values).toEqual([500, 250_000]);
    expect(prices?.lines[1]?.values).toEqual([8, 9]);
  });

  it('ignores a baseline for band and regime-compare results', () => {
    const baseline = { kind: 'run' as const, ticks, series: series([1, 2]) };
    const band = chartViews(
      { kind: 'band', ticks, series: {}, bands: bands([3, 4]) },
      'fiat',
      { result: baseline, regime: 'fiat' },
    );
    expect(band[0]?.lines.map((line) => line.label)).toEqual([
      'Mean well-being',
      'Median well-being',
    ]);
    const compared = series([1, 2]);
    compared.priceLevelBitcoin = [8, 9];
    const views = chartViews(
      { kind: 'compare', ticks, series: compared },
      'fiat',
      { result: baseline, regime: 'fiat' },
    );
    expect(views[0]?.key).toBe('regimes');
    expect(views.find((view) => view.key === 'prices')?.lines).toHaveLength(10);
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
