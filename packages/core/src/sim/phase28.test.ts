import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { Ledger } from '../ledger/ledger.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { bankBalanceIdentity, postBalancedStockLines } from './stocks.js';
import { simulate } from './simulate.js';
import { totalDeposits, totalLoans } from './banking.js';

const small = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('phase 28 conservation', () => {
  it('drops a one-line satoshi dust journal instead of throwing', () => {
    const ledger = new Ledger('satoshi');
    ledger.open('bank-equity', 'equity');
    ledger.open('private-equity', 'equity');
    expect(() =>
      postBalancedStockLines(ledger, [
        { accountId: 'bank-equity', side: 'debit', amount: 2.27e-13 },
      ]),
    ).not.toThrow();
    expect(Number(ledger.balance('bank-equity'))).toBe(0);
  });

  it('drops bitcoin stock lines inside the audit absolute epsilon', () => {
    const ledger = new Ledger('satoshi');
    ledger.open('vault', 'asset');
    ledger.open('bank-equity', 'equity');
    postBalancedStockLines(ledger, [
      { accountId: 'vault', side: 'debit', amount: 5e-10 },
      { accountId: 'bank-equity', side: 'credit', amount: 5e-10 },
    ]);
    expect(Number(ledger.balance('vault'))).toBe(0);
    expect(Number(ledger.balance('bank-equity'))).toBe(0);
  });

  it('opens banks so loans plus reserves plus bonds plus vault equal deposits plus equity', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase28-open',
          seed: 1,
          ticks: 1,
          sliders: { ...small },
        }),
      ),
      1,
      null,
    );
    expect(bankBalanceIdentity(economy)).toBeCloseTo(0, 6);
    const deposits = totalDeposits(economy);
    const loans = totalLoans(economy);
    const reserves = economy.banks.reduce((sum, bank) => sum + bank.reserves, 0);
    expect(reserves).toBeCloseTo(deposits - loans, 6);
  });

  it('keeps deposits when a household buys a home for cash', () => {
    const result = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.tenureChoice': 'on',
      'transition.lengthMonths': 0,
      ticks: 6,
    });
    expect(result.audit.ok).toBe(true);
    expect(series(result, 'auditOk').every((value) => value === 1)).toBe(true);
    const first = series(result, 'moneySupply')[0] ?? 0;
    const second = series(result, 'moneySupply')[1] ?? 0;
    expect(second / Math.max(first, 1)).toBeGreaterThan(0.9);
  });

  it('finishes a bitcoin tenure run that used to die on satoshi dust', () => {
    const result = run({
      ...small,
      'regime.type': 'bitcoin',
      'housing.tenureChoice': 'on',
      'transition.lengthMonths': 0,
      'government.stabilizer': 1,
      'centralBank.outputWeight': 1.2,
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);
    expect(series(result, 'auditOk').every((value) => value === 1)).toBe(true);
  });

  it('does not add more inventory than measured output when demand weight is 0', () => {
    const result = run({ ...small, 'production.demandWeight': 0, ticks: 12 });
    const output = series(result, 'realGdp');
    const households = 60;
    const bought = series(result, 'meanRealConsumption').map((mean) => mean * households);
    for (let index = 1; index < output.length; index += 1) {
      const monthOutput = output[index] ?? 0;
      const monthBought = bought[index] ?? 0;
      expect(monthBought).toBeLessThanOrEqual(monthOutput * 1.5 + 1);
    }
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase28', seed: 11, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
