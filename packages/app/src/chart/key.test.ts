import { describe, expect, it } from 'vitest';
import { buildPlot } from './options.js';

const line = { label: 'CPI', color: '#246', values: [1, 2] };
const origin = new Date(2026, 0, 15);

function drawnKey(
  width: number,
  ticks: readonly number[],
  lines: readonly (typeof line)[],
): string {
  return buildPlot(width, ticks, lines, origin).key;
}

describe('buildPlot', () => {
  it('changes the plot identity when the width, a value, or a pair mark changes', () => {
    const ticks = [0, 1];
    const first = drawnKey(640, ticks, [line]);
    expect(drawnKey(640, ticks, [line])).toBe(first);
    expect(drawnKey(320, ticks, [line])).not.toBe(first);
    expect(drawnKey(640, ticks, [{ ...line, values: [1, 3] }])).not.toBe(first);
    expect(drawnKey(640, ticks, [{ ...line, label: 'Other' }])).not.toBe(first);
    expect(drawnKey(640, ticks, [{ ...line, dash: [6, 4] }])).not.toBe(first);
    expect(drawnKey(640, ticks, [{ ...line, omitLegend: true }])).not.toBe(first);
    expect(drawnKey(640, ticks, [{ ...line, pair: 'cpi' }])).not.toBe(first);
    expect(drawnKey(640, ticks, [{ ...line, scale: 'sats', unit: 'satoshis' }])).not.toBe(first);
  });
});
