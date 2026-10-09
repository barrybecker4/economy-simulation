import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { onContractChoice } from './contracts.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const monetary = {
  ...FEATURE_OFF,
  'scale.households': 80,
  'scale.firms': 8,
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

describe('phase 57 inflation and inside money', () => {
  it('keeps mortgage interest out of the principal', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase57-note',
          seed: 1,
          ticks: 1,
          sliders: { ...monetary, 'regime.type': 'bitcoin', 'housing.adjustmentRate': 0 },
        }),
      ),
      1,
      null,
    );
    for (const household of economy.households) {
      household.mortgage = 0;
      household.mortgagePayment = 0;
      household.tenure = 'rent';
    }
    const borrower = economy.households[0];
    const bank = economy.banks[0];
    if (!borrower || !bank) {
      throw new Error('Missing borrower');
    }
    borrower.tenure = 'mortgage';
    borrower.mortgage = 12_000;
    borrower.mortgagePayment = 100;
    borrower.deposit = 5_000;
    economy.policyRate = 0.06;
    const equity = bank.equity;
    onContractChoice(economy);
    const interest = Math.min(100, Math.round((12_000 * 0.08) / 12));
    expect(borrower.mortgage).toBe(12_000 - (100 - interest));
    expect(borrower.mortgage).toBeGreaterThan(12_000 - 100);
    expect(bank.equity).toBe(equity + interest);
  });

  it('keeps calm fiat near the inflation target and bitcoin near productivity', () => {
    const fiat = run({ ...monetary, 'regime.type': 'fiat', ticks: 120 });
    const bitcoin = run({ ...monetary, 'regime.type': 'bitcoin', ticks: 120 });
    const demandLed = run({
      ...monetary,
      'regime.type': 'fiat',
      'housing.tenureChoice': 'off',
      'credit.endogenousWeight': 0,
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      ticks: 120,
    });
    expect(fiat.audit.ok && bitcoin.audit.ok && demandLed.audit.ok).toBe(true);
    // Trend weight 0 lets excess demand set prices. The last year prints about 4 percent,
    // above the 2 percent target. Dividing the index by output had been hiding that.
    expect(tail(fiat, 'inflation')).toBeGreaterThan(0.02);
    expect(tail(fiat, 'inflation')).toBeLessThan(0.05);
    // Booking the coupon as interest stops the loan stock from being repaid as if it were all principal.
    // The remaining deflation is the sticky-wage response to that opening price move, not a vanishing money stock.
    expect(
      end(bitcoin, 'moneySupply') / Math.max(series(bitcoin, 'moneySupply')[0] ?? 1, 1),
    ).toBeGreaterThan(0.5);
    expect(tail(bitcoin, 'inflation')).toBeGreaterThan(-0.11);
    expect(end(bitcoin, 'unemployment')).toBeLessThan(0.22);
    expect(tail(demandLed, 'inflation')).toBeLessThan(0.04);
  });

  it('moves the price level when the injection channel changes', () => {
    const channels = [
      'proRataDeposits',
      'governmentSpending',
      'newLoans',
      'assetPurchase',
    ] as const;
    const prices = channels.map((channel) =>
      end(
        run({
          ...monetary,
          'regime.type': 'fiat',
          'centralBank.injectionChannel': channel,
          ticks: 80,
        }),
        'priceLevel',
      ),
    );
    expect(new Set(prices.map((price) => price.toFixed(4))).size).toBeGreaterThan(1);
  });
});

function tail(result: SimulationResult, id: MetricId): number {
  const values = series(result, id).slice(-12);
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function end(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase57', seed: 4, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
