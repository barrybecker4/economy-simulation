import type { Slider, SliderGroup, SliderStatus } from '../../../core/src/config/registry.js';

export const GROUP_ORDER: readonly SliderGroup[] = [
  'regime',
  'centralBank',
  'publicFinance',
  'credit',
  'ai',
  'aiClaims',
  'shocks',
  'background',
  'behavior',
  'goods',
  'scale',
];

const GROUPS: Record<SliderGroup, string> = {
  regime: 'Monetary regime',
  centralBank: 'Central bank',
  publicFinance: 'Public finance',
  credit: 'Credit and contracts',
  ai: 'AI bullishness',
  aiClaims: 'AI claims',
  shocks: 'Shocks',
  background: 'Background',
  behavior: 'Households and firms',
  goods: 'Relative prices',
  scale: 'Scale',
};

const STATUSES: Record<SliderStatus, string> = {
  sourced: 'Sourced',
  calibrated: 'Calibrated',
  guess: 'Guess',
};

export function groupLabel(group: SliderGroup): string {
  return GROUPS[group];
}

export function statusLabel(status: SliderStatus): string {
  return STATUSES[status];
}

export const BLOCKED_SHARE = 'ai.physicalTaskShare';

/** The control shows one minus the stored block for the reachable share. */
export function controlRange(slider: Slider): { min: number; max: number } | null {
  if (slider.kind !== 'number') {
    return null;
  }
  if (slider.id === BLOCKED_SHARE) {
    return { min: roundShare(1 - slider.max), max: roundShare(1 - slider.min) };
  }
  return { min: slider.min, max: slider.max };
}

export function presentStored(slider: Slider, stored: number | string): number | string {
  if (slider.id === BLOCKED_SHARE && typeof stored === 'number') {
    return roundShare(1 - stored);
  }
  return stored;
}

export function storePresented(slider: Slider, raw: string): string {
  if (slider.id !== BLOCKED_SHARE) {
    return raw;
  }
  const displayed = Number(raw);
  if (!Number.isFinite(displayed)) {
    return raw;
  }
  return String(roundShare(1 - displayed));
}

function roundShare(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function sliderBounds(slider: Slider): string {
  const range = controlRange(slider);
  if (range !== null) {
    return `${range.min} to ${range.max}`;
  }
  if (slider.kind === 'enum') {
    return slider.options.join(', ');
  }
  return '';
}

export function groupRank(group: SliderGroup): number {
  const index = GROUP_ORDER.indexOf(group);
  if (index < 0) {
    throw new Error(`Unknown slider group ${group}`);
  }
  return index;
}
