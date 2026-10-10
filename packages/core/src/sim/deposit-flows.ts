import type { Economy } from './economy.js';

/** Signed deposit movers for one completed tick. */
export interface DepositFlowBuckets {
  fiatInjection: number;
  netCredit: number;
  interestRetained: number;
  writeDowns: number;
  reserveAccommodation: number;
}

/**
 * Decompose this tick's deposit movers from the economy's recorded flows.
 * Fiat injection and reserve accommodation are set in the central-bank step.
 * Net credit and interest use the credit and contract counters for the tick.
 */
export function depositFlowBuckets(economy: Economy): DepositFlowBuckets {
  return {
    fiatInjection: economy.fiatInjectionFlow,
    netCredit: economy.newBorrowing - economy.loanRepaid,
    interestRetained: economy.interestPaid - economy.depositInterestPaid,
    writeDowns: economy.defaultsThisTick,
    reserveAccommodation: economy.reserveAccommodationFlow,
  };
}

export function sumDepositFlows(buckets: readonly DepositFlowBuckets[]): DepositFlowBuckets {
  return buckets.reduce(
    (total, row) => ({
      fiatInjection: total.fiatInjection + row.fiatInjection,
      netCredit: total.netCredit + row.netCredit,
      interestRetained: total.interestRetained + row.interestRetained,
      writeDowns: total.writeDowns + row.writeDowns,
      reserveAccommodation: total.reserveAccommodation + row.reserveAccommodation,
    }),
    {
      fiatInjection: 0,
      netCredit: 0,
      interestRetained: 0,
      writeDowns: 0,
      reserveAccommodation: 0,
    },
  );
}
