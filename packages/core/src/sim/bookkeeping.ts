import type { TickContext } from '../engine/engine.js';
import { FAILURE_TICKS, INITIAL_WAGE, SHOCK_PHASE_MONTHS } from './rules.js';
import type { Economy } from './economy.js';
import type { Firm } from './types.js';
import { totalLoans } from './banking.js';
import { markBitcoinToMarket } from './dual-currency.js';
import { chargeEquityForDefault, resetFailedFirmAccounts } from './money.js';
import { resolveInsolventBanks } from './resolution.js';
import { postStocks } from './stocks.js';

export function onBookkeeping(economy: Economy, ctx: TickContext): void {
  markBitcoinToMarket(economy);
  postStocks(economy, ctx.ledger);
  // Catch losses booked after the pre-credit pass (for example write-offs).
  resolveInsolventBanks(economy);
  for (const firm of economy.firms) {
    const equity = firmEquity(economy, firm);
    firm.negTicks = equity < 0 ? firm.negTicks + 1 : 0;
    if (firm.negTicks >= FAILURE_TICKS) {
      const shortfall = Math.max(0, -equity);
      if (shortfall > 0 && economy.zombieBudget >= shortfall) {
        economy.zombieBudget -= shortfall;
      } else {
        replaceFirm(economy, firm);
      }
    }
  }
  // Unspent support is discarded; it is not a second payment.
  economy.zombieBudget = 0;
  trackCreditCycle(economy);
  const audit = ctx.ledger.audit();
  if (!audit.ok) {
    throw new Error(`Ledger audit failed at tick ${ctx.tick}: imbalance ${audit.imbalance}`);
  }
}

/** Firm equity used for the negative-equity replacement clock. */
export function firmEquity(economy: Economy, firm: Firm): number {
  const price = economy.bitcoinPrice;
  return (
    firm.deposit +
    firm.bitcoin * price +
    firm.capital * firm.price -
    firm.loan -
    firm.bitcoinLoan * price
  );
}

function replaceFirm(economy: Economy, firm: Firm): void {
  const bank = economy.banks[firm.bank];
  const bitcoinDebt = firm.bitcoinLoan * economy.bitcoinPrice;
  economy.bitcoinLoanCarried -= bitcoinDebt;
  firm.bitcoinLoan = 0;
  economy.defaultsThisTick += firm.loan + bitcoinDebt;
  chargeEquityForDefault(bank, economy, firm.loan + bitcoinDebt);
  // Keep the current workforce. Clearing them here made unemployment jump by
  // the whole firm for one month before the next labor step could rehire.
  resetFailedFirmAccounts(firm, bank, economy, INITIAL_WAGE);
  firm.capital = 1;
  firm.inventory = 1;
  firm.price = economy.priceLevel;
  firm.negTicks = 0;
  firm.productivity = 1;
}

function trackCreditCycle(economy: Economy): void {
  const credit = totalLoans(economy);
  economy.creditHistory.push(credit);
  if (!economy.sawBoom && economy.creditHistory.length > 30) {
    const recent = economy.creditHistory.slice(-24);
    const start = recent[0] ?? credit;
    const mid = recent[11] ?? credit;
    const end = recent[recent.length - 1] ?? credit;
    if (mid > start * 1.02 && end < mid) {
      economy.sawBoom = true;
      economy.boomLength = SHOCK_PHASE_MONTHS;
      economy.bustLength = SHOCK_PHASE_MONTHS;
    }
  }
}
