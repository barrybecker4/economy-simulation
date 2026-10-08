import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import {
  clearLenderOfLastResort,
  markLenderOfLastResort,
  resolveInsolventBanks,
} from './resolution.js';

describe('resolution lender-of-last-resort gate', () => {
  it('skips hybrid insolvency until support is marked', () => {
    const economy = hybridEconomy();
    const bank = requireBank(economy);
    clearLenderOfLastResort(economy);
    bank.equity = -500;
    resolveInsolventBanks(economy);
    expect(bank.failed).toBe(false);
    expect(bank.equity).toBe(-500);
    markLenderOfLastResort(economy);
    resolveInsolventBanks(economy);
    expect(bank.equity).toBeGreaterThanOrEqual(0);
  });
});

function hybridEconomy() {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'resolution-gate',
        seed: 1,
        ticks: 1,
        sliders: {
          'scale.households': 60,
          'scale.firms': 6,
          'scale.banks': 1,
          'shock.frequency': 0,
          'regime.type': 'hybrid',
          'bank.resolution': 'merge',
          'household.openingDepositMonths': 12,
        },
      }),
    ),
    1,
    null,
  );
}

function requireBank(economy: ReturnType<typeof hybridEconomy>) {
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Missing bank');
  }
  return bank;
}
