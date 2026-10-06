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

export function sliderBounds(slider: Slider): string {
  if (slider.kind === 'number') {
    return `${slider.min} to ${slider.max}`;
  }
  return slider.options.join(', ');
}

export function groupRank(group: SliderGroup): number {
  const index = GROUP_ORDER.indexOf(group);
  if (index < 0) {
    throw new Error(`Unknown slider group ${group}`);
  }
  return index;
}
