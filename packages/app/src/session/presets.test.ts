import { describe, expect, it } from 'vitest';
import { applyCategory, matchingCategories, PRESET_CATEGORIES } from './presets.js';
import { assertSliderValue } from '../../../core/src/config/registry.js';

describe('presets', () => {
  it('keeps every category option inside the slider registry', () => {
    for (const category of PRESET_CATEGORIES) {
      for (const option of category.options) {
        for (const [id, value] of Object.entries(option.values)) {
          assertSliderValue(id, value);
        }
      }
    }
  });

  it('matches defaults as the all-default option in each category', () => {
    const match = matchingCategories({});
    expect(match.centralBank).toBe('balanced');
    expect(match.publicFinance).toBe('moderate');
    expect(match.credit).toBe('moderate');
    expect(match.aiBullishness).toBe('substantial');
    expect(match.aiAdoption).toBe('medium');
    expect(match.aiReach).toBe('typical');
  });

  it('applies one category and leaves the others matched', () => {
    const next = applyCategory('aiAdoption', 'fast', 'fiat', {});
    expect(next.regime).toBe('fiat');
    expect(next.overrides['ai.adoptionMidpointYear']).toBe(5);
    const match = matchingCategories(next.overrides);
    expect(match.aiAdoption).toBe('fast');
    expect(match.credit).toBe('moderate');
  });

  it('reads Custom when an owned slider leaves every option', () => {
    const match = matchingCategories({ 'ai.bullishness': 0.5 });
    expect(match.aiBullishness).toBeNull();
    expect(match.aiAdoption).toBe('medium');
  });
});
