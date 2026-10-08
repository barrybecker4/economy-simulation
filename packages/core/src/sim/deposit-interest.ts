import { totalDeposits } from './banking.js';
import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import { payDepositInterest, subsidizeDepositInterest } from './money.js';

/**
 * Pay household deposit interest from this tick's asset income, not from the
 * capital buffer. Fiat banks also earn the policy rate on reserves and may
 * receive a deposit-interest subsidy; both creations draw on the steady-state
 * money-growth budget and are recorded so money growth can net them out.
 * Coupon that does not fit in that budget is not paid.
 */
export function payHouseholdDepositInterest(
  economy: Economy,
  borrowerInterestByBank: ReadonlyMap<number, number>,
): void {
  economy.depositInterestPaid = 0;
  economy.reserveInterestPaid = 0;
  economy.depositRate = economy.params.depositPassThrough * economy.policyRate;
  if (economy.depositRate <= 0) {
    economy.paidDepositRate = 0;
    return;
  }
  const monthly = economy.depositRate / 12;
  const dueByBank = new Map<number, number>();
  for (const household of economy.households) {
    const bank = economy.banks[household.bank];
    if (!bank || bank.failed || household.deposit <= 0) {
      continue;
    }
    const wanted = moneyAmount(economy, household.deposit * monthly);
    if (wanted > 0) {
      dueByBank.set(bank.id, (dueByBank.get(bank.id) ?? 0) + wanted);
    }
  }
  const roomByBank = new Map<number, number>();
  let reserveBudget = Math.max(
    0,
    moneyAmount(
      economy,
      (totalDeposits(economy) *
        economy.params.moneyGrowth *
        (economy.params.inflationTarget + economy.params.prodGrowth)) /
        12,
    ),
  );
  for (const bank of economy.banks) {
    if (bank.failed) {
      roomByBank.set(bank.id, 0);
      continue;
    }
    const due = dueByBank.get(bank.id) ?? 0;
    let room = Math.max(0, borrowerInterestByBank.get(bank.id) ?? 0);
    if (
      economy.params.regime === 'fiat' &&
      economy.policyRate > 0 &&
      bank.reserves > 0 &&
      reserveBudget > 0
    ) {
      const gap = Math.max(0, due - room);
      const reserveInterest = Math.min(
        gap,
        reserveBudget,
        moneyAmount(economy, (bank.reserves * economy.policyRate) / 12),
      );
      reserveBudget -= Math.max(0, reserveInterest);
      if (reserveInterest > 0) {
        subsidizeDepositInterest(bank, economy, reserveInterest);
        economy.reserveInterestPaid += reserveInterest;
        room += reserveInterest;
      }
    }
    const shortfall = Math.max(0, due - room);
    if (
      shortfall > 0 &&
      economy.params.regime === 'fiat' &&
      economy.params.depositInterestSubsidy > 0 &&
      reserveBudget > 0
    ) {
      const inject = Math.min(
        reserveBudget,
        moneyAmount(economy, shortfall * economy.params.depositInterestSubsidy),
      );
      if (inject > 0) {
        subsidizeDepositInterest(bank, economy, inject);
        economy.reserveInterestPaid += inject;
        reserveBudget -= inject;
        room += inject;
      }
    }
    roomByBank.set(bank.id, Math.min(room, Math.max(0, bank.equity)));
  }
  // Pay each bank's coupon so the credits sum to the room exactly. The last
  // household at that bank takes the residual and closes float drift on
  // satoshi books.
  for (const bank of economy.banks) {
    if (bank.failed) {
      continue;
    }
    const room = roomByBank.get(bank.id) ?? 0;
    if (room <= 0) {
      continue;
    }
    const holders = economy.households.filter(
      (household) => household.bank === bank.id && household.deposit > 0,
    );
    if (holders.length === 0) {
      continue;
    }
    const wants = holders.map((household) => moneyAmount(economy, household.deposit * monthly));
    const due = wants.reduce((sum, want) => sum + want, 0);
    const payTotal = Math.min(room, due);
    if (payTotal <= 0) {
      continue;
    }
    let paid = 0;
    const lastIndex = holders.reduce(
      (last, household, index) => ((wants[index] ?? 0) > 0 ? index : last),
      -1,
    );
    for (let index = 0; index < holders.length; index += 1) {
      const household = holders[index];
      const want = wants[index] ?? 0;
      if (!household || want <= 0) {
        continue;
      }
      const remaining = payTotal - paid;
      if (remaining <= 0) {
        break;
      }
      const interest =
        index === lastIndex
          ? remaining
          : Math.min(want, remaining, moneyAmount(economy, (want / due) * payTotal));
      if (interest <= 0) {
        continue;
      }
      payDepositInterest(bank, household, economy, interest);
      economy.depositInterestPaid += interest;
      paid += interest;
    }
  }
  const deposits = Math.max(1, totalDeposits(economy) - economy.depositInterestPaid);
  economy.paidDepositRate = deposits > 0 ? (economy.depositInterestPaid * 12) / deposits : 0;
}
