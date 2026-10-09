import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { totalDeposits } from './banking.js';
import { createEconomy } from './init.js';
import { monthlyMortgagePayment } from './contracts.js';
import { drawMortgage, payCashForHome } from './money.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const monetary = {
  ...FEATURE_OFF,
  'scale.households': 40,
  'scale.firms': 4,
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
  'household.openingDepositMonths': 12,
};

describe('phase 55 mortgage settlement', () => {
  it('pays the seller the home price and leaves the buyer with only the down payment', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'phase55-settle',
          seed: 1,
          ticks: 1,
          sliders: { ...monetary, 'regime.type': 'fiat' },
        }),
      ),
      1,
      null,
    );
    const buyer = economy.households[0];
    if (!buyer) {
      throw new Error('Missing household');
    }
    const price = 10_000;
    const down = 2_000;
    const principal = 8_000;
    const buyerBefore = buyer.deposit;
    const firmsBefore = economy.firms.reduce((sum, firm) => sum + firm.deposit, 0);
    const totalBefore = totalDeposits(economy);
    payCashForHome(buyer, economy, down);
    drawMortgage(buyer, economy, principal);
    expect(buyer.deposit).toBe(buyerBefore - down);
    expect(economy.firms.reduce((sum, firm) => sum + firm.deposit, 0)).toBe(
      firmsBefore + down + principal,
    );
    expect(totalDeposits(economy)).toBe(totalBefore + principal);
    expect(buyer.mortgage).toBe(principal);
    expect(price).toBe(down + principal);
  });

  it('spreads originations and keeps the renter share near the opening mix', () => {
    const result = run({ ...monetary, 'regime.type': 'fiat', ticks: 120 });
    expect(result.audit.ok).toBe(true);
    const originations = series(result, 'mortgageOriginations');
    const opening = originations.slice(0, 2).reduce((sum, value) => sum + value, 0);
    const total = originations.reduce((sum, value) => sum + value, 0);
    const later = originations.slice(60).reduce((sum, value) => sum + value, 0);
    expect(later).toBeGreaterThan(0);
    expect(opening).toBeLessThan(total * 0.5);
    const rent = series(result, 'rentShare');
    expect(Math.abs((rent.at(-1) ?? 0) - (rent[0] ?? 0))).toBeLessThan(0.1);
  });

  it('raises the mortgage burden when expected deflation is higher', () => {
    const calm = monthlyMortgagePayment(1_000, 0.08, 30);
    const deflating = monthlyMortgagePayment(1_000, 0.08 + 0.05, 30);
    expect(deflating).toBeGreaterThan(calm);
  });

  it('does not foreclose several times more under bitcoin unless debt service is higher', () => {
    const fiat = run({ ...monetary, 'regime.type': 'fiat', ticks: 80 });
    const bitcoin = run({ ...monetary, 'regime.type': 'bitcoin', ticks: 80 });
    expect(fiat.audit.ok && bitcoin.audit.ok).toBe(true);
    const fiatLosses = sum(fiat, 'mortgageToRent');
    const bitcoinLosses = sum(bitcoin, 'mortgageToRent');
    if (bitcoinLosses > 4 * Math.max(1, fiatLosses)) {
      expect(mean(series(bitcoin, 'medianDebtService'))).toBeGreaterThan(
        mean(series(fiat, 'medianDebtService')),
      );
    }
  });
});

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase55', seed: 4, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function sum(result: SimulationResult, id: MetricId): number {
  return series(result, id).reduce((total, value) => total + value, 0);
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
}
