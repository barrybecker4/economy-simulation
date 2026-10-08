import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { createEconomy } from './init.js';
import { distributeIncome } from './income.js';
import { setDeposit } from './money.js';
import { loadParameters } from './parameters.js';

describe('profit shares under a large AI factor', () => {
  it('pays a finite profit to the highest skill when the ownership exponent overflows', () => {
    const economy = createEconomy(
      loadParameters(loadScenario({ name: 'income', seed: 1, ticks: 1 })),
      1,
      null,
    );
    const peak = Math.max(...economy.households.map((household) => household.skill));
    let aiFactor = 1;
    let concentration = 1.5;
    while (Number.isFinite(peak ** concentration) && aiFactor < 2000) {
      aiFactor += 1;
      concentration = 1.5 + economy.params.ownership * (aiFactor - 1);
    }
    economy.aiFactor = aiFactor;
    expect(aiFactor).toBeLessThan(2000);
    expect(
      economy.households.some((household) => !Number.isFinite(household.skill ** concentration)),
    ).toBe(true);

    const deposit = 1_000_000_000;
    for (const firm of economy.firms) {
      setDeposit(firm, deposit);
    }
    distributeIncome(economy);

    expect(
      economy.households.every(
        (household) => Number.isFinite(household.deposit) && Number.isFinite(household.income),
      ),
    ).toBe(true);
    const pool = deposit * economy.firms.length;
    expect(economy.households.reduce((sum, household) => sum + household.income, 0)).toBe(pool);
    const topSkill = Math.max(...economy.households.map((household) => household.skill));
    const leaders = economy.households.filter((household) => household.skill === topSkill);
    const leaderIncome = leaders.reduce((sum, household) => sum + household.income, 0);
    const topIncome = Math.max(...economy.households.map((household) => household.income));
    expect(leaders.length).toBeGreaterThan(0);
    expect(leaders.every((household) => household.income === topIncome)).toBe(true);
    expect(leaderIncome).toBeGreaterThan(pool - leaderIncome);
  });
});
