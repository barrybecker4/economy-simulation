import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getSlider } from '../config/registry.js';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { Rng } from '../rng/rng.js';
import { issueBonds } from './bank-books.js';
import { placeInjection, withdrawInjection } from './central-bank.js';
import type { Economy } from './economy.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';
import { shuffleInPlace } from './stats.js';
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
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
  'regime.type': 'fiat',
};

describe('preset stability fixes', () => {
  it('defaults money choice speed to 0 so adoption does not rewrite the policy rule', () => {
    expect(getSlider('money.choiceSpeed').default).toBe(0);
  });

  it('pins the monetary preset to choice speed 0 and firm-level hiring off', () => {
    expect(monetaryPreset['money.choiceSpeed']).toBe(0);
    expect(monetaryPreset['labor.firmLevelHiring']).toBe('off');
  });

  it('unwinds asset purchases only from excess reserves', () => {
    const state = opened({
      ...small,
      'centralBank.injectionChannel': 'assetPurchase',
      'bank.reserveRequirement': 0.1,
    });
    issueBonds(state, 10_000);
    placeInjection(state, 8_000);
    const deposits = state.households.reduce((sum, household) => sum + household.deposit, 0) +
      state.firms.reduce((sum, firm) => sum + firm.deposit, 0) +
      state.govDeposits;
    const required = Math.round(0.1 * deposits);
    const reservesBefore = state.banks.reduce((sum, bank) => sum + bank.reserves, 0);
    expect(reservesBefore).toBeGreaterThan(required);
    withdrawInjection(state, 100_000);
    const reservesAfter = state.banks.reduce((sum, bank) => sum + bank.reserves, 0);
    const depositsAfter =
      state.households.reduce((sum, household) => sum + household.deposit, 0) +
      state.firms.reduce((sum, firm) => sum + firm.deposit, 0) +
      state.govDeposits;
    const requiredAfter = Math.round(0.1 * depositsAfter);
    expect(reservesAfter).toBeGreaterThanOrEqual(requiredAfter);
    expect(bankBalanceIdentity(state)).toBeCloseTo(0, 6);
  });

  it('caps crisis stimulus once money has expanded without clearing slack', () => {
    const shock = { tick: 12, kind: 'demand' as const, size: -0.3 };
    const shared = {
      ...FEATURE_OFF,
      ...monetaryPreset,
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
      'shock.frequency': 0,
      'centralBank.stimulus': 1.75,
      'centralBank.stimulusLag': 3,
      ticks: 120,
    };
    const result = run({ ...shared, 'regime.type': 'fiat' }, shock);
    expect(result.audit.ok).toBe(true);
    const money = series(result, 'moneySupply');
    const ratio = (money.at(-1) ?? 0) / Math.max(money[0] ?? 1, 1);
    expect(ratio).toBeLessThan(20);
  });

  it('shuffles household shopping order with a seeded stream', () => {
    const ids = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffled = shuffleInPlace([...ids], new Rng(7).fork('shop/1'));
    expect(shuffled).toHaveLength(ids.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(ids);
    expect(shuffled).not.toEqual(ids);
  });

  it('keeps fiat money from runaway under flexible wages or wage elasticity 0', () => {
    const shared = {
      ...FEATURE_OFF,
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
      'shock.frequency': 0,
      'regime.type': 'fiat',
      'prices.trendWeight': 0,
      'production.demandWeight': 1,
      'bank.depositPassThrough': 1,
      'household.openingDepositMonths': 12,
      ticks: 120,
    };
    const flexible = run({ ...shared, 'wage.nominalRigidity': 0 });
    const inelastic = run({ ...shared, 'labor.wageElasticity': 0 });
    expect(flexible.audit.ok && inelastic.audit.ok).toBe(true);
    for (const result of [flexible, inelastic]) {
      const money = series(result, 'moneySupply');
      const ratio = (money.at(-1) ?? 0) / Math.max(money[0] ?? 1, 1);
      expect(ratio).toBeLessThan(10);
    }
  });
});

function opened(sliders: Record<string, number | string>): Economy {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'preset-stability',
        seed: 1,
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
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'preset-stability-run', seed: 4, ticks, sliders: rest }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
