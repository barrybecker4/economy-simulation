import { describe, expect, it } from 'vitest';
import { ARM_TIMEOUT, logArm, summarizeArm, type SeedSummary } from './test-helpers/deposit-rate-calibration.js';

describe('deposit rate calibration S0 (issue #15)', () => {
  it('S0 fiat paid/policy mean and range over 10 seeds', { timeout: ARM_TIMEOUT }, () => {
    expectFiatBand('S0 fiat', summarizeArm({ 'regime.type': 'fiat' }));
  });

  it('S0 bitcoin paid/policy mean and range over 10 seeds', { timeout: ARM_TIMEOUT }, () => {
    const summary = summarizeArm({ 'regime.type': 'bitcoin' });
    logArm('S0 bitcoin', summary);
    expect(summary.median).toBeGreaterThanOrEqual(0.3);
  });
});

function expectFiatBand(label: string, summary: SeedSummary): void {
  logArm(label, summary);
  expect(summary.median).toBeGreaterThanOrEqual(0.3);
  expect(summary.median).toBeLessThanOrEqual(0.6);
}
