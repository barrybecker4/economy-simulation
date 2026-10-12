import { describe, expect, it } from 'vitest';
import { INITIAL_WAGE } from '../../../core/src/sim/rules.js';
import { SUPPLY_SHOCK_START_PRICE_USD } from '../../../core/src/sim/supply-shock-price.js';
import {
  DISPLAY_MONTHLY_WAGE_DOLLARS,
  DOLLARS_PER_MODEL_CENT,
  SATOSHIS_PER_MODEL_SAT,
  displayMoneySeries,
  displayMoneyValue,
  moneyDisplayUnit,
  bitcoinExchangeDescription,
  livingStandardsDescription,
  moneyLineLabel,
  moneyUnit,
  needsPriceLevel,
  pricesDescription,
  wealthDescription,
} from './money-display.js';

describe('money display scale', () => {
  it('maps the opening wage to five thousand dollars', () => {
    expect(DOLLARS_PER_MODEL_CENT).toBe(DISPLAY_MONTHLY_WAGE_DOLLARS / INITIAL_WAGE);
    expect(displayMoneyValue(INITIAL_WAGE, 'wageBill', 'fiat', 'nominal', 120, 120)).toBe(
      DISPLAY_MONTHLY_WAGE_DOLLARS,
    );
  });

  it('maps the opening wage to satoshis at the supply-shock bitcoin price', () => {
    const expectedSats =
      (DISPLAY_MONTHLY_WAGE_DOLLARS / SUPPLY_SHOCK_START_PRICE_USD) * 100_000_000;
    expect(displayMoneyValue(INITIAL_WAGE, 'wageBill', 'bitcoin', 'nominal', 120, 120)).toBeCloseTo(
      expectedSats,
      6,
    );
    expect(SATOSHIS_PER_MODEL_SAT * INITIAL_WAGE).toBeCloseTo(expectedSats, 6);
  });

  it('uses cents for fiat and hybrid, satoshis for bitcoin', () => {
    expect(moneyUnit('fiat')).toBe('cents');
    expect(moneyUnit('hybrid')).toBe('cents');
    expect(moneyUnit('bitcoin')).toBe('satoshis');
    expect(() => moneyUnit('gold')).toThrow(/Unknown regime gold/);
  });

  it('labels axes by regime and dollar basis', () => {
    expect(moneyDisplayUnit('fiat', 'nominal')).toBe('dollars');
    expect(moneyDisplayUnit('hybrid', 'real')).toBe('opening-month dollars');
    expect(moneyDisplayUnit('bitcoin', 'real')).toBe('satoshis');
    expect(moneyDisplayUnit('bitcoin', 'nominal')).toBe('satoshis');
  });
});

describe('displayMoneyValue', () => {
  it('leaves nominal money as dollars without using the CPI for the scale', () => {
    expect(displayMoneyValue(200, 'taxRevenue', 'fiat', 'nominal', 120, 120)).toBe(10_000);
  });

  it('deflates nominal dollars by the CPI path in opening-month dollars', () => {
    // 200 cents → $10,000 nominal; prices doubled → $5,000 of month-0 dollars.
    expect(displayMoneyValue(200, 'taxRevenue', 'fiat', 'real', 240, 120)).toBe(5_000);
  });

  it('puts CPI-deflated wealth back into the same dollar as money stocks', () => {
    // Real wealth 10 baskets × CPI 120 = 1,200 cents → $60,000.
    expect(displayMoneyValue(10, 'totalRealWealth', 'fiat', 'nominal', 120, 120)).toBe(60_000);
    // Same stock in opening-month dollars when prices doubled: still $60,000 of month-0 dollars.
    expect(displayMoneyValue(10, 'totalRealWealth', 'fiat', 'real', 240, 120)).toBe(60_000);
  });

  it('converts goods consumption with the CPI so it matches wage dollars', () => {
    // 5 goods × CPI 120 cents = 600 cents → $30,000.
    expect(displayMoneyValue(5, 'meanRealConsumption', 'fiat', 'nominal', 120, 120)).toBe(30_000);
  });

  it('never deflates satoshi amounts', () => {
    const nominal = displayMoneyValue(200, 'taxRevenue', 'bitcoin', 'nominal', 120, 120);
    const ignoredBasis = displayMoneyValue(200, 'taxRevenue', 'bitcoin', 'real', 240, 120);
    expect(ignoredBasis).toBe(nominal);
    expect(nominal).toBe(200 * SATOSHIS_PER_MODEL_SAT);
  });

  it('marks which metrics need a price level', () => {
    expect(needsPriceLevel('totalRealWealth')).toBe(true);
    expect(needsPriceLevel('meanRealConsumption')).toBe(true);
    expect(needsPriceLevel('taxRevenue')).toBe(false);
    expect(needsPriceLevel('priceLevel')).toBe(false);
  });
});

