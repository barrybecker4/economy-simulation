import { describe, expect, it } from 'vitest';
import { assertSliderValue } from '../../../core/src/config/registry.js';
import { defaultRegime } from './sliders.js';
import { matchingPreset, PRESETS, presetById } from './presets.js';

describe('presets', () => {
  it('keeps every preset inside the slider registry', () => {
    for (const preset of PRESETS) {
      assertSliderValue('regime.type', preset.regime);
      for (const [id, value] of Object.entries(preset.overrides)) {
        assertSliderValue(id, value);
      }
      expect(matchingPreset(preset.regime, preset.overrides)).toBe(preset.id);
    }
  });

  it('treats an empty fiat page as Neutral', () => {
    expect(presetById('neutral').regime).toBe(defaultRegime());
    expect(matchingPreset(defaultRegime(), {})).toBe('neutral');
    expect(matchingPreset('bitcoin', {})).toBeNull();
  });

  it('rejects an unknown preset', () => {
    expect(() => presetById('missing')).toThrow(/Unknown preset missing/);
  });
});
