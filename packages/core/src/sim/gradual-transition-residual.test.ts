import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { simulate } from './simulate.js';
import { bankBalanceIdentity } from './stocks.js';

/**
 * Regression guard for bank identity residual in M bitcoin gradual transition.
 *
 * Before fix (commit 91fe2d7): external validation showed max per-phase bank
 * identity residual of 20.14 on seed 1 in the M bitcoin gradual transition.
 *
 * Root cause: updateMoneyChoice changes the bitcoin price, then later phases
 * use that new price. During gradual transition, this creates a mismatch between
 * bitcoin-denominated balances (marked at old price) and the current price.
 *
 * Fix: markBitcoinToMarket immediately after updateMoneyChoice in onCentralBank
 * (central-bank.ts) to remark deposits and loans at the new price.
 *
 * Result: max residual now ~1e-9, confirmed by independent validation.
 */
describe('gradual transition bank identity', () => {
  it('keeps M bitcoin gradual transition bank residual below 1e-8', () => {
    // Validity suite scale with gradual transition
    const config = loadScenario({
      name: 'gradual-residual-guard',
      seed: 1,
      ticks: 240,
      sliders: {
        'scale.households': 500,
        'scale.firms': 50,
        'scale.banks': 3,
        'shock.frequency': 0,
        'prices.trendWeight': 0,
        'production.demandWeight': 1,
        'bank.depositPassThrough': 1,
        'expectations.anchorWeight': 0.5,
        'housing.tenureChoice': 'on',
        'credit.endogenousWeight': 1,
        'credit.leverageStart': 1,
        'credit.householdMortgageShare': 0.25,
        'housing.mortgageLtv': 0.95,
        'bank.capitalRatio': 0.04,
        'household.openingDepositMonths': 12,
        'regime.type': 'fiat',
        'transition.lengthMonths': 12,
        'transition.gradualWeight': 1,
        'transition.debtHaircut': 0.5,
        'transition.holderConcentration': 0.5,
        'money.choiceSpeed': 0.13,
        'money.bitcoinTrust': 0.3,
      },
    });

    let maxResidual = 0;

    const result = simulate(config, {
      bookkeeping: (ctx) => {
        const residual = Math.abs(bankBalanceIdentity(ctx.economy));
        if (residual > maxResidual) {
          maxResidual = residual;
        }
      },
    });

    expect(result.audit.ok).toBe(true);
    expect(maxResidual).toBeLessThan(1e-8);
  });
});
