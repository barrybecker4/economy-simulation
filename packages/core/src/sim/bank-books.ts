import { addBonds, equityFor, loansAt } from './banking.js';
import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { clamp } from './stats.js';

export function issueBonds(economy: Economy, amount: number): void {
  if (amount <= 0) {
    return;
  }
  const buyer = economy.banks[0];
  if (!buyer) {
    throw new Error('Bond issuance needs a bank');
  }
  const placed = bondPlacement(economy, amount);
  economy.govDeposits += amount;
  addBonds(buyer, placed.marketed);
  if (placed.monetized > 0) {
    buyer.reserves += placed.monetized;
  }
}

/**
 * Equity equals the capital target. Reserves fill the residual so bank books close:
 * loans + reserves + bonds + vault = deposits + equity, with vault equal to equity.
 */
export function capitalizeBanks(economy: Economy): void {
  if (economy.banks.length === 0) {
    throw new Error('Bank capitalization needs a bank');
  }
  for (const bank of economy.banks) {
    const loans = loansAt(economy, bank.id);
    const deposits = depositsAt(economy, bank.id);
    const equity = equityFor(economy, loans);
    bank.vault = equity;
    bank.equity = equity;
    bank.bonds = 0;
    bank.bondsOver = 0n;
    bank.reserves = moneyAmount(economy, Math.max(0, deposits - loans));
  }
  economy.privateEquity = 0;
}

function depositsAt(economy: Economy, bankId: number): number {
  let total = bankId === 0 ? economy.govDeposits : 0;
  for (const household of economy.households) {
    if (household.bank === bankId) {
      total += household.deposit;
    }
  }
  for (const firm of economy.firms) {
    if (firm.bank === bankId) {
      total += firm.deposit;
    }
  }
  for (const agent of economy.agents) {
    const owner = economy.households[agent.owner];
    if (owner && owner.bank === bankId) {
      total += agent.deposit;
    }
  }
  return total;
}

function bondPlacement(economy: Economy, amount: number): { monetized: number; marketed: number } {
  const purchaseShare =
    economy.params.regime === 'fiat' ? clamp(economy.params.bondPurchaseShare, 0, 1) : 0;
  const monetized = Math.min(amount, moneyAmount(economy, amount * purchaseShare));
  return { monetized, marketed: amount - monetized };
}
