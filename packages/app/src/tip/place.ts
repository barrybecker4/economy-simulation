const MARGIN = 12;
const CHART_GAP = 8;
const NAME_GAP = 10;
const TIP_MAX_WIDTH = 448;
const SIDE_ROOM = 300;
const ABOVE_LIMIT = 180;
const NAME_MAX_HEIGHT = 384;
const SIDE_MIN_HEIGHT = 160;
const VERTICAL_MIN_HEIGHT = 120;
const SIDE_MIN_WIDTH = 280;
const ARROW_INSET = 22;
const ARROW_MIN = 16;

export interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type TipSide = 'below' | 'above' | 'side';

export interface ChartTipPosition {
  placement: 'below' | 'above';
  top: number;
  left: number;
  arrow: number;
}

export interface NameTipFrame {
  placement: TipSide;
  width: number | null;
  maxHeight: number;
}

export interface NameTipPosition {
  top: number;
  left: number;
  arrow: number;
}

export function chartTipWidth(viewportWidth: number): number {
  return Math.min(TIP_MAX_WIDTH, viewportWidth - MARGIN * 2);
}

export function chartAnchorVisible(anchor: Box, viewport: Viewport): boolean {
  return anchor.bottom >= MARGIN && anchor.top <= viewport.height - MARGIN;
}

export function placeChartTip(anchor: Box, tip: Box, viewport: Viewport): ChartTipPosition {
  const above = spaceBefore(anchor.top, CHART_GAP);
  const below = spaceAfter(viewport.height, anchor.bottom, CHART_GAP);
  const placement = chartPlacement(above, below, tip.height);
  const left = centeredLeft(anchor, tip, viewport);
  const rawTop =
    placement === 'above' ? anchor.top - CHART_GAP - tip.height : anchor.bottom + CHART_GAP;
  const maxTop = Math.max(MARGIN, viewport.height - MARGIN - tip.height);
  return {
    placement,
    left,
    top: clamp(rawTop, MARGIN, maxTop),
    arrow: arrowOffset(anchor.left + anchor.width / 2, left, tip.width),
  };
}

export function nameTipFrame(anchor: Box, viewport: Viewport, buttonHost: boolean): NameTipFrame {
  const spaceRight = viewport.width - anchor.right - MARGIN;
  const spaceBelow = spaceAfter(viewport.height, anchor.bottom, NAME_GAP);
  const spaceAbove = spaceBefore(anchor.top, NAME_GAP);
  const placement = namePlacement(buttonHost, spaceRight, spaceBelow, spaceAbove);
  return {
    placement,
    width: nameWidth(placement, spaceRight),
    maxHeight: nameMaxHeight(placement, viewport, spaceAbove, spaceBelow),
  };
}

export function placeNameTip(
  frame: NameTipFrame,
  anchor: Box,
  name: Box,
  tip: Box,
  viewport: Viewport,
): NameTipPosition {
  if (frame.placement === 'side') {
    return placeBeside(anchor, name, tip, viewport);
  }
  return placeVertical(frame.placement, anchor, name, tip, viewport);
}

function chartPlacement(
  spaceAbove: number,
  spaceBelow: number,
  tipHeight: number,
): 'above' | 'below' {
  if (spaceAbove >= tipHeight || spaceAbove > spaceBelow) {
    return 'above';
  }
  return 'below';
}

function centeredLeft(anchor: Box, tip: Box, viewport: Viewport): number {
  const ideal = anchor.left + anchor.width / 2 - tip.width / 2;
  const maxLeft = viewport.width - MARGIN - tip.width;
  return clamp(ideal, MARGIN, Math.max(MARGIN, maxLeft));
}

function namePlacement(
  buttonHost: boolean,
  spaceRight: number,
  spaceBelow: number,
  spaceAbove: number,
): TipSide {
  if (!buttonHost && spaceRight >= SIDE_ROOM) {
    return 'side';
  }
  if (spaceBelow < ABOVE_LIMIT && spaceAbove > spaceBelow) {
    return 'above';
  }
  return 'below';
}

function nameWidth(placement: TipSide, spaceRight: number): number | null {
  if (placement !== 'side') {
    return null;
  }
  return Math.min(TIP_MAX_WIDTH, Math.max(SIDE_MIN_WIDTH, spaceRight - NAME_GAP));
}

function nameMaxHeight(
  placement: TipSide,
  viewport: Viewport,
  spaceAbove: number,
  spaceBelow: number,
): number {
  if (placement === 'side') {
    return Math.max(SIDE_MIN_HEIGHT, viewport.height - MARGIN * 2);
  }
  const room = placement === 'above' ? spaceAbove : Math.max(spaceBelow, VERTICAL_MIN_HEIGHT);
  return Math.max(VERTICAL_MIN_HEIGHT, Math.min(room, NAME_MAX_HEIGHT));
}

function placeBeside(anchor: Box, name: Box, tip: Box, viewport: Viewport): NameTipPosition {
  const top = Math.min(Math.max(MARGIN, anchor.top), viewport.height - MARGIN - tip.height);
  return {
    top,
    left: anchor.right + NAME_GAP,
    arrow: arrowOffset(name.top + name.height / 2, top, tip.height),
  };
}

function placeVertical(
  placement: 'below' | 'above',
  anchor: Box,
  name: Box,
  tip: Box,
  viewport: Viewport,
): NameTipPosition {
  const maxLeft = viewport.width - MARGIN - tip.width;
  const left = clamp(anchor.left, MARGIN, Math.max(MARGIN, maxLeft));
  const top =
    placement === 'above'
      ? Math.max(MARGIN, anchor.top - NAME_GAP - tip.height)
      : anchor.bottom + NAME_GAP;
  return {
    top,
    left,
    arrow: Math.min(
      tip.width - ARROW_INSET,
      Math.max(ARROW_MIN, name.left - left + Math.min(name.width, 28)),
    ),
  };
}

function arrowOffset(center: number, origin: number, limit: number): number {
  return Math.min(limit - ARROW_INSET, Math.max(ARROW_MIN, center - origin - 6));
}

function spaceBefore(edge: number, gap: number): number {
  return edge - gap - MARGIN;
}

function spaceAfter(limit: number, edge: number, gap: number): number {
  return limit - edge - gap - MARGIN;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high);
}
