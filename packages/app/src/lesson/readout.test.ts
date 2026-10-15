import { describe, expect, it } from 'vitest';
import { addSeries, comparePhrase, lessonCopy } from './readout.js';

describe('deficit lesson readout', () => {
  it('treats a gap inside 2 percent as the same path', () => {
    expect(comparePhrase(112, 111.98)).toBe('about the same');
    expect(comparePhrase(100, 90)).toBe('10 percent lower');
    expect(comparePhrase(100, 109.4)).toBe('9.4 percent higher');
    expect(comparePhrase(100, 161)).toBe('61 percent higher');
  });

  it('adds household and government goods month by month', () => {
    expect(addSeries([1, 2], [10, 20, 30])).toEqual([11, 22]);
  });

  it('names the split-income rule when extra spending is off', () => {
    const copy = lessonCopy({
      addsDemand: false,
      pricesFollowDemand: false,
      levels: {
        priceBaseline: 120,
        priceScenario: 120.1,
        demandBaseline: 100,
        demandScenario: 90,
        moneyBaseline: 100,
        moneyScenario: 161,
      },
    });
    expect(copy.score).toBe(
      'Prices end about the same. Household goods average 10 percent lower. The money stock ends 61 percent higher.',
    );
    expect(copy.demand).toMatch(/taken out of household budgets/);
    expect(copy.prices).toMatch(/inflation target/);
    expect(copy.money).toMatch(/bonds/);
  });

  it('names excess demand when prices follow spending', () => {
    const copy = lessonCopy({
      addsDemand: true,
      pricesFollowDemand: true,
      levels: {
        priceBaseline: 100,
        priceScenario: 200,
        demandBaseline: 100,
        demandScenario: 147,
        moneyBaseline: 100,
        moneyScenario: 122,
      },
    });
    expect(copy.score).toMatch(/Prices end 100 percent higher/);
    expect(copy.prices).toMatch(/excess demand/);
    expect(copy.demand).toMatch(/gap between the 35 percent/);
  });
});
