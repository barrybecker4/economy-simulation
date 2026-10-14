import { describe, expect, it } from 'vitest';
import {
  ARM_TIMEOUT,
  logArm,
  monetaryPreset,
  summarizeArm,
  type SeedSummary,
} from './test-helpers/deposit-rate-calibration.js';

describe('deposit rate calibration M (issue #15)', () => {
  it('M fiat paid/policy is in 0.3–0.6 (median over 10 seeds)', { timeout: ARM_TIMEOUT }, () => {
    expectFiatBand('M fiat', summarizeArm({ ...monetaryPreset, 'regime.type': 'fiat' }));
  });

  it(
    'M bitcoin paid/policy stays on the shared pass-through of 1',
    { timeout: ARM_TIMEOUT },
    () => {
      const summary = summarizeArm({ ...monetaryPreset, 'regime.type': 'bitcoin' });
      logArm('M bitcoin', summary);
      expect(summary.median).toBeGreaterThan(0.6);
    },
  );
});

function expectFiatBand(label: string, summary: SeedSummary): void {
  logArm(label, summary);
  expect(summary.median).toBeGreaterThanOrEqual(0.3);
  expect(summary.median).toBeLessThanOrEqual(0.6);
}
