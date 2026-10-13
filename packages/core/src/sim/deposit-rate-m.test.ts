import { describe, expect, it } from 'vitest';
import {
  ARM_TIMEOUT,
  logArm,
  monetaryPreset,
  summarizeArm,
  type SeedSummary,
} from './deposit-rate-calibration.js';

describe('deposit rate calibration M (issue #15)', () => {
  it('M fiat paid/policy is in 0.3–0.6 (median over 10 seeds)', { timeout: ARM_TIMEOUT }, () => {
    expectBand('M fiat', summarizeArm({ ...monetaryPreset, 'regime.type': 'fiat' }));
  });

  it('M bitcoin paid/policy mean and range over 10 seeds', { timeout: ARM_TIMEOUT }, () => {
    expectBand('M bitcoin', summarizeArm({ ...monetaryPreset, 'regime.type': 'bitcoin' }));
  });
});

function expectBand(label: string, summary: SeedSummary): void {
  logArm(label, summary);
  expect(summary.median).toBeGreaterThanOrEqual(0.3);
  expect(summary.median).toBeLessThanOrEqual(0.6);
}
