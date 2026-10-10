import { describe, expect, it } from 'vitest';
import {
  applyCategory,
  applyWorld,
  categoryForGroup,
  matchingCategories,
  matchingWorld,
  PRESET_CATEGORIES,
  SCENARIO_WORLDS,
} from './presets.js';
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
    expect(match.aiBullishness).toBe('modest');
    expect(matchingWorld('fiat', {})).toBeNull();
  });

  it('applies one category and leaves the others matched', () => {
    const next = applyCategory('aiBullishness', 'high', 'fiat', {});
    expect(next.regime).toBe('fiat');
    expect(next.overrides['ai.adoptionMidpointYear']).toBe(3);
    expect(next.overrides['ai.bullishness']).toBe(1.5);
    const match = matchingCategories(next.overrides);
    expect(match.aiBullishness).toBe('high');
    expect(match.credit).toBe('moderate');
  });

  it('applies a world and returns Custom after one category changes', () => {
    const next = applyWorld('monetized-dividend', {});
    expect(next.regime).toBe('fiat');
    expect(matchingWorld(next.regime, next.overrides)).toBe('monetized-dividend');
    const match = matchingCategories(next.overrides);
    expect(match.centralBank).toBe('monetizing');
    expect(match.publicFinance).toBe('ai-dividend');
    expect(match.aiBullishness).toBe('extreme');
    const changed = applyCategory('aiBullishness', 'high', next.regime, next.overrides);
    expect(matchingWorld(changed.regime, changed.overrides)).toBeNull();
  });

  it('applies a bitcoin world without writing regime.type into overrides', () => {
    const next = applyWorld('bitcoin-dividend', {});
    expect(next.regime).toBe('bitcoin');
    expect(next.overrides['regime.type']).toBeUndefined();
    expect(matchingWorld(next.regime, next.overrides)).toBe('bitcoin-dividend');
  });

  it('lists every scenario world', () => {
    expect(SCENARIO_WORLDS).toHaveLength(6);
  });

  it('finds the category hosted by a panel group', () => {
    for (const category of PRESET_CATEGORIES) {
      expect(categoryForGroup(category.group)?.id).toBe(category.id);
    }
    expect(categoryForGroup('regime')).toBeUndefined();
    expect(categoryForGroup('scale')).toBeUndefined();
  });

  it('reads Custom when an owned slider leaves every option', () => {
    const match = matchingCategories({ 'ai.bullishness': 0.5 });
    expect(match.aiBullishness).toBeNull();
    expect(match.credit).toBe('moderate');
  });
});
