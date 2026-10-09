import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { totalDeposits } from './banking.js';
import { onCentralBank } from './central-bank.js';
import type { Economy } from './economy.js';
import { FEATURE_OFF } from './feature-off.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { simulate } from './simulate.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
};

const presetPath = path.join(
  fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
);
const monetaryPreset = JSON.parse(readFileSync(presetPath, 'utf8')).sliders as Record<
  string,
  number | string
>;

describe('choice speed keeps regime operations', () => {
  it('grows fiat deposits when money choice is moving', () => {
    const economy = opened({
      ...small,
      'regime.type': 'fiat',
      'money.choiceSpeed': 0.01,
      'centralBank.moneyGrowth': 1,
      'centralBank.stimulus': 0,
    });
    const before = totalDeposits(economy);
    onCentralBank(economy);
    expect(totalDeposits(economy)).toBeGreaterThan(before);
  });

  it('repairs hybrid bank equity when money choice is moving', () => {
    const economy = opened({
      ...small,
      'regime.type': 'hybrid',
      'money.choiceSpeed': 0.01,
      'bank.capitalRatio': 0.04,
    });
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('expected a bank');
    }
    bank.equity = -500;
    onCentralBank(economy);
    expect(bank.equity).toBeGreaterThan(0);
  });

  it('does not grow bitcoin deposits or inject capital at choice speed 0', () => {
    const economy = opened({
      ...small,
      'regime.type': 'bitcoin',
      'money.choiceSpeed': 0,
      'centralBank.moneyGrowth': 1,
    });
    const bank = economy.banks[0];
    if (!bank) {
      throw new Error('expected a bank');
    }
    bank.equity = -500;
    const beforeDeposits = totalDeposits(economy);
    const beforeBase = bank.reserves;
    onCentralBank(economy);
    expect(totalDeposits(economy)).toBe(beforeDeposits);
    expect(bank.equity).toBe(-500);
    expect(bank.reserves).toBe(beforeBase);
  });

  it('pins the monetary preset to choice speed 0 so fiat grows versus bitcoin', () => {
    expect(monetaryPreset['money.choiceSpeed']).toBe(0);
    expect(monetaryPreset['labor.firmLevelHiring']).toBe('off');
    const shared = {
      ...monetaryPreset,
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
      'shock.frequency': 0,
      ticks: 36,
    };
    const fiat = run({ ...shared, 'regime.type': 'fiat' });
    const bitcoin = run({ ...shared, 'regime.type': 'bitcoin' });
    expect(fiat.audit.ok && bitcoin.audit.ok).toBe(true);
    const fiatMoney = series(fiat, 'moneySupply');
    const bitcoinMoney = series(bitcoin, 'moneySupply');
    expect((fiatMoney.at(-1) ?? 0) / Math.max(fiatMoney[0] ?? 1, 1)).toBeGreaterThan(
      (bitcoinMoney.at(-1) ?? 0) / Math.max(bitcoinMoney[0] ?? 1, 1),
    );
  });
});

function opened(sliders: Record<string, number | string>): Economy {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'choice-speed-regime',
        seed: 1,
        ticks: 1,
        sliders,
      }),
    ),
    1,
    null,
  );
}

function run(sliders: Record<string, number | string> & { ticks?: number }): SimulationResult {
  const { ticks = 36, ...rest } = sliders;
  return simulate(loadScenario({ name: 'choice-speed-run', seed: 2, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
