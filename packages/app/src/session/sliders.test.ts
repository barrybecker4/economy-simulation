import { describe, expect, it } from 'vitest';
import { getSlider, listSliders } from '../../../core/src/config/registry.js';
import {
  changedSliders,
  parameterSliders,
  resolvedSliders,
  sliderStep,
  sliderValue,
  writeSlider,
} from './sliders.js';

const sliders = listSliders();
const markup = getSlider('firm.markup');
const regime = getSlider('regime.type');

describe('slider values', () => {
  it('lists enums before numbers', () => {
    const kinds = parameterSliders(sliders).map((slider) => slider.kind);
    const firstNumber = kinds.indexOf('number');
    expect(kinds.lastIndexOf('enum')).toBeLessThan(firstNumber);
  });

  it('reads the regime from the page and other values from overrides or defaults', () => {
    expect(sliderValue(regime, 'bitcoin', {})).toBe('bitcoin');
    expect(sliderValue(markup, 'fiat', {})).toBe(markup.default);
    expect(sliderValue(markup, 'fiat', { 'firm.markup': 0.4 })).toBe(0.4);
  });

  it('resolves every slider, including the regime', () => {
    const resolved = resolvedSliders(sliders, 'hybrid', { 'firm.markup': 0.4 });
    expect(resolved['regime.type']).toBe('hybrid');
    expect(resolved['firm.markup']).toBe(0.4);
    expect(Object.keys(resolved)).toHaveLength(sliders.length);
  });

  it('lists values that differ from the registry default', () => {
    const changed = changedSliders(sliders, 'bitcoin', { 'firm.markup': markup.default });
    expect(changed.map((slider) => slider.id)).toEqual(['regime.type']);
  });
});

describe('writeSlider', () => {
  it('stores a number and drops it when the value returns to the default', () => {
    const raised = writeSlider(markup, '0.4', 'fiat', {});
    expect(raised.overrides['firm.markup']).toBe(0.4);
    const restored = writeSlider(markup, String(markup.default), 'fiat', raised.overrides);
    expect(restored.overrides['firm.markup']).toBeUndefined();
  });

  it('keeps the regime out of the override map', () => {
    const next = writeSlider(regime, 'bitcoin', 'fiat', { 'firm.markup': 0.4 });
    expect(next.regime).toBe('bitcoin');
    expect(next.overrides).toEqual({ 'firm.markup': 0.4 });
  });

  it('rejects a non-finite number and an unknown option', () => {
    expect(() => writeSlider(markup, 'nope', 'fiat', {})).toThrow(/finite number/);
    expect(() => writeSlider(regime, 'gold', 'fiat', {})).toThrow(/must be one of/);
  });
});

describe('sliderStep', () => {
  it('divides a numeric range into 100 steps', () => {
    if (markup.kind !== 'number') {
      throw new Error('firm.markup must be numeric');
    }
    expect(sliderStep(markup)).toBe((markup.max - markup.min) / 100);
    expect(() => sliderStep(regime)).toThrow(/no numeric step/);
  });
});