describe('displayMoneySeries', () => {
  it('converts pointwise and keeps nulls', () => {
    const values = [100, null, 200];
    const prices = [120, 120, 240];
    expect(
      displayMoneySeries(values, 'moneySupply', 'fiat', 'nominal', prices, 120),
    ).toEqual([5_000, null, 10_000]);
    expect(displayMoneySeries(values, 'moneySupply', 'fiat', 'real', prices, 120)).toEqual([
      5_000,
      null,
      5_000,
    ]);
  });
});

describe('moneyLineLabel', () => {
  it('drops real from wealth and wage labels under nominal dollars', () => {
    expect(moneyLineLabel('Total real wealth', 'nominal', 'fiat')).toBe('Total wealth');
    expect(moneyLineLabel('Mean real wealth', 'nominal', 'hybrid')).toBe('Mean wealth');
    expect(moneyLineLabel('Real wage', 'nominal', 'fiat')).toBe('Wage');
    expect(moneyLineLabel('Mean real income', 'nominal', 'fiat')).toBe('Mean income');
    expect(moneyLineLabel('Total real wealth', 'real', 'fiat')).toBe('Total real wealth');
    expect(moneyLineLabel('Total real wealth', 'nominal', 'bitcoin')).toBe('Total real wealth');
  });
});

describe('livingStandardsDescription', () => {
  it('describes monthly money amounts without CPI when dollars are nominal', () => {
    const text = livingStandardsDescription('nominal', 'fiat');
    expect(text).toMatch(/monthly money wage/);
    expect(text).toMatch(/monthly wages and profits/);
    expect(text).not.toMatch(/CPI|divided by|opening-month/);
  });

  it('names opening-month dollars when the Dollars control is inflation-adjusted', () => {
    const text = livingStandardsDescription('real', 'fiat');
    expect(text).toMatch(/dollars of the run’s first month/);
    expect(text).toMatch(/When the CPI has fallen/);
    expect(text).not.toMatch(/divided by the CPI/);
  });
});

describe('bitcoinExchangeDescription', () => {
  const fiat = 'fiat catalog text';

  it('uses the fiat catalog text, which carries the redenomination scale', () => {
    expect(bitcoinExchangeDescription('fiat', fiat)).toBe(fiat);
  });

  it('describes the bitcoin regime as the goods index alone', () => {
    const text = bitcoinExchangeDescription('bitcoin', fiat);
    expect(text).toMatch(/consumption basket/);
    expect(text).toMatch(/0\.05 and 20/);
    expect(text).not.toMatch(/3 billion|supply-shock/);
  });

  it('describes hybrid as cents per bitcoin on the supply-shock path', () => {
    const text = bitcoinExchangeDescription('hybrid', fiat);
    expect(text).toMatch(/8\.5 million cents/);
    expect(text).toMatch(/\$85,000/);
    expect(text).not.toMatch(/0\.05 and 20/);
  });
});

describe('pricesDescription and wealthDescription', () => {
  it('do not claim a CPI divide on nominal dollars', () => {
    expect(pricesDescription('nominal', 'fiat')).toMatch(/current dollars/);
    expect(pricesDescription('nominal', 'fiat')).not.toMatch(/divided by/);
    expect(pricesDescription('real', 'fiat')).toMatch(/stays at the opening basket price/);
    expect(wealthDescription('total', 'nominal', 'fiat')).toMatch(/current dollars/);
    expect(wealthDescription('total', 'nominal', 'fiat')).not.toMatch(/divided by/);
    expect(wealthDescription('typical', 'real', 'fiat')).toMatch(/first month/);
  });
});
