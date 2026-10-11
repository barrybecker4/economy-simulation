import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { TickContext } from '../engine/engine.js';
import { Ledger } from '../ledger/ledger.js';
import { MetricsRecorder } from '../metrics/metrics.js';
import { creditBitcoinLoan } from './dual-currency.js';
import { firmEquity, onBookkeeping } from './bookkeeping.js';
import type { Economy } from './economy.js';
import { syncHybridCustody } from './hybrid-money.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { FAILURE_TICKS, MISSED_PAYMENT_TICKS } from './rules.js';
import { simulate } from './simulate.js';
import { bankBalanceIdentity, ensureOpen } from './stocks.js';

describe('hybrid custody write-offs', () => {
  it('keeps the bank identity after writing off a bitcoin firm loan', () => {
    const economy = openedHybrid();
    const firm = economy.firms[0];
    const bank = economy.banks[0];
    if (!firm || !bank) {
      throw new Error('expected firm and bank');
    }
    const ledger = openLedger(economy);
    // Coin loan large enough that wiping capital leaves equity negative.
    const units =
      (firm.deposit + firm.bitcoin * economy.bitcoinPrice + 1_000) / economy.bitcoinPrice;
    creditBitcoinLoan(economy, firm, units);
    syncHybridCustody(economy);
    expect(Math.abs(bankBalanceIdentity(economy))).toBeLessThan(1e-6);

    // Dual insolvency clocks so bookkeeping replaces the firm.
    firm.capital = 0;
    firm.missedPayment = true;
    firm.missTicks = MISSED_PAYMENT_TICKS;
    firm.negTicks = FAILURE_TICKS;
    expect(firmEquity(economy, firm)).toBeLessThan(0);

    const equityBefore = bank.equity;
    const fiatLoan = firm.loan;
    const coinLoanValue = firm.bitcoinLoan * economy.bitcoinPrice;
    expect(coinLoanValue).toBeGreaterThan(0);
    bookkeep(economy, ledger);
    syncHybridCustody(economy);

    expect(firm.bitcoinLoan).toBe(0);
    expect(firm.loan).toBe(0);
    // Fiat defaults still hit equity; coin defaults are absorbed by custody.
    expect(bank.equity).toBeCloseTo(equityBefore - fiatLoan, 6);
    expect(Math.abs(bankBalanceIdentity(economy))).toBeLessThan(1e-6);
  });

  it('finishes a hybrid run when choice speed and bitcoin preference bind', () => {
    const result = simulate(
      loadScenario({
        name: 'hybrid-choice-identity',
        seed: 1,
        ticks: 120,
        sliders: {
          'regime.type': 'hybrid',
          'money.choiceSpeed': 1,
          'money.bitcoinTrust': 1.66,
          'money.fiatLegalTender': 0.46,
          'shock.frequency': 0,
        },
      }),
    );
    expect(result.audit.ok).toBe(true);
  }, 60_000);

  it('keeps bank books closed when trust equals legal tender at choice speed 1', () => {
    const monetary = {
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
      'bank.resolution': 'merge',
      'household.openingDepositMonths': 12,
      'household.skillSigma': 1.1,
      'labor.firmLevelHiring': 'on',
    } as const;
    for (let seed = 1; seed <= 20; seed += 1) {
      const result = simulate(
        loadScenario({
          name: `hybrid-tied-scores-${seed}`,
          seed,
          ticks: 240,
          sliders: {
            ...monetary,
            'scale.households': 500,
            'scale.firms': 50,
            'scale.banks': 3,
            'shock.frequency': 0,
            'regime.type': 'hybrid',
            'money.choiceSpeed': 1,
            'money.bitcoinTrust': 1,
            'money.fiatLegalTender': 1,
          },
        }),
      );
      expect(result.audit.ok, `seed ${seed}`).toBe(true);
    }
  }, 600_000);
});

function openedHybrid(): Economy {
  const config = loadScenario({
    name: 'hybrid-identity-unit',
    seed: 1,
    ticks: 1,
    sliders: {
      'regime.type': 'hybrid',
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
      'shock.frequency': 0,
    },
  });
  return createEconomy(loadParameters(config), config.seed, null);
}

function openLedger(economy: Economy): Ledger {
  const ledger = new Ledger(economy.params.unit);
  ensureOpen(economy, ledger);
  return ledger;
}

function bookkeep(economy: Economy, existing?: Ledger): void {
  const config = loadScenario({
    name: 'hybrid-identity-book',
    seed: 1,
    ticks: 1,
    sliders: { 'regime.type': 'hybrid' },
  });
  const ledger = existing ?? openLedger(economy);
  const ctx: TickContext = {
    tick: economy.tick,
    config,
    rng: economy.shockRng,
    ledger,
    metrics: new MetricsRecorder(),
    audit: null,
  };
  onBookkeeping(economy, ctx);
  expect(ledger.audit().ok).toBe(true);
}
