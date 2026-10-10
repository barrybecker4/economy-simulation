import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { runSimulation } from '../engine/engine.js';
import { World } from './world.js';
import { bankBalanceIdentity } from './stocks.js';

/**
 * Regression guard for bank identity residual in M bitcoin gradual transition.
 *
 * Before fix (commit 91fe2d7): external validation showed max per-phase bank
 * identity residual of 20.14 on seed 1 in the M bitcoin gradual transition.
 *
 * Root cause: updateMoneyChoice changes the bitcoin price, then later phases
 * use that new price. During gradual transition with choiceSpeed > 0, this
 * creates a mismatch between bitcoin-denominated balances (marked at old price)
 * and the current price.
 *
 * Fix: markBitcoinToMarket immediately after updateMoneyChoice in onCentralBank
 * (central-bank.ts) to remark deposits and loans at the new price.
 *
 * Result: max residual now ~5e-8 (was ~3776 without fix), confirmed by
 * independent validation at ~8e-9.
 */
describe('gradual transition bank identity', () => {
  it('keeps M preset bitcoin gradual transition bank residual below 1e-6 after centralBank phase', () => {
    // Load monetary preset
    const monetaryPreset = JSON.parse(
      readFileSync(
        join(
          fileURLToPath(new URL('.', import.meta.url)),
          '../../../../scenarios/presets/monetary.json',
        ),
        'utf8',
      ),
    ).sliders as Record<string, number | string>;

    // M preset with bitcoin gradual transition at validity scale
    const config = loadScenario({
      name: 'gradual-residual-guard',
      seed: 1,
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

    const world = new World(config, null);
    const economy = world.state();
    const handlers = world.handlers();

    let maxResidual = 0;

    // Wrap centralBank handler to check residual immediately after the phase
    const originalCentralBank = handlers.centralBank;
    handlers.centralBank = (ctx) => {
      if (originalCentralBank) {
        originalCentralBank(ctx);
      }
      // Check residual right after centralBank phase (where markBitcoinToMarket runs)
      const residual = Math.abs(bankBalanceIdentity(economy));
      if (residual > maxResidual) {
        maxResidual = residual;
      }
    };

    const result = runSimulation(config, handlers);

    expect(result.audit.ok).toBe(true);
    expect(maxResidual).toBeLessThan(1e-6);

    // With the fix: max residual ~5e-8
    // Without the fix (markBitcoinToMarket removed): max residual ~3776
    // The fix reduces the residual by a factor of ~75,000
  });
});
