import type { ResolvedConfig } from '../config/load.js';
import type { PhaseHandlers } from '../engine/engine.js';
import { onBookkeeping } from './bookkeeping.js';
import { onCentralBank } from './central-bank.js';
import { onContractChoice } from './contracts.js';
import { onCredit } from './credit.js';
import type { Economy } from './economy.js';
import { onGoods } from './goods.js';
import { onGovernment } from './government.js';
import { createEconomy } from './init.js';
import { onLabor } from './labor.js';
import { loadParameters } from './parameters.js';
import { onPopulation } from './population.js';
import { onProduction } from './production.js';
import { onShocks } from './shocks.js';
import { onTransition } from './transition.js';
import type { ForcedShock } from './types.js';
import { onWelfare } from './welfare.js';

/**
 * A stock-flow consistent single-good economy.
 * Later phases extend the same object; neutral settings leave this behavior in place.
 */
export class World {
  private readonly economy: Economy;

  constructor(config: ResolvedConfig, forcedShock: ForcedShock | null = null) {
    this.economy = createEconomy(loadParameters(config), config.seed, forcedShock);
  }

  handlers(): PhaseHandlers {
    const economy = this.economy;
    return {
      shocks: (ctx) => onShocks(economy, ctx),
      populationMix: () => onPopulation(economy),
      laborMarket: () => onLabor(economy),
      production: () => onProduction(economy),
      goodsAndAssets: () => onGoods(economy),
      contractChoice: () => onContractChoice(economy),
      credit: () => onCredit(economy),
      government: () => onGovernment(economy),
      centralBank: () => {
        onTransition(economy);
        onCentralBank(economy);
      },
      bookkeeping: (ctx) => onBookkeeping(economy, ctx),
      welfare: (ctx) => onWelfare(economy, ctx),
    };
  }
}
