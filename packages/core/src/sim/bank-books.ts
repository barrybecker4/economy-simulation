import { equityFor, loansAt, totalDeposits } from './banking.js';
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
  buyer.bonds += placed.marketed + placed.monetized;
  if (placed.monetized > 0) {
    buyer.reserves += placed.monetized;
  }
}

export function capitalizeBanks(economy: Economy): void {
  if (economy.banks.length === 0) {
    throw new Error('Bank capitalization needs a bank');
  }
  const deposits = totalDeposits(economy);
  const each = deposits / economy.banks.length;
  for (const bank of economy.banks) {
    const equity = equityFor(economy, loansAt(economy, bank.id));
    bank.vault = equity;
    bank.equity = equity;
    bank.reserves = Math.round(economy.params.reserveRequirement * each);
  }
  economy.privateEquity = 0;
}

function bondPlacement(economy: Economy, amount: number): { monetized: number; marketed: number } {
  const purchaseShare =
    economy.params.regime === 'fiat' ? clamp(economy.params.bondPurchaseShare, 0, 1) : 0;
  const monetized = Math.min(amount, moneyAmount(economy, amount * purchaseShare));
  return { monetized, marketed: amount - monetized };
}
