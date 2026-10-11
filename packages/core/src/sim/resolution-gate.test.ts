import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { equityFor, loansAt } from './banking.js';
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

describe('sole-bank bail-in', () => {
  it('stops once deposits have closed the capital gap', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'bail-in-cap',
          seed: 1,
          ticks: 1,
          sliders: {
            'scale.households': 20,
            'scale.firms': 4,
            'scale.banks': 1,
            'shock.frequency': 0,
            'regime.type': 'fiat',
            'bank.resolution': 'merge',
            'bank.depositHaircut': 0,
            'bank.capitalRatio': 0.08,
          },
        }),
      ),
      1,
      null,
    );
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('missing bank');
    }
    for (const firm of economy.firms) {
      firm.loan = 0;
      firm.deposit = 0;
    }
    for (const agent of economy.agents) {
      agent.deposit = 0;
    }
    economy.govDeposits = 0;
    for (const household of economy.households) {
      household.mortgage = 0;
      household.consumerLoan = 0;
      household.deposit = 0;
    }
    for (const household of economy.households.slice(0, 6)) {
      household.deposit = 10;
    }
    const target = equityFor(economy, loansAt(economy, bank.id));
    bank.equity = target - 9;
    bank.failed = false;
    resolveInsolventBanks(economy);
    const left = economy.households.reduce((sum, household) => sum + household.deposit, 0);
    expect(bank.equity).toBe(target);
    expect(left).toBe(51);
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
