import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import {
  affordableMortgageTermYears,
  monthlyMortgagePayment,
  monthlyOwnedCost,
  onContractChoice,
  tenureFromBurdens,
} from './contracts.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';

describe('mortgage buy-or-wait', () => {
  it('makes a long mortgage lose to rent under eight percent expected deflation', () => {
    const homePrice = 48_000;
    const loan = homePrice * 0.8;
    const down = homePrice * 0.2;
    const loanRate = 0.04;
    const inflation = -0.08;
    const realRate = loanRate - inflation;
    const rent = homePrice * 0.007;
    const mortgage = monthlyMortgagePayment(loan, realRate, 30) + monthlyOwnedCost(down, realRate);
    const owned = monthlyOwnedCost(homePrice, realRate);
    expect(tenureFromBurdens({ rent, mortgage, owned })).toBe('rent');
    expect(
      affordableMortgageTermYears({
        principal: loan,
        loanRate,
        income: 1_000,
        defaultShare: 0.3,
        maxTermYears: 30,
      }),
    ).toBe(30);
  });

  it('still offers a long mortgage under two percent expected inflation', () => {
    const term = affordableMortgageTermYears({
      principal: 38_400,
      loanRate: 0.06,
      income: 1_000,
      defaultShare: 0.3,
      maxTermYears: 30,
    });
    expect(term).toBe(30);
  });

  it('offers no term when even a one-year loan fails the income test', () => {
    const term = affordableMortgageTermYears({
      principal: 38_400,
      loanRate: 0.06,
      income: 100,
      defaultShare: 0.3,
      maxTermYears: 30,
    });
    expect(term).toBe(0);
  });

  it('lets a liquid mortgagor prepay when deflation is expected', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'mortgage-prepay',
          seed: 1,
          ticks: 1,
          sliders: {
            'scale.households': 20,
            'scale.firms': 4,
            'scale.banks': 1,
            'shock.frequency': 0,
            'regime.type': 'bitcoin',
            'housing.tenureChoice': 'on',
            'housing.adjustmentRate': 0,
            'prices.trendWeight': 0,
          },
        }),
      ),
      1,
      null,
    );
    const household = economy.households[0];
    if (!household) {
      throw new Error('missing household');
    }
    household.tenure = 'mortgage';
    household.mortgage = 1_000;
    household.mortgagePayment = 10;
    household.deposit = 5_000;
    household.income = 1_000;
    household.smoothed = 1_000;
    economy.priceHistory.length = 0;
    for (let month = 0; month < 13; month += 1) {
      economy.priceHistory.push(1 * 0.993 ** month);
    }
    economy.priceLevel = economy.priceHistory.at(-1) ?? 1;
    onContractChoice(economy);
    expect(household.mortgage).toBe(0);
    expect(household.tenure).toBe('owned');
  });

  it('leaves an illiquid mortgagor in place under deflation', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'mortgage-illiquid',
          seed: 1,
          ticks: 1,
          sliders: {
            'scale.households': 20,
            'scale.firms': 4,
            'scale.banks': 1,
            'shock.frequency': 0,
            'regime.type': 'bitcoin',
            'housing.tenureChoice': 'on',
            'housing.adjustmentRate': 0,
            'prices.trendWeight': 0,
          },
        }),
      ),
      1,
      null,
    );
    const household = economy.households[0];
    if (!household) {
      throw new Error('missing household');
    }
    household.tenure = 'mortgage';
    household.mortgage = 5_000;
    household.mortgagePayment = 50;
    household.deposit = 10;
    household.income = 1_000;
    household.smoothed = 1_000;
    economy.priceHistory.length = 0;
    for (let month = 0; month < 13; month += 1) {
      economy.priceHistory.push(1 * 0.993 ** month);
    }
    economy.priceLevel = economy.priceHistory.at(-1) ?? 1;
    onContractChoice(economy);
    expect(household.mortgage).toBe(5_000);
    expect(household.tenure).toBe('mortgage');
  });

  it('does not mass-switch fiat tenures in a calm month when the adjustment draw is small', () => {
    const result = simulate(
      loadScenario({
        name: 'mortgage-fiat-calm',
        seed: 2,
        ticks: 36,
        sliders: {
          'scale.households': 60,
          'scale.firms': 6,
          'scale.banks': 1,
          'shock.frequency': 0,
          'regime.type': 'fiat',
          'housing.tenureChoice': 'on',
          'housing.adjustmentRate': 0.01,
          'prices.trendWeight': 1,
        },
      }),
    );
    expect(result.audit.ok).toBe(true);
    const switches = series(result, 'rentToMortgage').map(
      (value, index) =>
        value +
        (series(result, 'mortgageToOwned')[index] ?? 0) +
        (series(result, 'mortgageToRent')[index] ?? 0),
    );
    expect(Math.max(...switches)).toBeLessThan(20);
  });

  it('originates few or no new long bitcoin mortgages under monetary deflation', () => {
    const result = simulate(
      loadScenario({
        name: 'mortgage-bitcoin-freeze',
        seed: 4,
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
          'housing.tenureChoice': 'on',
          'credit.endogenousWeight': 1,
          'credit.householdMortgageShare': 0.25,
          'housing.mortgageLtv': 0.95,
          'household.openingDepositMonths': 12,
        },
      }),
    );
    expect(result.audit.ok).toBe(true);
    expect(sum(series(result, 'mortgageOriginations'))).toBeLessThan(8);
  });
});

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
