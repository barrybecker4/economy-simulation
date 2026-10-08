import { moneyAmount } from './helpers.js';
import type { Economy } from './economy.js';
import type { Bank } from './types.js';

/**
 * Mark insolvent banks failed and, when resolution is merge, transfer their
 * books to a survivor or bail in depositors at a sole bank. Called before
 * contract choice and credit so a failed bank cannot lend the same tick.
 */
export function resolveInsolventBanks(economy: Economy): void {
  for (const bank of economy.banks) {
    if (bank.failed || bank.equity > 0) {
      continue;
    }
    // Hybrid lender of last resort injects in the central-bank step. Do not
    // mark those banks failed before that support runs.
    if (economy.params.regime === 'hybrid') {
      continue;
    }
    bank.failed = true;
    economy.cumulativeFailures += 1;
    if (economy.params.resolution === 'merge') {
      mergeOrBailIn(economy, bank);
    }
  }
}

function mergeOrBailIn(economy: Economy, failed: Bank): void {
  const survivor = economy.banks.find((bank) => bank.id !== failed.id && !bank.failed);
  if (survivor) {
    mergeInto(economy, failed, survivor);
    return;
  }
  bailIn(economy, failed);
}

function mergeInto(economy: Economy, failed: Bank, survivor: Bank): void {
  const haircut = clampHaircut(economy.params.depositHaircut);
  const movedOwners = new Set<number>();
  for (const household of economy.households) {
    if (household.bank !== failed.id) {
      continue;
    }
    writeDownDeposit(economy, failed, household, haircut);
    household.bank = survivor.id;
    movedOwners.add(household.id);
  }
  for (const firm of economy.firms) {
    if (firm.bank !== failed.id) {
      continue;
    }
    writeDownDeposit(economy, failed, firm, haircut);
    firm.bank = survivor.id;
  }
  for (const agent of economy.agents) {
    if (!movedOwners.has(agent.owner)) {
      continue;
    }
    writeDownDeposit(economy, failed, agent, haircut);
  }
  survivor.reserves += Math.max(0, failed.reserves);
  survivor.bonds += Math.max(0, failed.bonds);
  survivor.vault += Math.max(0, failed.vault);
  survivor.equity += failed.equity;
  failed.reserves = 0;
  failed.bonds = 0;
  failed.vault = 0;
  failed.equity = 0;
}

/**
 * Sole-bank resolution: write down deposits until equity is positive, then clear
 * the failed flag so the bank can operate again.
 */
function bailIn(economy: Economy, bank: Bank): void {
  const haircut = clampHaircut(economy.params.depositHaircut);
  const accounts = depositAccountsAt(economy, bank.id);
  for (const account of accounts) {
    writeDownDeposit(economy, bank, account, haircut);
  }
  const need = moneyAmount(economy, Math.max(0, 1 - bank.equity));
  const deposits = accounts.reduce((sum, account) => sum + Math.max(0, account.deposit), 0);
  if (need > 0 && deposits > 0) {
    let left = need;
    for (let index = 0; index < accounts.length; index += 1) {
      const account = accounts[index];
      if (!account || account.deposit <= 0 || left <= 0) {
        continue;
      }
      const cut =
        index === accounts.length - 1
          ? Math.min(account.deposit, left)
          : moneyAmount(economy, Math.min(account.deposit, (need * account.deposit) / deposits));
      account.deposit -= cut;
      bank.equity += cut;
      economy.privateEquity -= cut;
      left -= cut;
    }
  }
  if (bank.equity > 0) {
    bank.failed = false;
  }
}

function depositAccountsAt(economy: Economy, bankId: number): { deposit: number }[] {
  const accounts: { deposit: number }[] = [];
  for (const household of economy.households) {
    if (household.bank === bankId && household.deposit > 0) {
      accounts.push(household);
    }
  }
  for (const firm of economy.firms) {
    if (firm.bank === bankId && firm.deposit > 0) {
      accounts.push(firm);
    }
  }
  for (const agent of economy.agents) {
    const owner = economy.households[agent.owner];
    if (owner && owner.bank === bankId && agent.deposit > 0) {
      accounts.push(agent);
    }
  }
  return accounts;
}

function writeDownDeposit(
  economy: Economy,
  bank: Bank,
  account: { deposit: number },
  haircut: number,
): void {
  if (haircut <= 0 || account.deposit <= 0) {
    return;
  }
  const cut = moneyAmount(economy, account.deposit * haircut);
  if (cut <= 0) {
    return;
  }
  account.deposit -= cut;
  bank.equity += cut;
  economy.privateEquity -= cut;
}

function clampHaircut(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(0.2, value);
}
