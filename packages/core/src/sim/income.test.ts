import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { createEconomy } from './init.js';
import { distributeIncome } from './government.js';
import { loadParameters } from './parameters.js';

describe('profit shares under a large AI factor', () => {
  it('pays a finite profit to the highest skill when the ownership exponent overflows', () => {
    const economy = createEconomy(
      loadParameters(loadScenario({ name: 'income', seed: 1, ticks: 1 })),
      1,
      null,
    );
    const aiFactor = 589;
    economy.aiFactor = aiFactor;
    const concentration = 1.5 + economy.params.ownership * (aiFactor - 1);
    expect(
      economy.households.some((household) => !Number.isFinite(household.skill ** concentration)),
    ).toBe(true);

    const deposit = 1_000_000_000;
    for (const firm of economy.firms) {
      firm.deposit = deposit;
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
    const topIncome = Math.max(...economy.households.map((household) => household.income));
    expect(topIncome).toBeGreaterThan(pool / 2);
    expect(
      economy.households.some(
        (household) => household.skill === topSkill && household.income === topIncome,
      ),
    ).toBe(true);
  });
});
