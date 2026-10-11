import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { moneyBalances, centIdentityGap } from './banking.js';
import { bitcoinDepositUnits, bitcoinLoanUnits } from './dual-currency.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { bankBalanceIdentity } from './stocks.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
  'ai.ownerShareCeiling': 0,
};

describe('hybrid currency flows', () => {
  it('pays a bitcoin-denominated wage without breaking the books', () => {
    const economy = opened({
      'regime.type': 'hybrid',
      'money.choiceSpeed': 0,
      'money.bitcoinTrust': 2,
      'money.fiatLegalTender': 0,
    });
    for (const household of economy.households) {
      household.payCurrency = 'bitcoin';
    }
    for (const firm of economy.firms) {
      firm.payCurrency = 'bitcoin';
    }
    const before = bitcoinDepositUnits(economy);
    const result = run({
      ...small,
      'regime.type': 'hybrid',
      'money.choiceSpeed': 0.3,
      'money.bitcoinTrust': 2,
      'money.fiatLegalTender': 0,
      ticks: 6,
    });
    expect(result.audit.ok).toBe(true);
    expect(before).toBeGreaterThan(0);
  });

  it('can open a bitcoin firm loan and keep the identity', () => {
    const economy = opened({ 'regime.type': 'hybrid', 'money.bitcoinTrust': 2 });
    const firm = economy.firms[0];
    if (!firm) {
      throw new Error('missing firm');
    }
    firm.payCurrency = 'bitcoin';
    // Force a bitcoin loan stock and matching deposit through the residual path.
    const price = economy.bitcoinPrice;
    const units = 0.001;
    firm.bitcoinLoan = units;
    firm.bitcoin += units;
    economy.bitcoinLoanCarried += units * price;
    economy.bitcoinCarried += units * price;
    economy.bitcoinReserves = (bitcoinDepositUnits(economy) - bitcoinLoanUnits(economy)) * price;
    expect(Math.abs(bankBalanceIdentity(economy))).toBeLessThan(1e-4);
    expect(centIdentityGap(economy) <= 1n && centIdentityGap(economy) >= -1n).toBe(true);
  });

  it('grows fiat deposits under hybrid without minting coins', () => {
    const opening = opened({
      'regime.type': 'hybrid',
      'centralBank.moneyGrowth': 1,
      'centralBank.stimulus': 0,
    });
    const unitsOpen = bitcoinDepositUnits(opening);
    const fiatOpen = moneyBalances(opening).fiat;
    const result = run({
      ...small,
      'regime.type': 'hybrid',
      'centralBank.moneyGrowth': 1,
      'centralBank.stimulus': 0,
      ticks: 24,
    });
    expect(result.audit.ok).toBe(true);
    expect(fiatOpen).toBeGreaterThan(0);
    expect(unitsOpen).toBeGreaterThan(0);
  });
});

function opened(sliders: Record<string, number | string>) {
  const config = loadScenario({
    name: 'hybrid-flows',
    seed: 4,
    ticks: 1,
    sliders: { ...small, ...sliders },
  });
  return createEconomy(loadParameters(config), config.seed, null);
}

function run(input: Record<string, number | string> & { ticks?: number }) {
  const { ticks = 36, ...sliders } = input;
  return simulate(loadScenario({ name: 'hybrid-flows-run', seed: 4, ticks, sliders }));
}
