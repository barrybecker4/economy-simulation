import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { Ledger } from '../ledger/ledger.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { creditFirms } from './money.js';
import { ensureOpen, postStocks, roundedStockTargets } from './stocks.js';

const monetary = {
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
  'bank.capitalRatio': 0.04,
  'household.openingDepositMonths': 12,
};

describe('phase 35 integer-safe stock journal', () => {
  it('sets private equity as the residual after rounding vault and bank equity', () => {
    const targets = roundedStockTargets(
      'cent',
      378_954.5,
      100,
      50,
      0,
      37_664,
      -63_012.5,
      100_676.5,
    );
    expect(targets.get('vault')).toBe(37_664);
    expect(targets.get('bank-equity')).toBe(-63_012);
    expect(targets.get('private-equity')).toBe(100_676);
    expect((targets.get('vault') ?? 0) - (targets.get('bank-equity') ?? 0)).toBe(
      targets.get('private-equity'),
    );
  });

  it('posts a half-cent vault residual without throwing', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase35-half-cent',
          seed: 5,
          ticks: 1,
          sliders: { ...monetary, 'regime.type': 'fiat' },
        }),
      ),
      5,
      null,
    );
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('Missing bank');
    }
    bank.equity = -63_012.5;
    bank.vault = 37_664;
    economy.privateEquity = bank.vault - bank.equity;
    const household = economy.households[0];
    if (!household) {
      throw new Error('Missing household');
    }
    const deposits = economy.households.reduce((sum, row) => sum + row.deposit, 0);
    const loans =
      economy.firms.reduce((sum, firm) => sum + firm.loan, 0) +
      economy.households.reduce((sum, row) => sum + row.mortgage + row.consumerLoan, 0);
    const needed = loans + bank.reserves + bank.bonds + bank.vault - bank.equity;
    household.deposit += needed - deposits - economy.govDeposits;
    const ledger = new Ledger('cent');
    ensureOpen(economy, ledger);
    expect(() => postStocks(economy, ledger)).not.toThrow();
    expect(ledger.audit().ok).toBe(true);
  });

  it('splits firm credits into integer cents', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase35-firms',
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
    for (const firm of economy.firms) {
      firm.deposit = 0;
    }
    creditFirms(economy, 100);
    const deposits = economy.firms.map((firm) => firm.deposit);
    expect(deposits.every((value) => Number.isInteger(value))).toBe(true);
    expect(deposits.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('finishes a monetary fiat run that used to die on half-cent rounding', () => {
    const result = run({ ...monetary, 'regime.type': 'fiat', ticks: 240 }, 5);
    expect(result.audit.ok).toBe(true);
    expect(series(result, 'auditOk').every((value) => value === 1)).toBe(true);
  });
});

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  seed = 5,
): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase35', seed, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
