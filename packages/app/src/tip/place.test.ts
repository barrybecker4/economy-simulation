import { describe, expect, it } from 'vitest';
import {
  chartAnchorVisible,
  chartTipWidth,
  nameTipFrame,
  placeChartTip,
  placeNameTip,
  type Box,
} from './place.js';

const viewport = { width: 800, height: 600 };

function box(top: number, left: number, width: number, height: number): Box {
  return { top, left, right: left + width, bottom: top + height, width, height };
}

describe('placeChartTip', () => {
  it('centers a tip below the anchor when there is room', () => {
    const placed = placeChartTip(box(100, 300, 24, 24), box(0, 0, 400, 120), viewport);
    expect(placed).toEqual({ placement: 'below', left: 112, top: 132, arrow: 194 });
  });

  it('flips above the anchor when the bottom of the viewport is close', () => {
    const placed = placeChartTip(box(500, 100, 24, 24), box(0, 0, 200, 120), viewport);
    expect(placed).toEqual({ placement: 'above', left: 12, top: 372, arrow: 94 });
  });

  it('hides an anchor that is off the viewport and caps the tip width', () => {
    expect(chartAnchorVisible(box(700, 0, 24, 24), viewport)).toBe(false);
    expect(chartTipWidth(800)).toBe(448);
    expect(chartTipWidth(100)).toBe(76);
  });
});

describe('nameTipFrame', () => {
  it('opens beside a label when the row has room', () => {
    const anchor = box(40, 20, 180, 30);
    const frame = nameTipFrame(anchor, viewport, false);
    expect(frame).toEqual({ placement: 'side', width: 448, maxHeight: 576 });
    const placed = placeNameTip(frame, anchor, box(40, 20, 80, 20), box(0, 0, 448, 100), viewport);
    expect(placed).toEqual({ top: 40, left: 210, arrow: 16 });
  });

  it('stays off the side of a button and flips above a low row', () => {
    const wide = nameTipFrame(box(40, 20, 180, 30), viewport, true);
    expect(wide.placement).toBe('below');
    expect(wide.width).toBeNull();
    expect(wide.maxHeight).toBe(384);

    const anchor = box(520, 30, 570, 30);
    const frame = nameTipFrame(anchor, viewport, false);
    expect(frame).toEqual({ placement: 'above', width: null, maxHeight: 384 });
    const placed = placeNameTip(frame, anchor, box(520, 40, 80, 20), box(0, 0, 300, 100), viewport);
    expect(placed).toEqual({ top: 410, left: 30, arrow: 38 });
  });
});
