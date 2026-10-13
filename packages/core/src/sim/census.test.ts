import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { jobShares, measureHouseholds, ownerWealthShare } from './census.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';

describe('household census', () => {
  it('partitions households into unemployed, small-firm, and large-firm shares', () => {
    const economy = economyWith(20, 4);
    for (const firm of economy.firms) {
      firm.workers = [];
    }
    for (const household of economy.households) {
      household.employer = -1;
    }
    assign(economy, 0, [0]);
    assign(economy, 1, [1]);
    assign(economy, 2, [2, 3, 4, 5, 6]);
    assign(economy, 3, [7, 8, 9, 10, 11]);

    expect(jobShares(economy)).toEqual({ unemployed: 0.4, small: 0.1, large: 0.5 });
  });

  it('adds half a housing-security point to the log of real consumption', () => {
    const economy = economyWith(20, 4);
    for (const household of economy.households) {
      household.realConsumption = Math.E;
      household.income = 100;
    }

    const measured = measureHouseholds(economy);

    expect(measured.housingSecurity).toBeCloseTo(0.5);
    expect(measured.wellbeingMean).toBeCloseTo(1.25);
    expect(measured.wellbeingMedian).toBeCloseTo(1.25);
  });

  it('partitions wealth into cash and claims; net worth can be negative', () => {
    const economy = economyWith(20, 4);
    for (const household of economy.households) {
      household.deposit = 100;
      household.bitcoin = 0;
      // Clear any opening debt so net worth equals deposits
      household.mortgage = 0;
      household.bitcoinMortgage = 0;
      household.consumerLoan = 0;
      household.bitcoinConsumer = 0;
    }
    economy.params.equityMarket = 'off';
    const off = measureHouseholds(economy);
    expect(off.claimWealthTotal).toBe(0);
    // When all households have positive wealth and no claims, cash total equals wealth total
    expect(off.cashWealthTotal).toBe(off.wealth.total);
    expect(off.wealth.total).toBe(2000); // 20 households × 100

    // Give one household negative net worth via large mortgage
    const household = economy.households[0];
    if (!household) {
      throw new Error('missing household');
    }
    household.mortgage = 150; // Debt exceeds deposits: net worth = 100 - 150 = -50
    
    const withDebt = measureHouseholds(economy);
    expect(withDebt.claimWealthTotal).toBe(0); // Still no equity market
    // wealth.total sums only non-negative: 19×100 + 0 = 1900
    expect(withDebt.wealth.total).toBe(1900);
    // cashWealthTotal includes the negative: 19×100 + (-50) = 1850
    expect(withDebt.cashWealthTotal).toBe(1850);
    // Negative net worth is captured in the difference
    expect(withDebt.cashWealthTotal).toBeLessThan(withDebt.wealth.total);
  });

  it('reports no owner-wealth share until an agent exists', () => {
    const economy = economyWith(20, 4);
    expect(ownerWealthShare(economy)).toBe(0);
    economy.agents.push({
      id: 0,
      owner: 0,
      deposit: 0,
      bitcoin: 0,
      income: 0,
      smoothed: 0,
      subagents: 1,
    });
    expect(ownerWealthShare(economy)).toBeGreaterThan(0);
    expect(ownerWealthShare(economy)).toBeLessThanOrEqual(1);
  });
});

function economyWith(households: number, firms: number) {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'census',
        seed: 1,
        ticks: 1,
        sliders: {
          'scale.households': households,
          'scale.firms': firms,
          'scale.banks': 1,
        },
      }),
    ),
    1,
    null,
  );
}

function assign(
  economy: ReturnType<typeof economyWith>,
  firmId: number,
  householdIds: readonly number[],
): void {
  const firm = economy.firms[firmId];
  if (!firm) {
    throw new Error(`Missing firm ${firmId}`);
  }
  for (const id of householdIds) {
    const household = economy.households[id];
    if (!household) {
      throw new Error(`Missing household ${id}`);
    }
    firm.workers.push(id);
    household.employer = firmId;
  }
}
