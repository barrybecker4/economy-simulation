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
      'earnings',
      'ubi',
      'tax',
      'credit',
      'defaults',
      'bank-failures',
      'consumer-borrowing',
      'ai',
      'ai-spend',
      'output',
      'growth',
      'living',
      'tenure',
      'tenure-moves',
      'housing-pressure',
      'home-price',
      'inequality',
      'total-wealth',
      'typical-wealth',
      'turnover',
      'money',
      'money-mix',
      'bitcoin-price',
      'shocks',
      'cycle',
      'flows',
    ]);
    expect(fiat.find((view) => view.key === 'prices')?.unit).toBe('cents');
    expect(fiat.find((view) => view.key === 'tax')?.unit).toBe('cents');
    expect(bitcoin.find((view) => view.key === 'ubi')?.unit).toBe('satoshis');
    expect(fiat.find((view) => view.key === 'output')?.group).toBe('Output');
    expect(fiat.find((view) => view.key === 'tenure')?.group).toBe('Living standards');
    expect(fiat.find((view) => view.key === 'tenure')?.unit).toBe('share');
    expect(fiat.find((view) => view.key === 'tenure')?.lines.map((line) => line.label)).toEqual([
      'Renting',
      'Mortgage',
      'Owned outright',
    ]);
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

  it('scales a fiat CPI band to dollars', () => {
    const wide = chartViews(
      { kind: 'band', ticks, series: {}, bands: bands([200, 20_000]) },
      'fiat',
    );
    const band = wide.find((view) => view.key === 'cpi-band');
    expect(band?.unit).toBe('dollars');
    expect(band?.lines.find((line) => line.label === 'Median')?.values).toEqual([2, 200]);
  });

  it('overlays a solid baseline and a dashed variant in the same color', () => {
    const baseline = { kind: 'run' as const, ticks, series: series([1, 2]) };
    const variant = { kind: 'run' as const, ticks, series: series([3, 4]) };
    const views = chartViews(variant, 'fiat', {
      result: baseline,
      regime: 'fiat',
      transitionLength: 0,
    });
    const prices = views.find((view) => view.key === 'prices');
    const legend = [
      'CPI',
      'Food and bev',
      'Housing',
      'Energy',
      'Apparel',
      'Transportation',
      'Medical',
      'Education',
      'Recreation',
      'Electronics',
    ];
    expect(
      prices?.lines.filter((line) => line.omitLegend !== true).map((line) => line.label),
    ).toEqual(legend);
    expect(
      prices?.lines.filter((line) => line.omitLegend === true).map((line) => line.label),
    ).toEqual(legend);
    expect(prices?.lines[0]?.pair).toBe(prices?.lines[1]?.pair);
    expect(prices?.lines[0]?.pair).not.toBe(prices?.lines[2]?.pair);
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
    const views = chartViews(variant, 'fiat', {
      result: baseline,
      regime: 'fiat',
      transitionLength: 0,
    });
    const ubi = views.find((view) => view.key === 'ubi');
    expect(ubi?.unit).toBe('dollars');
    expect(ubi?.lines.map((line) => line.values)).toEqual([
      [1, 2],
      [5, 20],
    ]);
    expect(ubi?.lines[0]?.omitLegend).toBe(true);
    expect(ubi?.lines[1]?.omitLegend).toBeUndefined();
    expect(ubi?.lines[0]?.pair).toBe(ubi?.lines[1]?.pair);
    expect(ubi?.lines[1]?.dash).toEqual([...VARIANT_DASH]);
  });

  it('draws mixed money on a left dollar axis and a right satoshi axis', () => {
    const baseline = { kind: 'run' as const, ticks, series: series([500, 250_000]) };
    const variant = { kind: 'run' as const, ticks, series: series([8, 9]) };
    const views = chartViews(variant, 'bitcoin', {
      result: baseline,
      regime: 'fiat',
      transitionLength: 0,
    });
    const prices = views.find((view) => view.key === 'prices');
    expect(prices?.unit).toBe('');
    expect(prices?.note).toBe(
      'Solid lines are the baseline, in dollars (left axis). Dashed lines are the scenario, in satoshis (right axis).',
    );
    expect(prices?.caption).toBe(
      'The baseline and scenario use different money units, so this chart does not score the scenario.',
    );
    expect(prices?.lines[0]?.label).toBe('CPI');
    expect(prices?.lines[1]?.label).toBe('CPI');
    expect(prices?.lines[0]?.omitLegend).toBe(true);
    expect(prices?.lines[1]?.omitLegend).toBeUndefined();
    expect(prices?.lines[0]?.values).toEqual([5, 2_500]);
    expect(prices?.lines[0]?.scale).toBe('y');
    expect(prices?.lines[0]?.unit).toBe('dollars');
    expect(prices?.lines[1]?.values).toEqual([8, 9]);
    expect(prices?.lines[1]?.scale).toBe('sats');
    expect(prices?.lines[1]?.unit).toBe('satoshis');
    expect(views.find((view) => view.key === 'labor')?.unit).toBe('share');
    expect(views.find((view) => view.key === 'labor')?.lines[0]?.scale).toBeUndefined();
  });

  it('keeps a small fiat series in cents on the left when the scenario is satoshis', () => {
    const baseline = { kind: 'run' as const, ticks, series: series([100, 500]) };
    const variant = { kind: 'run' as const, ticks, series: series([8, 9]) };
    const views = chartViews(variant, 'hybrid', {
      result: baseline,
      regime: 'fiat',
      transitionLength: 0,
    });
    const grant = views.find((view) => view.key === 'ubi');
    expect(grant?.note).toBe(
      'Solid lines are the baseline, in cents (left axis). Dashed lines are the scenario, in satoshis (right axis).',
    );
    expect(grant?.lines[0]?.values).toEqual([100, 500]);
    expect(grant?.lines[0]?.unit).toBe('cents');
    expect(grant?.lines[0]?.scale).toBe('y');
    expect(grant?.lines[1]?.values).toEqual([8, 9]);
    expect(grant?.lines[1]?.scale).toBe('sats');
  });

  it('keeps dollars on the left when the baseline is satoshis', () => {
    const baseline = { kind: 'run' as const, ticks, series: series([8, 9]) };
    const variant = { kind: 'run' as const, ticks, series: series([500, 250_000]) };
    const views = chartViews(variant, 'fiat', {
      result: baseline,
      regime: 'bitcoin',
      transitionLength: 0,
    });
    const grant = views.find((view) => view.key === 'ubi');
    expect(grant?.note).toBe(
      'Solid lines are the baseline, in satoshis (right axis). Dashed lines are the scenario, in dollars (left axis).',
    );
    expect(grant?.lines[0]?.values).toEqual([8, 9]);
    expect(grant?.lines[0]?.scale).toBe('sats');
    expect(grant?.lines[0]?.unit).toBe('satoshis');
    expect(grant?.lines[1]?.values).toEqual([5, 2_500]);
    expect(grant?.lines[1]?.scale).toBe('y');
    expect(grant?.lines[1]?.unit).toBe('dollars');
  });

  it('captions a verdict series and a directional series under a baseline', () => {
    const baselineSeries = series([1, 2]);
    baselineSeries.meanWellbeing = [1, 2];
    baselineSeries.medianWellbeing = [1, 2];
    baselineSeries.unemployment = [0.08, 0.08];
    baselineSeries.naturalUnemployment = [0.06, 0.06];
    baselineSeries.interestRate = [0.04, 0.04];
    baselineSeries.priceLevel = [100, 100];
    baselineSeries.totalRealWealth = [1000, 1000];
    const variantSeries = series([1, 2]);
    variantSeries.meanWellbeing = [1.5, 2.5];
    variantSeries.medianWellbeing = [1, 2];
    variantSeries.unemployment = [0.04, 0.04];
    variantSeries.naturalUnemployment = [0.06, 0.06];
    variantSeries.interestRate = [0.04, 0.04];
    variantSeries.priceLevel = [100, 108];
    variantSeries.totalRealWealth = [1000, 1500];
    const views = chartViews({ kind: 'run', ticks, series: variantSeries }, 'fiat', {
      result: { kind: 'run', ticks, series: baselineSeries },
      regime: 'fiat',
      transitionLength: 0,
    });
    expect(views.find((view) => view.key === 'wellbeing')?.caption).toBe(
      'Mean well-being ends higher (2 → 2.50). That is an improvement. Median well-being matches the baseline.',
    );
    expect(views.find((view) => view.key === 'labor')?.caption).toBe(
      'Unemployment ends lower (0.0800 → 0.0400). That is an improvement. Natural unemployment and Policy rate match the baseline.',
    );
    expect(views.find((view) => view.key === 'prices')?.caption).toMatch(
      /^CPI ends higher \(100 → 108\)\./,
    );
    expect(views.find((view) => view.key === 'prices')?.caption).not.toMatch(/improvement|worse/);
    expect(views.find((view) => view.key === 'credit')?.caption).toBe(
      'Every series matches the baseline.',
    );
    expect(views.find((view) => view.key === 'total-wealth')?.caption).toBe(
      'Total real wealth ends higher (10 → 15). That is an improvement. Cash wealth and Capital claims match the baseline.',
    );
  });

  it('omits captions when no baseline is pinned', () => {
    const views = chartViews({ kind: 'run', ticks, series: series([1, 2]) }, 'fiat');
    expect(views.every((view) => view.caption === undefined)).toBe(true);
  });

  it('overlays a baseline on a band using medians', () => {
    const baseline = { kind: 'run' as const, ticks, series: series([1, 2]) };
    const band = chartViews({ kind: 'band', ticks, series: {}, bands: bands([3, 4]) }, 'fiat', {
      result: baseline,
      regime: 'fiat',
      transitionLength: 0,
    });
    expect(band.find((view) => view.key === 'cpi-band')).toBeUndefined();
    const wellbeing = band[0];
    expect(wellbeing?.lines.map((line) => line.label)).toEqual([
      'Mean well-being',
      'Mean well-being',
      'Median well-being',
      'Median well-being',
    ]);
    expect(wellbeing?.lines[0]?.values).toEqual([1, 2]);
    expect(wellbeing?.lines[1]?.values).toEqual([3, 4]);
    expect(wellbeing?.lines[1]?.dash).toEqual(VARIANT_DASH);
  });

  it('overlays two bands without a CPI percentile chart', () => {
    const baseline = { kind: 'band' as const, ticks, series: {}, bands: bands([1, 2]) };
    const variant = { kind: 'band' as const, ticks, series: {}, bands: bands([3, 4]) };
    const views = chartViews(variant, 'fiat', {
      result: baseline,
      regime: 'fiat',
      transitionLength: 0,
    });
    expect(views.find((view) => view.key === 'cpi-band')).toBeUndefined();
    expect(views[0]?.lines[0]?.values).toEqual([1, 2]);
    expect(views[0]?.lines[1]?.values).toEqual([3, 4]);
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
  });

  it('attaches transition marks and a description tip', () => {
    const values = series([1, 2]);
    values.demandImpulse = [0, 0];
    values.creditImpulse = [0, 0];
    values.productivityImpulse = [0, 0];
    const views = chartViews({ kind: 'run', ticks, series: values }, 'fiat', null, 2);
    const prices = views.find((view) => view.key === 'prices');
    expect(prices?.marks.bands).toEqual([
      {
        kind: 'fiat-transition',
        label: 'Fiat to bitcoin transition',
        color: '#64748b',
        start: 0,
        end: 1,
        style: 'solo',
      },
    ]);
    expect(prices?.marks.rules).toEqual([
      {
        kind: 'bitcoin-rebase',
        label: 'Bitcoin rebase',
        color: '#64748b',
        tick: 1,
        style: 'solo',
      },
    ]);
    expect(prices?.description).toMatch(/Shaded bands mark shocks/);
  });
});
