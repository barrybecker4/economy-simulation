import { describe, expect, it } from 'vitest';
import {
  ARM_TIMEOUT,
  logArm,
  monetaryPreset,
  summarizeArm,
} from './test-helpers/deposit-rate-calibration.js';

describe('deposit rate calibration sensitivity (issue #15)', () => {
  it(
    'M fiat sensitivity at pass-through 0.3 sits below the 0.45 preset',
    { timeout: ARM_TIMEOUT },
    () => {
      const summary = summarizeArm({
        ...monetaryPreset,
        'regime.type': 'fiat',
        'bank.fiatDepositPassThrough': 0.3,
      });
      logArm('M fiat pass-through 0.3', summary);
      expect(summary.mean).toBeLessThanOrEqual(0.3);
    },
  );

  it(
    'M fiat sensitivity at pass-through 0.6 sits above the 0.45 preset',
    { timeout: ARM_TIMEOUT },
    () => {
      const summary = summarizeArm({
        ...monetaryPreset,
        'regime.type': 'fiat',
        'bank.fiatDepositPassThrough': 0.6,
      });
      logArm('M fiat pass-through 0.6', summary);
      expect(summary.mean).toBeGreaterThan(0.45);
      expect(summary.mean).toBeLessThanOrEqual(0.6);
    },
  );
});
