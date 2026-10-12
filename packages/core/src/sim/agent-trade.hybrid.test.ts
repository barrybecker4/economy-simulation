import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { centIdentityGap } from './banking.js';
import { availableCash, creditBitcoin, debitBitcoin } from './dual-currency.js';
import type { Economy } from './economy.js';
import { FEATURE_OFF } from './feature-off.js';
import { syncHybridCustody } from './hybrid-money.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { tradeAgents } from './agent-trade.js';
import { bankBalanceIdentity } from './stocks.js';
import type { Firm } from './types.js';

describe('hybrid agent compute sales', () => {
  it('lets a coin-funded firm buy compute when pay currency is bitcoin', () => {
    const economy = opened();
    economy.agents.push({
      id: 0,
      owner: 0,
      deposit: 0,
      bitcoin: 0,
      income: 0,
      smoothed: 0,
      subagents: 1,
    });
    const agent = economy.agents[0];
    const firm = economy.firms[0];
    if (!agent || !firm) {
      throw new Error('missing agent or firm');
    }
    fundFirmCoinsOnly(economy, firm, 50_000);
    firm.payCurrency = 'bitcoin';
    expect(firm.deposit).toBe(0);
    expect(availableCash(economy, firm)).toBeGreaterThan(0);

    tradeAgents(economy);
    syncHybridCustody(economy);

    expect(agent.income).toBeGreaterThan(0);
    expect(economy.agentVolume).toBeGreaterThan(0);
    expect(Math.abs(bankBalanceIdentity(economy))).toBeLessThan(1e-4);
    expect(centIdentityGap(economy) <= 1n && centIdentityGap(economy) >= -1n).toBe(true);
  });
});

function opened(): Economy {
  const config = loadScenario({
    name: 'hybrid-agent-trade',
    seed: 3,
    ticks: 1,
    sliders: {
      ...FEATURE_OFF,
      'regime.type': 'hybrid',
      'scale.households': 40,
      'scale.firms': 4,
      'scale.banks': 1,
      'shock.frequency': 0,
      'ai.ownerShareCeiling': 0,
    },
  });
  return createEconomy(loadParameters(config), config.seed, null);
}

function fundFirmCoinsOnly(economy: Economy, firm: Firm, value: number): void {
  if (firm.bitcoin > 0) {
    debitBitcoin(economy, firm, firm.bitcoin);
  }
  firm.deposit = 0;
  const price = economy.bitcoinPrice;
  if (!(price > 0)) {
    throw new Error('bitcoin price must be positive');
  }
  creditBitcoin(economy, firm, value / price);
  syncHybridCustody(economy);
}
