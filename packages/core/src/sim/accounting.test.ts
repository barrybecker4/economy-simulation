import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { Ledger } from '../ledger/ledger.js';
import { createEconomy } from './init.js';
import { issueBonds } from './bank-books.js';
import { loadParameters } from './parameters.js';
import { ensureOpen, postStocks } from './stocks.js';
import { onGoods } from './goods.js';

describe('bond issuance', () => {
  it('refuses to issue bonds when there is no bank and leaves the treasury unchanged', () => {
    const economy = economyWith();
    economy.banks.splice(0, economy.banks.length);
    const treasury = economy.govDeposits;
    expect(() => issueBonds(economy, 100)).toThrow(/bank/i);
    expect(economy.govDeposits).toBe(treasury);
  });

  it('books a fiat purchase as new reserves and the rest as a bank bond', () => {
    const economy = economyWith();
    economy.params.regime = 'fiat';
    economy.params.unit = 'cent';
    economy.params.bondPurchaseShare = 0.25;
    const buyer = economy.banks[0];
    if (!buyer) {
      throw new Error('Missing bank');
    }
    const reserves = buyer.reserves;
    const treasury = economy.govDeposits;
    issueBonds(economy, 100);
    expect(economy.govDeposits).toBe(treasury + 100);
    expect(buyer.bonds).toBe(100);
    expect(buyer.reserves).toBe(reserves + 25);
  });
});

describe('stock journal', () => {
  it('rejects a private-equity residual that no longer matches vault cash', () => {
    const economy = economyWith();
    const ledger = new Ledger(economy.params.unit);
    ensureOpen(economy, ledger);
    economy.privateEquity += 1_000_000;
    expect(() => postStocks(economy, ledger)).toThrow(/Private equity/);
  });
});

describe('agent goods budget', () => {
  it('uses the household real-return rule', () => {
    const calm = agentSpend(0);
    const sharp = agentSpend(5);
    expect(sharp).toBeGreaterThan(0);
    expect(sharp).toBeLessThan(calm);
  });
});

function agentSpend(sensitivity: number): number {
  const economy = economyWith();
  for (const household of economy.households) {
    household.deposit = 0;
    household.smoothed = 0;
    household.income = 0;
  }
  economy.agents.push({ id: 0, owner: 0, deposit: 5_000, income: 100, smoothed: 100 });
  economy.params.realReturnSensitivity = sensitivity;
  economy.params.depositPassThrough = 1;
  economy.policyRate = 0.1;
  onGoods(economy);
  return economy.agentGoodsSpend;
}

function economyWith() {
  return createEconomy(
    loadParameters(
      loadScenario({
        name: 'accounting',
        seed: 1,
        ticks: 1,
        sliders: {
          'scale.households': 20,
          'scale.firms': 4,
          'scale.banks': 1,
          'shock.frequency': 0,
        },
      }),
    ),
    1,
    null,
  );
}
