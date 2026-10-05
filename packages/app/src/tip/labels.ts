import type { Slider, SliderGroup, SliderStatus } from '../../../core/src/config/registry.js';

const GROUPS: Record<SliderGroup, string> = {
  behavior: 'Behavior',
  environment: 'Environment',
  policy: 'Policy',
  regime: 'Monetary regime',
  goods: 'Goods and property',
  contracts: 'Contracts',
  welfare: 'Welfare',
  ai: 'Artificial intelligence',
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
