import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { desiredCapital, onCredit } from './credit.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { FEATURE_OFF } from './feature-off.js';

describe('investment finance', () => {
  it('does not count a credit-impulse draw twice in the loan path', () => {
    const economy = readyEconomy();
    economy.params.investmentHurdle = 'on';
    economy.params.hurdlePremium = 0;
    economy.creditImpulse = 0.5;
    for (const firm of economy.firms) {
      firm.capital = 0;
      firm.price = 10;
      firm.workers = [];
    }
    const gap = desiredCapital(economy);
    onCredit(economy);
    expect(economy.newBorrowing).toBeGreaterThan(0);
    expect(economy.loanFinance).toBeCloseTo(gap * 10 * economy.firms.length, 6);
    expect(economy.profitSharingFinance).toBe(0);
  });

  it('records three quarters of a failed gap as profit-sharing finance', () => {
    const economy = readyEconomy();
    economy.params.investmentHurdle = 'on';
    economy.params.hurdlePremium = 10;
    economy.params.prodGrowth = 0.01;
    economy.params.markup = 0.2;
    for (const firm of economy.firms) {
      firm.capital = 0;
      firm.price = 10;
      firm.workers = [];
    }
    const gap = desiredCapital(economy);
    // Calm months install a twelfth of the gap (then the hurdle keeps a quarter).
    const monthGap = gap / 12;
    onCredit(economy);
    expect(economy.loanFinance).toBe(0);
    expect(economy.realInvestment).toBeCloseTo(0.25 * monthGap * economy.firms.length, 8);
    expect(economy.profitSharingFinance).toBeCloseTo(
      0.75 * monthGap * 10 * economy.firms.length,
      8,
    );
  });
});

function readyEconomy() {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'credit',
        seed: 1,
        ticks: 1,
        sliders: {
          ...FEATURE_OFF,
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
}
