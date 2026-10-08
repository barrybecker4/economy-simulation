import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { runSimulation, type SimulationResult } from '../engine/engine.js';
import type { MetricId } from '../metrics/metrics.js';
import { totalDeposits } from './banking.js';
import type { Economy } from './economy.js';
import { creditDeposit } from './money.js';
import { simulate } from './simulate.js';
import { World } from './world.js';

const monetary = {
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
  'prices.trendWeight': 0,
  'production.demandWeight': 1,
  'bank.depositPassThrough': 1,
  'expectations.anchorWeight': 0.5,
  'housing.tenureChoice': 'on',
};

describe('phase 32 monetary comparison preset', () => {
  it('raises the CPI after a helicopter drop when trend weight is 0', () => {
    const calm = run({ ...monetary, 'regime.type': 'fiat', ticks: 24 });
    const dropped = helicopter({ ...monetary, 'regime.type': 'fiat' }, 0.5, 24);
    expect(calm.audit.ok && dropped.audit.ok).toBe(true);
    const calmCpi = series(calm, 'priceLevel').at(-1) ?? 0;
    const dropCpi = series(dropped, 'priceLevel').at(-1) ?? 0;
    expect(dropCpi / Math.max(calmCpi, 1)).toBeGreaterThan(1.01);
  });

  it('grows fiat broad money with a higher inflation target', () => {
    const low = run({
      ...monetary,
      'regime.type': 'fiat',
      'centralBank.inflationTarget': 0.01,
      ticks: 120,
    });
    const high = run({
      ...monetary,
      'regime.type': 'fiat',
      'centralBank.inflationTarget': 0.04,
      ticks: 120,
    });
    expect(series(high, 'moneySupply').at(-1) ?? 0).toBeGreaterThan(
      series(low, 'moneySupply').at(-1) ?? 0,
    );
  });

  it('keeps regimes from sharing identical shock unemployment paths', () => {
    const shock = { tick: 12, kind: 'demand' as const, size: 0.2 };
    const fiat = run({ ...monetary, 'regime.type': 'fiat', ticks: 36 }, shock);
    const bitcoin = run({ ...monetary, 'regime.type': 'bitcoin', ticks: 36 }, shock);
    expect(series(fiat, 'unemployment')).not.toEqual(series(bitcoin, 'unemployment'));
  });

  it('lifts scarce categories and cheapens mass-produced goods as fiat money grows', () => {
    const result = run({
      ...monetary,
      'credit.endogenousWeight': 1,
      'credit.leverageStart': 1,
      'bank.capitalRatio': 0.04,
      'household.openingDepositMonths': 12,
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);
    // Base money follows the growth rule. Broad money can sit near its opening
    // level when surviving banks keep collecting loan repayments.
    expect(endOverStart(result, 'baseMoney')).toBeGreaterThan(1);
    // Relative prices: scarce categories rise versus electronics even when the
    // headline CPI path is demand-led and soft.
    const electronics = endOverStart(result, 'priceElectronics');
    for (const id of ['priceEnergy', 'priceMedical', 'priceEducation'] as const) {
      expect(endOverStart(result, id) / Math.max(electronics, 1e-9)).toBeGreaterThan(1);
    }
    expect(endOverStart(result, 'priceApparel')).toBeLessThan(endOverStart(result, 'priceEnergy'));
  });

  it('keeps the ledger identity with tenure choice on', () => {
    const fiat = run({ ...monetary, 'regime.type': 'fiat', ticks: 36 });
    const bitcoin = run({ ...monetary, 'regime.type': 'bitcoin', ticks: 36 });
    expect(series(fiat, 'auditOk').every((value) => value === 1)).toBe(true);
    expect(series(bitcoin, 'auditOk').every((value) => value === 1)).toBe(true);
  });
});

function helicopter(
  sliders: Record<string, number | string>,
  fraction: number,
  ticks: number,
): SimulationResult {
  const config = loadScenario({ name: 'heli', seed: 2, ticks, sliders });
  const world = new World(config, null);
  const economy = economyOf(world);
  const before = totalDeposits(economy);
  for (const household of economy.households) {
    creditDeposit(household, household.deposit * fraction);
  }
  const added = totalDeposits(economy) - before;
  const bank = economy.banks[0];
  if (bank && added > 0) {
    bank.reserves += added;
  }
  return runSimulation(config, world.handlers());
}

function economyOf(world: World): Economy {
  return (world as unknown as { economy: Economy }).economy;
}

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  shock?: { tick: number; kind: 'credit' | 'demand' | 'productivity'; size: number },
): SimulationResult {
  const { ticks = 48, ...rest } = sliders;
  return simulate(loadScenario({ name: 'phase32', seed: 2, ticks, sliders: rest }), shock);
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function endOverStart(result: SimulationResult, id: MetricId): number {
  const values = series(result, id);
  const first = values[0] ?? 1;
  const last = values[values.length - 1] ?? 0;
  return first === 0 ? last : last / first;
}
