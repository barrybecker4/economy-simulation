import { PLACEHOLDER_SOURCE } from './limits.js';

export type SliderGroup =
  | 'regime'
  | 'centralBank'
  | 'publicFinance'
  | 'credit'
  | 'aiBullishness'
  | 'aiAdoption'
  | 'aiReach'
  | 'aiClaims'
  | 'shocks'
  | 'background'
  | 'behavior'
  | 'goods'
  | 'scale'
  | 'welfare';

export type SliderStatus = 'sourced' | 'calibrated' | 'guess';

interface SliderBase {
  id: string;
  label: string;
  group: SliderGroup;
  unit: string;
  description: string;
  source: string;
  status: SliderStatus;
}

export interface NumberSlider extends SliderBase {
  kind: 'number';
  default: number;
  min: number;
  max: number;
}

export interface EnumSlider extends SliderBase {
  kind: 'enum';
  default: string;
  options: readonly string[];
}

export type Slider = NumberSlider | EnumSlider;

export function numberSlider(
  id: string,
  label: string,
  group: SliderGroup,
  unit: string,
  defaultValue: number,
  min: number,
  max: number,
  description: string,
): NumberSlider {
  return {
    id,
    label,
    group,
    unit,
    kind: 'number',
    default: defaultValue,
    min,
    max,
    description,
    source: PLACEHOLDER_SOURCE,
    status: 'guess',
  };
}

export function basketProductivity(
  id: string,
  label: string,
  share: string,
  defaultValue: number,
  note: string,
): NumberSlider {
  return numberSlider(
    id,
    `${label} productivity`,
    'goods',
    '1/year',
    defaultValue,
    0,
    0.3,
    `Annual productivity growth of ${label.toLowerCase()}, used only to split the CPI. After t years the unscaled price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. This category is ${share} of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation, electronics given a small share, and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes this category cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI. ${note}`,
  );
}

export function enumSlider(
  id: string,
  label: string,
  group: SliderGroup,
  unit: string,
  defaultValue: string,
  options: readonly string[],
  description: string,
): EnumSlider {
  return {
    id,
    label,
    group,
    unit,
    kind: 'enum',
    default: defaultValue,
    options,
    description,
    source: PLACEHOLDER_SOURCE,
    status: 'guess',
  };
}
