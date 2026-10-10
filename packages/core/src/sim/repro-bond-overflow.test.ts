import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { composeCategoryOptions } from '../config/presets.js';
import { runSimulation } from '../engine/engine.js';
import type { Economy } from './economy.js';
import { World } from './world.js';

const baseChoices = {
  publicFinance: 'ai-dividend',
  aiBullishness: 'extreme',
};

describe('repro bond overflow', () => {
  it('samples the minimal spiral and ablations', () => {
    const lines = [
      path('minimal', {}),
      endState('no-coupon', { 'government.bondRate': 0 }),
      endState('no-monetize', { 'centralBank.bondPurchaseShare': 0 }),
      endState('slow-money', { 'centralBank.moneyGrowth': 0.05 }),
      endState('no-stimulus', { 'centralBank.stimulus': 0 }),
      endState('no-stabilizer', { 'government.stabilizer': 0 }),
      endState('ubi-025', { 'government.ubiShare': 0.25 }),
    ];
    console.log(lines.join('\n'));
    expect(lines[0]).toContain('minimal');
  }, 60_000);
});

function scenario(extra: Record<string, number | string>, ticks: number) {
  const sliders = {
    ...composeCategoryOptions(baseChoices),
    'regime.type': 'fiat',
    'scale.households': 200,
    'scale.firms': 10,
    'scale.banks': 1,
    ...extra,
  };
  return loadScenario({ name: 'probe', seed: 1, ticks, sliders });
}

function path(name: string, extra: Record<string, number | string>): string {
  const config = scenario(extra, 360);
  const world = new World(config);
  const samples: string[] = [];
  let prevBonds = 0;
  let prevPrice = 0;
  try {
    runSimulation(config, world.handlers(), (completed) => {
      if (completed % 40 !== 0) {
        const economy = world.state();
        prevBonds = economy.banks[0]?.bonds ?? 0;
        prevPrice = economy.priceLevel;
        return;
      }
      const economy = world.state();
      samples.push(row(name, economy, prevBonds, prevPrice));
      prevBonds = economy.banks[0]?.bonds ?? 0;
      prevPrice = economy.priceLevel;
    });
  } catch (error) {
    samples.push(`THREW ${error instanceof Error ? error.message : String(error)}`);
  }
  return samples.join('\n');
}

function endState(name: string, extra: Record<string, number | string>): string {
  const config = scenario(extra, 360);
  const world = new World(config);
  let thrown = '';
  try {
    runSimulation(config, world.handlers());
  } catch (error) {
    thrown = error instanceof Error ? error.message : String(error);
  }
  return row(name, world.state(), 0, 0) + (thrown ? ` thrown=${thrown}` : '');
}

function row(name: string, economy: Economy, prevBonds: number, prevPrice: number): string {
  const bonds = economy.banks[0]?.bonds ?? 0;
  const price = economy.priceLevel;
  const nominal = price * economy.realGdp;
  return JSON.stringify({
    name,
    tick: economy.tick,
    bonds,
    bondDelta: prevBonds === 0 ? null : bonds - prevBonds,
    reserves: economy.banks[0]?.reserves ?? 0,
    govDeposits: economy.govDeposits,
    price,
    priceRatio: prevPrice > 0 ? price / prevPrice : null,
    nominal,
    ubi: economy.ubiOutlay,
    tax: economy.taxRevenue,
    coupon: economy.interestPaid,
    injection: economy.fiatInjectionFlow,
    policy: economy.policyRate,
    ai: economy.aiFactor,
  });
}
