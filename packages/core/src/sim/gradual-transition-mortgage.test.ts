import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { runSimulation } from '../engine/engine.js';
import { createEconomy } from './init.js';
import { drawMortgage } from './money.js';
import { loadParameters } from './parameters.js';
import { bankBalanceIdentity } from './stocks.js';
import { World } from './world.js';

/**
 * During a gradual transition a mortgage has a fiat leg and a converted bitcoin
 * leg. Foreclosure and payoff used to clear only the fiat leg, so the bitcoin
 * leg folded back later as mortgage debt on a renter or owner with no payment.
 * When such a renter took a new mortgage, drawMortgage overwrote the old
 * balance and the bank lost that loan without a write-off ("Bank books do not
 * close at tick 128" on seed 1).
 */
const monetaryPreset = JSON.parse(
  readFileSync(
    join(
      fileURLToPath(new URL('.', import.meta.url)),
      '../../../../scenarios/presets/monetary.json',
    ),
    'utf8',
  ),
).sliders as Record<string, number | string>;

function gradualConfig(seed: number) {
  return loadScenario({
    name: 'gradual-mortgage-legs',
    seed,
    ticks: 240,
    sliders: {
      ...monetaryPreset,
      'scale.households': 500,
      'scale.firms': 50,
      'scale.banks': 3,
      'shock.frequency': 0,
      'regime.type': 'bitcoin',
      'transition.lengthMonths': 12,
      'transition.gradualWeight': 1,
      'transition.debtHaircut': 0.5,
      'transition.holderConcentration': 0.5,
      'money.choiceSpeed': 0.13,
      'money.bitcoinTrust': 0.3,
    },
  });
}

describe('gradual transition mortgage legs', () => {
  it.each([1, 3])(
    'leaves no mortgage debt outside a mortgage tenure (seed %i)',
    async (seed) => {
      await new Promise((resolve) => setImmediate(resolve));
      const config = gradualConfig(seed);
      const world = new World(config, null);
      const economy = world.state();
      const handlers = world.handlers();
      const bookkeeping = handlers.bookkeeping;
      let detached = 0;
      handlers.bookkeeping = (ctx) => {
        bookkeeping?.(ctx);
        for (const household of economy.households) {
          if (
            household.tenure !== 'mortgage' &&
            (household.mortgage > 0 || household.bitcoinMortgage > 0)
          ) {
            detached += 1;
          }
        }
      };
      const result = runSimulation(config, handlers);
      expect(result.audit.ok).toBe(true);
      expect(detached).toBe(0);
    },
    60000,
  );

  it('adds a new mortgage to the loan book instead of replacing a balance', () => {
    const config = gradualConfig(1);
    const economy = createEconomy(loadParameters(config), config.seed, null);
    const household = economy.households.find((candidate) => candidate.mortgage > 0);
    if (!household) {
      throw new Error('expected a household with a mortgage');
    }
    const before = bankBalanceIdentity(economy);
    const prior = household.mortgage;
    expect(prior).toBeGreaterThan(0);
    drawMortgage(household, economy, 100);
    expect(household.mortgage).toBe(prior + 100);
    expect(bankBalanceIdentity(economy)).toBeCloseTo(before, 6);
  });
});
