import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { adjustBankEquity } from './capital-identity.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';

describe('capital identity', () => {
  it('raises bank equity and lowers private equity by the same amount', () => {
    const economy = economyWith();
    const bank = requireBank(economy);
    const equity = bank.equity;
    const residual = economy.privateEquity;
    adjustBankEquity(bank, economy, 500);
    expect(bank.equity).toBe(equity + 500);
    expect(economy.privateEquity).toBe(residual - 500);
    expect(bank.equity + economy.privateEquity).toBe(equity + residual);
  });

  it('books a loss as negative adjust without touching vault', () => {
    const economy = economyWith();
    const bank = requireBank(economy);
    const vault = bank.vault;
    const sum = bank.equity + economy.privateEquity;
    adjustBankEquity(bank, economy, -200);
    expect(bank.vault).toBe(vault);
    expect(bank.equity + economy.privateEquity).toBe(sum);
  });

  it('still moves private equity when the bank is missing', () => {
    const economy = economyWith();
    const residual = economy.privateEquity;
    adjustBankEquity(undefined, economy, -75);
    expect(economy.privateEquity).toBe(residual + 75);
  });
});

function economyWith() {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'capital-identity',
        seed: 1,
        ticks: 1,
        sliders: {
          'scale.households': 20,
          'scale.firms': 4,
          'scale.banks': 1,
          'shock.frequency': 0,
        },
      }),
    ),
    1,
    null,
  );
}

function requireBank(economy: ReturnType<typeof economyWith>) {
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Missing bank');
  }
  return bank;
}
