import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { moneyBalances } from './banking.js';
import { BITCOIN_OPENING_SHARE } from './bitcoin-supply.js';
import { bitcoinDepositUnits } from './dual-currency.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { bankBalanceIdentity } from './stocks.js';
import { SUPPLY_SHOCK_START_PRICE_USD, supplyShockPriceCents } from './supply-shock-price.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
  'ai.ownerShareCeiling': 0,
};

describe('hybrid dual-currency books', () => {
  it('opens hybrid on cents with bitcoin at the supply-shock start price', () => {
    const economy = opened({ 'regime.type': 'hybrid' });
    expect(economy.params.unit).toBe('cent');
    expect(economy.bitcoinPrice).toBe(SUPPLY_SHOCK_START_PRICE_USD * 100);
    const balances = moneyBalances(economy);
    const total = balances.fiat + balances.bitcoin;
    expect(balances.bitcoin / total).toBeCloseTo(BITCOIN_OPENING_SHARE, 3);
    expect(bitcoinDepositUnits(economy)).toBeGreaterThan(0);
    expect(economy.exchangeBitcoin).toBeGreaterThan(0);
    expect(Math.abs(bankBalanceIdentity(economy))).toBeLessThan(1e-6);
  });

  it('follows the supply-shock path and ignores choice speed for the rate', () => {
    const calm = run({ ...small, 'regime.type': 'hybrid', 'money.choiceSpeed': 0, ticks: 24 });
    const choosy = run({
      ...small,
      'regime.type': 'hybrid',
      'money.choiceSpeed': 0.5,
      'money.bitcoinTrust': 2,
      'bitcoin.marketPriceWeight': 1,
      ticks: 24,
    });
    expect(calm.audit.ok && choosy.audit.ok).toBe(true);
    const calmPrice = series(calm, 'bitcoinPrice');
    const choosyPrice = series(choosy, 'bitcoinPrice');
    expect(choosyPrice).toEqual(calmPrice);
    expect(calmPrice[0]).toBe(supplyShockPriceCents(0));
    expect(calmPrice[12]).toBe(supplyShockPriceCents(12));
    const lastPrice = calmPrice.at(-1);
    const firstPrice = calmPrice[0];
    if (lastPrice === undefined || firstPrice === undefined) {
      throw new Error('Missing price data');
    }
    expect(lastPrice).toBeGreaterThan(firstPrice);
  });

  it('does not rebalance coin quantities from money choice when speed is 0', () => {
    const quiet = run({
      ...small,
      'regime.type': 'hybrid',
      'money.choiceSpeed': 0,
      'money.bitcoinTrust': 2,
      'money.fiatLegalTender': 0,
      ticks: 12,
    });
    const choosy = run({
      ...small,
      'regime.type': 'hybrid',
      'money.choiceSpeed': 0.5,
      'money.bitcoinTrust': 2,
      'money.fiatLegalTender': 0,
      ticks: 12,
    });
    expect(quiet.audit.ok && choosy.audit.ok).toBe(true);
    const choosyBitcoinShare = series(choosy, 'bitcoinShare').at(-1);
    const quietBitcoinShare = series(quiet, 'bitcoinShare').at(-1);
    if (choosyBitcoinShare === undefined || quietBitcoinShare === undefined) {
      throw new Error('Missing bitcoinShare data');
    }
    expect(choosyBitcoinShare).toBeGreaterThan(quietBitcoinShare);
    const quietLastPrice = series(quiet, 'bitcoinPrice').at(-1);
    const quietFirstPrice = series(quiet, 'bitcoinPrice')[0];
    if (quietLastPrice === undefined || quietFirstPrice === undefined) {
      throw new Error('Missing bitcoinPrice data');
    }
    expect(quietLastPrice).toBeGreaterThan(quietFirstPrice);
  });

  it('raises coin quantities when choice speed and bitcoin trust are high', () => {
    const quiet = run({
      ...small,
      'regime.type': 'hybrid',
      'money.choiceSpeed': 0,
      ticks: 24,
    });
    const trusted = run({
      ...small,
      'regime.type': 'hybrid',
      'money.choiceSpeed': 0.4,
      'money.bitcoinTrust': 2,
      'money.fiatLegalTender': 0,
      ticks: 24,
    });
    expect(quiet.audit.ok && trusted.audit.ok).toBe(true);
    const trustedBitcoinShare = series(trusted, 'bitcoinShare').at(-1);
    const quietBitcoinShare = series(quiet, 'bitcoinShare').at(-1);
    if (trustedBitcoinShare === undefined || quietBitcoinShare === undefined) {
      throw new Error('Missing bitcoinShare data');
    }
    expect(trustedBitcoinShare).toBeGreaterThan(quietBitcoinShare);
  });

  it('leaves a fiat run bitcoin price path unchanged', () => {
    const fiat = run({ ...small, 'regime.type': 'fiat', ticks: 24 });
    expect(fiat.audit.ok).toBe(true);
    expect(series(fiat, 'bitcoinPrice')[0]).toBe(1);
  });
});

function opened(sliders: Record<string, number | string>) {
  const config = loadScenario({
    name: 'hybrid-open',
    seed: 2,
    ticks: 1,
    sliders: { ...small, ...sliders },
  });
  return createEconomy(loadParameters(config), config.seed, null);
}

function run(input: Record<string, number | string> & { ticks?: number }) {
  const { ticks = 36, ...sliders } = input;
  return simulate(loadScenario({ name: 'hybrid-run', seed: 2, ticks, sliders }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
