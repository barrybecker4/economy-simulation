import { describe, expect, it } from 'vitest';
import { listSliders } from '../../../core/src/config/registry.js';
import { groupLabel, sliderBounds, statusLabel } from './labels.js';

describe('slider tip labels', () => {
  it('names every group, status, and bound in the registry', () => {
    for (const slider of listSliders()) {
      expect(groupLabel(slider.group).length).toBeGreaterThan(0);
      expect(statusLabel(slider.status).length).toBeGreaterThan(0);
      expect(sliderBounds(slider).length).toBeGreaterThan(0);
    }
  });
});
