import { describe, expect, it } from 'vitest';
import type { PercentileBand, RunSuccess } from '../worker/protocol.js';
import { CHART_METRICS } from '../worker/series.js';
import { maxFlowAmount, monthFlows, strokeWidth } from './flows.js';

const ticks = [0, 1, 2];

function series(fill: number): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const id of CHART_METRICS) {
    out[id] = ticks.map(() => fill);
  }
  out.householdGoodsSpend = [10, 20, 30];
  out.wageBill = [100, 200, 300];
  out.newBorrowing = [0, 5, 0];
  return out;
}

describe('monthFlows', () => {
  it('reads the selected month in the regime unit', () => {
    const result: RunSuccess = { kind: 'run', ticks, series: series(1) };
    const flows = monthFlows(result, 'fiat', 1);
    expect(flows.monthIndex).toBe(1);
    expect(flows.unit).toBe('cents');
    expect(flows.edges.find((edge) => edge.label === 'Wages')?.amount).toBe(200);
    expect(
      flows.edges.find((edge) => edge.from === 'households' && edge.to === 'firms')?.amount,
    ).toBe(20);
  });

  it('uses band medians and clamps the month index', () => {
    const bands: Record<string, PercentileBand> = {};
    for (const id of CHART_METRICS) {
      bands[id] = { low: [0, 0, 0], mid: [1, 2, 3], high: [4, 5, 6] };
    }
    bands.wageBill = { low: [0, 0, 0], mid: [10, 20, 30], high: [40, 50, 60] };
    const flows = monthFlows({ kind: 'band', ticks, series: {}, bands }, 'bitcoin', 99);
    expect(flows.monthIndex).toBe(2);
    expect(flows.unit).toBe('satoshis');
    expect(flows.edges.find((edge) => edge.label === 'Wages')?.amount).toBe(30);
  });
});

describe('strokeWidth', () => {
  it('scales with the largest flow and hides zeros', () => {
    expect(strokeWidth(0, 100)).toBe(0);
    expect(strokeWidth(50, 100)).toBe(7);
    expect(strokeWidth(100, 100)).toBe(14);
    expect(maxFlowAmount([{ amount: 3 }, { amount: 9 }, { amount: 1 }] as never)).toBe(9);
  });
});
