import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { SimulationResult } from '../engine/engine.js';
import { Ledger } from '../ledger/ledger.js';
import type { MetricId } from '../metrics/metrics.js';
import { bitcoinAmountsMatch } from '../money/amount.js';
import { simulate } from './simulate.js';
import { postBalancedStockLines, roundedStockTargets } from './stocks.js';

const monetaryBitcoin = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
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
  'bank.resolution': 'merge',
  'household.openingDepositMonths': 12,
};

describe('stock journal', () => {
  it('sets satoshi private equity as the vault residual', () => {
    const targets = roundedStockTargets('satoshi', 100, 40, 10, 0, 50, 20, 29.999);
    expect(targets.get('private-equity')).toBe(30);
    expect((targets.get('vault') ?? 0) - (targets.get('bank-equity') ?? 0)).toBe(
      targets.get('private-equity'),
    );
  });

  it('drops a one-line stock posting instead of writing an unbalanced journal', () => {
    const ledger = new Ledger('cent');
    ledger.open('vault', 'asset');
    ledger.open('bank-equity', 'equity');
    expect(() =>
      postBalancedStockLines(ledger, [{ accountId: 'vault', side: 'debit', amount: 1n }]),
    ).not.toThrow();
    expect(ledger.balance('vault')).toBe(0n);
  });

  it('seats a satoshi private-equity residual when paired equity deltas drift', () => {
    const ledger = new Ledger('satoshi');
    ledger.open('bank-equity', 'equity');
    ledger.open('private-equity', 'equity');
    const equityDelta = 0.504214488202706;
    const peDelta = 0.5042144879698753;
    expect(bitcoinAmountsMatch(equityDelta, peDelta)).toBe(false);
    expect(() =>
      postBalancedStockLines(ledger, [
        { accountId: 'bank-equity', side: 'credit', amount: equityDelta },
        { accountId: 'private-equity', side: 'debit', amount: peDelta },
      ]),
    ).not.toThrow();
    expect(
      bitcoinAmountsMatch(
        Number(ledger.balance('bank-equity')),
        -Number(ledger.balance('private-equity')),
      ),
    ).toBe(true);
  });

  it('creates a private-equity seat when that line was dropped as dust', () => {
    const ledger = new Ledger('satoshi');
    ledger.open('deposits', 'asset');
    ledger.open('bank-deposits', 'liability');
    ledger.open('bank-equity', 'equity');
    ledger.open('private-equity', 'equity');
    expect(() =>
      postBalancedStockLines(ledger, [
        { accountId: 'deposits', side: 'debit', amount: 1.0000000005 },
        { accountId: 'bank-deposits', side: 'credit', amount: 1 },
        { accountId: 'bank-equity', side: 'debit', amount: 1 },
      ]),
    ).not.toThrow();
    expect(ledger.audit().ok).toBe(true);
  });

  it('finishes monetary bitcoin seeds that used to die on Debits must equal credits', () => {
    for (const seed of [5, 7, 14, 19]) {
      const result = simulate(
        loadScenario({
          name: 'monetary-bitcoin-crash',
          seed,
          ticks: 120,
          sliders: {
            ...monetaryBitcoin,
            'regime.type': 'bitcoin',
            'household.skillSigma': 1.1,
          },
        }),
      );
      expect(result.audit.ok, `seed ${seed}`).toBe(true);
      expect(series(result, 'auditOk').every((value) => value === 1)).toBe(true);
    }
  });

  it('finishes S3 bitcoin with pass-through at skill sigma 0.5 and 1.1', () => {
    for (const sigma of [0.5, 1.1]) {
      const result = simulate(
        loadScenario({
          name: 's3-bitcoin-pass-through',
          seed: 5,
          ticks: 120,
          sliders: {
            'scale.households': 60,
            'scale.firms': 6,
            'scale.banks': 1,
            'shock.frequency': 0,
            'regime.type': 'bitcoin',
            'prices.trendWeight': 0,
            'production.demandWeight': 1,
            'bank.depositPassThrough': 1,
            'household.skillSigma': sigma,
          },
        }),
      );
      expect(result.audit.ok, `sigma ${sigma}`).toBe(true);
    }
  });

  it('finishes a fiat gradual-transition run that used to die on Debits must equal credits', () => {
    const result = simulate(
      loadScenario({
        name: 'ui-debits',
        seed: 1,
        ticks: 120,
        sliders: {
          'regime.type': 'fiat',
          'money.bitcoinTrust': 0.3,
          'money.cbdcStart': 0.13,
          'money.choiceSpeed': 0.13,
          'money.fiatLegalTender': 1,
          'money.stablecoinStart': 0.14,
          'transition.debtHaircut': 0.035,
          'transition.holderConcentration': 0.5,
          'transition.lengthMonths': 12,
          'prices.trendWeight': 0.8,
          'production.demandWeight': 1,
          'bank.depositPassThrough': 1,
          'household.realReturnSensitivity': 1,
          'expectations.anchorWeight': 0.5,
          'housing.tenureChoice': 'on',
          'credit.endogenousWeight': 1,
          'credit.leverageStart': 1,
          'bank.capitalRatio': 0.04,
          'household.openingDepositMonths': 12,
          'government.bondRate': 0.02,
        },
      }),
    );
    expect(result.audit.ok).toBe(true);
    expect(series(result, 'auditOk').every((value) => value === 1)).toBe(true);
  });
});

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
