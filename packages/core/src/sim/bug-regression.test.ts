import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { issueBonds } from './bank-books.js';
import { placeInjection } from './central-bank.js';
import type { Economy } from './economy.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { bankBalanceIdentity } from './stocks.js';

const presetPath = path.join(
  fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
);
const monetaryPreset = JSON.parse(readFileSync(presetPath, 'utf8')).sliders as Record<
  string,
  number | string
>;

const small = {
  ...FEATURE_OFF,
  'scale.households': 500,
  'scale.firms': 50,
  'scale.banks': 3,
  'shock.frequency': 0,
};

describe('BUG 1: choiceSpeed decoupled from monetary policy rule', () => {
  it('fiat follows its own regime rule at default choiceSpeed', () => {
    const result = run({
      ...small,
      'regime.type': 'fiat',
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);

    const money = series(result, 'moneySupply');
    const inflation = series(result, 'inflation');

    // Fiat money should grow over time (not deflate)
    const moneyGrowth = (money.at(-1) ?? 0) / Math.max(money[0] ?? 1, 1);
    expect(moneyGrowth).toBeGreaterThan(1);

    // Average inflation should be positive and near the target (2%)
    const avgInflation =
      inflation.reduce((sum, val) => sum + val, 0) / Math.max(inflation.length, 1);
    expect(avgInflation).toBeGreaterThan(0);
    expect(avgInflation).toBeLessThan(0.08); // Not runaway
  });

  it('bitcoin follows its own regime rule at default choiceSpeed', () => {
    const result = run({
      ...small,
      'regime.type': 'bitcoin',
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);

    const money = series(result, 'moneySupply');
    const inflation = series(result, 'inflation');

    // Bitcoin money supply should not grow significantly (fixed supply)
    const moneyGrowth = (money.at(-1) ?? 0) / Math.max(money[0] ?? 1, 1);
    expect(moneyGrowth).toBeLessThan(1.1); // Allow for small changes

    // Inflation should be negative or near zero (deflation with productivity)
    const avgInflation =
      inflation.reduce((sum, val) => sum + val, 0) / Math.max(inflation.length, 1);
    expect(avgInflation).toBeLessThanOrEqual(0.02);
  });

  it('fiat and bitcoin outcomes differ at default settings', () => {
    const shared = {
      ...small,
      ticks: 120,
    };

    const fiat = run({ ...shared, 'regime.type': 'fiat' });
    const bitcoin = run({ ...shared, 'regime.type': 'bitcoin' });

    expect(fiat.audit.ok && bitcoin.audit.ok).toBe(true);

    const fiatMoney = series(fiat, 'moneySupply');
    const bitcoinMoney = series(bitcoin, 'moneySupply');

    const fiatGrowth = (fiatMoney.at(-1) ?? 0) / Math.max(fiatMoney[0] ?? 1, 1);
    const bitcoinGrowth = (bitcoinMoney.at(-1) ?? 0) / Math.max(bitcoinMoney[0] ?? 1, 1);

    // Fiat should grow significantly more than bitcoin
    expect(fiatGrowth).toBeGreaterThan(bitcoinGrowth + 0.2);

    const fiatInflation = series(fiat, 'inflation');
    const bitcoinInflation = series(bitcoin, 'inflation');

    const fiatAvgInflation =
      fiatInflation.reduce((sum, val) => sum + val, 0) / Math.max(fiatInflation.length, 1);
    const bitcoinAvgInflation =
      bitcoinInflation.reduce((sum, val) => sum + val, 0) / Math.max(bitcoinInflation.length, 1);

    // Fiat inflation should be significantly higher than bitcoin
    expect(fiatAvgInflation).toBeGreaterThan(bitcoinAvgInflation + 0.01);
  });

  it('fiat money rule actually runs at M preset defaults', () => {
    // This test verifies that fiat follows its regime rule at default choiceSpeed
    // The bug was that choiceSpeed > 0 caused all regimes to use a blended rule
    // Now with choiceSpeed 0, fiat should use growFiatMoney and show different
    // outcomes than bitcoin
    const fiat = run({
      ...monetaryPreset,
      'regime.type': 'fiat',
      'scale.households': 500,
      'scale.firms': 50,
      'scale.banks': 3,
      'shock.frequency': 0,
      ticks: 120,
    });

    const bitcoin = run({
      ...monetaryPreset,
      'regime.type': 'bitcoin',
      'scale.households': 500,
      'scale.firms': 50,
      'scale.banks': 3,
      'shock.frequency': 0,
      ticks: 120,
    });

    expect(fiat.audit.ok && bitcoin.audit.ok).toBe(true);

    const fiatInflation = series(fiat, 'inflation');
    const bitcoinInflation = series(bitcoin, 'inflation');
    const fiatUnemployment = series(fiat, 'unemployment');
    const bitcoinUnemployment = series(bitcoin, 'unemployment');

    // Fiat inflation should be higher than bitcoin (not both deflating at -2.3% as bug caused)
    const fiatAvgInflation =
      fiatInflation.reduce((sum, val) => sum + val, 0) / Math.max(fiatInflation.length, 1);
    const bitcoinAvgInflation =
      bitcoinInflation.reduce((sum, val) => sum + val, 0) / Math.max(bitcoinInflation.length, 1);

    expect(fiatAvgInflation).toBeGreaterThan(bitcoinAvgInflation);

    // The outcomes should be measurably different (not converged as the bug caused)
    const inflationGap = Math.abs(fiatAvgInflation - bitcoinAvgInflation);
    expect(inflationGap).toBeGreaterThan(0.01); // At least 1pp difference

    // With the bug, fiat had 15.9% unemployment vs 7.7% without it
    // Now fiat should have different (typically lower) unemployment than bitcoin
    const fiatAvgUnemployment =
      fiatUnemployment.reduce((sum, val) => sum + val, 0) / Math.max(fiatUnemployment.length, 1);
    const bitcoinAvgUnemployment =
      bitcoinUnemployment.reduce((sum, val) => sum + val, 0) /
      Math.max(bitcoinUnemployment.length, 1);

    // They should be measurably different
    expect(Math.abs(fiatAvgUnemployment - bitcoinAvgUnemployment)).toBeGreaterThan(0.01);
  });

  it('all three regimes follow their own rules at default choiceSpeed 0', () => {
    const shared = {
      ...small,
      'money.choiceSpeed': 0,
      ticks: 120,
    };

    const fiat = run({ ...shared, 'regime.type': 'fiat' });
    const bitcoin = run({ ...shared, 'regime.type': 'bitcoin' });
    const hybrid = run({ ...shared, 'regime.type': 'hybrid' });

    expect(fiat.audit.ok && bitcoin.audit.ok && hybrid.audit.ok).toBe(true);

    // Each regime should have distinct money growth patterns
    const fiatMoney = series(fiat, 'moneySupply');
    const bitcoinMoney = series(bitcoin, 'moneySupply');
    const hybridMoney = series(hybrid, 'moneySupply');

    const fiatGrowth = (fiatMoney.at(-1) ?? 0) / Math.max(fiatMoney[0] ?? 1, 1);
    const bitcoinGrowth = (bitcoinMoney.at(-1) ?? 0) / Math.max(bitcoinMoney[0] ?? 1, 1);
    const hybridGrowth = (hybridMoney.at(-1) ?? 0) / Math.max(hybridMoney[0] ?? 1, 1);

    // Fiat should grow the most
    expect(fiatGrowth).toBeGreaterThan(1.2);

    // Bitcoin should grow the least (or even shrink)
    expect(bitcoinGrowth).toBeLessThan(fiatGrowth);

    // Hybrid has separate fiat and bitcoin money, so growth can be higher
    // The key is that all three produce different outcomes
    expect(Math.abs(fiatGrowth - bitcoinGrowth)).toBeGreaterThan(0.2);
  });
});

describe('BUG 2: assetPurchase channel accounting', () => {
  it('creates exactly the intended amount of new money', () => {
    const state = opened({
      ...small,
      'regime.type': 'fiat',
      'centralBank.injectionChannel': 'assetPurchase',
      'bank.reserveRequirement': 0.1,
    });

    // Issue bonds so there's something to purchase
    issueBonds(state, 10_000);

    const moneyBefore =
      state.households.reduce((sum, h) => sum + h.deposit, 0) +
      state.firms.reduce((sum, f) => sum + f.deposit, 0) +
      state.govDeposits;

    const injectionAmount = 5_000;
    const actuallyPlaced = placeInjection(state, injectionAmount);

    const moneyAfter =
      state.households.reduce((sum, h) => sum + h.deposit, 0) +
      state.firms.reduce((sum, f) => sum + f.deposit, 0) +
      state.govDeposits;

    // Money created should equal the amount placed
    expect(moneyAfter - moneyBefore).toBeCloseTo(actuallyPlaced, 0);

    // Ledger should still balance
    expect(bankBalanceIdentity(state)).toBeCloseTo(0, 6);
  });

  it('assetPurchase channel does not cause explosive money growth', () => {
    // The bug was that assetPurchase grew money 7.6x-7,276x with runaway inflation
    // This test verifies it now stays bounded
    const result = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.injectionChannel': 'assetPurchase',
      'centralBank.moneyGrowth': 1,
      'centralBank.stimulus': 1.75,
      'government.bondRate': 0.02,
      ticks: 48, // 4 years
    });

    expect(result.audit.ok).toBe(true);

    const money = series(result, 'moneySupply');
    const growthRatio = (money.at(-1) ?? 0) / Math.max(money[0] ?? 1, 1);

    // Should not have explosive growth like the bug (7.6x+ over shorter periods)
    expect(growthRatio).toBeLessThan(2.5); // Reasonable for 4 years with stimulus
  });

  it('assetPurchase channel does not cause explosive money growth', () => {
    // The bug was that assetPurchase grew money 7.6x-7,276x with runaway inflation
    // This test verifies it now stays bounded
    const result = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.injectionChannel': 'assetPurchase',
      'centralBank.moneyGrowth': 1,
      'centralBank.stimulus': 1.75,
      'government.bondRate': 0.02,
      ticks: 48, // 4 years
    });

    expect(result.audit.ok).toBe(true);

    const money = series(result, 'moneySupply');
    const growthRatio = (money.at(-1) ?? 0) / Math.max(money[0] ?? 1, 1);

    // Should not have explosive growth like the bug (7.6x+ over shorter periods)
    expect(growthRatio).toBeLessThan(2.5); // Reasonable for 4 years with stimulus
  });

  it('money growth stays bounded with assetPurchase', () => {
    const result = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.injectionChannel': 'assetPurchase',
      'centralBank.moneyGrowth': 1,
      'centralBank.stimulus': 1.75,
      'government.bondRate': 0.02,
      ticks: 120,
    });

    expect(result.audit.ok).toBe(true);

    const money = series(result, 'moneySupply');
    const priceLevel = series(result, 'priceLevel');

    const moneyGrowth = (money.at(-1) ?? 0) / Math.max(money[0] ?? 1, 1);
    const annualInflation =
      (Math.pow((priceLevel.at(-1) ?? 0) / Math.max(priceLevel[0] ?? 1, 1), 1 / 10) - 1) * 100;

    // Should not have explosive growth (7.6x-7,276x as the bug caused)
    expect(moneyGrowth).toBeLessThan(3); // Well under buggy 7.6x minimum

    // Inflation should not be runaway (20-49%/yr as the bug caused)
    expect(annualInflation).toBeLessThan(15); // Well under buggy 20%/yr minimum
  });

  it('assetPurchase behaves in same range as proRataDeposits', () => {
    const shared = {
      ...small,
      'regime.type': 'fiat',
      'centralBank.moneyGrowth': 1,
      'centralBank.stimulus': 1.75,
      'government.bondRate': 0.02,
      ticks: 120,
    };

    const proRata = run({
      ...shared,
      'centralBank.injectionChannel': 'proRataDeposits',
    });

    const assetPurchase = run({
      ...shared,
      'centralBank.injectionChannel': 'assetPurchase',
    });

    expect(proRata.audit.ok && assetPurchase.audit.ok).toBe(true);

    const proRataMoney = series(proRata, 'moneySupply');
    const assetMoney = series(assetPurchase, 'moneySupply');

    const proRataGrowth = (proRataMoney.at(-1) ?? 0) / Math.max(proRataMoney[0] ?? 1, 1);
    const assetGrowth = (assetMoney.at(-1) ?? 0) / Math.max(assetMoney[0] ?? 1, 1);

    // Should be in the same order of magnitude (not 7.6x-7,276x ratio)
    expect(assetGrowth / proRataGrowth).toBeLessThan(3);
    expect(assetGrowth / proRataGrowth).toBeGreaterThan(0.3);
  });

  it('ledger invariants hold with assetPurchase over full run', () => {
    const result = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.injectionChannel': 'assetPurchase',
      'centralBank.moneyGrowth': 1,
      'centralBank.stimulus': 1.75,
      'government.bondRate': 0.02,
      ticks: 120,
    });

    expect(result.audit.ok).toBe(true);

    // Verify audit passed every tick
    const auditOk = series(result, 'auditOk');
    expect(auditOk.every((val) => val === 1)).toBe(true);
  });

  it('assetPurchase with high stimulus does not cause runaway inflation', () => {
    // The bug showed CPI growing 20-49%/yr with assetPurchase
    // This test verifies inflation stays reasonable
    const result = run({
      ...small,
      'regime.type': 'fiat',
      'centralBank.injectionChannel': 'assetPurchase',
      'centralBank.moneyGrowth': 1,
      'centralBank.stimulus': 1.75,
      'government.bondRate': 0.02,
      ticks: 120,
    });

    expect(result.audit.ok).toBe(true);

    const priceLevel = series(result, 'priceLevel');

    const priceGrowth = (priceLevel.at(-1) ?? 0) / Math.max(priceLevel[0] ?? 1, 1);
    const annualInflation = (Math.pow(priceGrowth, 1 / 10) - 1) * 100;

    // Should not have runaway inflation (20-49%/yr as bug caused)
    expect(annualInflation).toBeLessThan(15); // Well under buggy 20%/yr
  });
});

function opened(sliders: Record<string, number | string>): Economy {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'bug-regression',
        seed: 3,
        ticks: 1,
        sliders,
      }),
    ),
    1,
    null,
  );
}

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  shock?: { tick: number; kind: 'credit' | 'demand' | 'productivity'; size: number },
): SimulationResult {
  const { ticks = 120, ...rest } = sliders;
  return simulate(loadScenario({ name: 'bug-regression-run', seed: 5, ticks, sliders: rest }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
