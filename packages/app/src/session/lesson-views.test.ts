import { describe, expect, it } from 'vitest';
import { emptyMarks } from '../chart/marks.js';
import type { ChartView } from '../chart/view.js';
import { presentLessonCharts } from './lesson-views.js';
import { requireLesson } from './lessons.js';

function view(key: string, labels: readonly string[]): ChartView {
  return {
    key,
    title: key,
    unit: '',
    description: 'research copy',
    ticks: [0, 1],
    lines: labels.map((label, index) => ({
      label,
      values: [index, index + 1],
      color: '#000',
      ...(label === 'CPI' ? { pair: 'priceLevel' } : {}),
    })),
    group: 'Prices',
    marks: emptyMarks(),
    caption: 'CPI ends higher (1 → 2).',
  };
}

describe('presentLessonCharts', () => {
  it('keeps student titles and filters price lines', () => {
    const lesson = requireLesson('prices');
    const presented = presentLessonCharts(
      [
        view('prices', [
          'CPI',
          'Food and bev',
          'Housing',
          'Medical',
          'Apparel',
          'Electronics',
        ]),
        view('labor', ['Unemployment']),
      ],
      lesson,
    );
    expect(presented).toHaveLength(1);
    expect(presented[0]?.title).toBe('Prices');
    expect(presented[0]?.description).toMatch(/Category prices/);
    expect(presented[0]?.group).toBe('Lesson');
    expect(presented[0]?.lines.map((line) => line.label)).toEqual([
      'CPI',
      'Housing',
      'Medical',
      'Apparel',
      'Electronics',
    ]);
  });
});
