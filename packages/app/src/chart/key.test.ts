import { describe, expect, it } from 'vitest';
import { chartKey } from './key.js';

const line = { label: 'CPI', color: '#246', values: [1, 2] };

describe('chartKey', () => {
  it('changes when the width, a value, or a label changes', () => {
    const ticks = [0, 1];
    const first = chartKey(640, ticks, [line]);
    expect(chartKey(640, ticks, [line])).toBe(first);
    expect(chartKey(320, ticks, [line])).not.toBe(first);
    expect(chartKey(640, ticks, [{ ...line, values: [1, 3] }])).not.toBe(first);
    expect(chartKey(640, ticks, [{ ...line, label: 'Other' }])).not.toBe(first);
    expect(chartKey(640, ticks, [{ ...line, dash: [6, 4] }])).not.toBe(first);
  });
});
