import { powerWeights, splitResidual } from './allocate.js';
import type { Economy } from './economy.js';
import { moneyAmount } from './helpers.js';
import {
  creditBitcoin,
  creditBitcoinLoan,
  foldBitcoinCash,
  foldBitcoinLoan,
  markBitcoinToMarket,
} from './dual-currency.js';
import {
  chargeEquityForDefault,
  clearBonds,
  setConsumerLoan,
  setDeposit,
  setFirmLoan,
  setMortgage,
} from './money.js';
import { stampRealMortgages } from './real-mortgage.js';
import type { Household } from './types.js';

/**
 * Fiat-to-bitcoin transition. With gradual weight 0, one-shot rebase at the end
 * of the window. With weight > 0, each month converts a slice of deposits and
 * debt into bitcoin units, and the regime flips on the last month.
 */
export function onTransition(economy: Economy): void {
  const length = economy.params.transitionLength;
  if (length <= 0 || economy.transitionDone) {
    return;
  }
  const gradual = economy.params.gradualTransition;
  if (gradual <= 0) {
    if (economy.tick < length - 1) {
      return;
    }
    applyDebtHaircut(economy, economy.params.debtHaircut);
    redistributeDeposits(economy, 1);
    finishTransition(economy);
    return;
  }
  if (economy.tick >= length) {
    return;
  }
  const step = gradual / length;
  const monthsLeft = Math.max(1, length - economy.tick);
  const fraction = Math.min(1, gradual / monthsLeft);
  redistributeDeposits(economy, step);
  convertDeposits(economy, fraction);
  convertDebts(economy, fraction);
  // Clean up any rounding errors from gradual conversion to maintain bank identity
  markBitcoinToMarket(economy);
  if (economy.tick >= length - 1) {
    finishTransition(economy);
  }
}

function finishTransition(economy: Economy): void {
  foldBitcoinBalances(economy);
  for (const bank of economy.banks) {
    clearBonds(bank);
  }
  economy.params.regime = 'bitcoin';
  economy.params.unit = 'satoshi';
  economy.params.bondPurchaseShare = 0;
  economy.transitionDone = true;
  stampRealMortgages(economy);
}

function convertDeposits(economy: Economy, fraction: number): void {
  if (fraction <= 0) {
    return;
  }
  const price = bitcoinPrice(economy);
  for (const household of economy.households) {
    moveDeposit(economy, household, fraction, price);
  }
  for (const firm of economy.firms) {
    moveDeposit(economy, firm, fraction, price);
  }
  for (const agent of economy.agents) {
    moveDeposit(economy, agent, fraction, price);
  }
  const treasurySlice = moneyAmount(economy, Math.max(0, economy.govDeposits) * fraction);
  if (treasurySlice > 0) {
    economy.govDeposits -= treasurySlice;
    creditBitcoin(economy, treasuryBitcoin(economy), treasurySlice / price);
  }
}

function convertDebts(economy: Economy, fraction: number): void {
  if (fraction <= 0) {
    return;
  }
  const price = bitcoinPrice(economy);
  const haircut = economy.params.debtHaircut;
  for (const firm of economy.firms) {
    const kept = convertClaim(
      economy,
      firm.loan,
      fraction,
      haircut,
      (next) => {
        setFirmLoan(firm, next);
      },
      economy.banks[firm.bank],
    );
    if (kept > 0) {
      creditBitcoinLoan(economy, firm, kept / price);
    }
  }
  for (const household of economy.households) {
    const mortgageKept = convertClaim(
      economy,
      household.mortgage,
      fraction,
      haircut,
      (next) => {
        setMortgage(household, next);
      },
      economy.banks[household.bank],
    );
    if (mortgageKept > 0) {
      creditBitcoinLoan(economy, mortgageBook(household), mortgageKept / price);
    }
    const consumerKept = convertClaim(
      economy,
      household.consumerLoan,
      fraction,
      haircut,
      (next) => {
        setConsumerLoan(household, next);
      },
      economy.banks[household.bank],
    );
    if (consumerKept > 0) {
      creditBitcoinLoan(economy, consumerBook(household), consumerKept / price);
    }
    if (household.mortgage <= 0 && household.bitcoinMortgage <= 0) {
      household.mortgagePayment = 0;
      household.mortgageIndexed = false;
      if (household.tenure === 'mortgage') {
        household.tenure = 'owned';
      }
    }
  }
}

/** Write off the haircut and return the value that becomes bitcoin debt. */
function convertClaim(
  economy: Economy,
  balance: number,
  fraction: number,
  haircut: number,
  write: (next: number) => void,
  bank: Economy['banks'][number] | undefined,
): number {
  const slice = moneyAmount(economy, Math.max(0, balance) * fraction);
  if (slice <= 0) {
    return 0;
  }
  const cut = moneyAmount(economy, slice * haircut);
  write(Math.max(0, balance - slice));
  if (cut > 0) {
    chargeEquityForDefault(bank, economy, cut);
  }
  return slice - cut;
}

function moveDeposit(
  economy: Economy,
  account: { deposit: number; bitcoin: number },
  fraction: number,
  price: number,
): void {
  const slice = moneyAmount(economy, Math.max(0, account.deposit) * fraction);
  if (slice <= 0) {
    return;
  }
  account.deposit -= slice;
  creditBitcoin(economy, account, slice / price);
}

function foldBitcoinBalances(economy: Economy): void {
  for (const household of economy.households) {
    foldBitcoinCash(economy, household);
    foldBitcoinLoan(
      economy,
      household.bitcoinMortgage,
      (value) => {
        household.mortgage += value;
      },
      () => {
        household.bitcoinMortgage = 0;
      },
    );
    foldBitcoinLoan(
      economy,
      household.bitcoinConsumer,
      (value) => {
        household.consumerLoan += value;
      },
      () => {
        household.bitcoinConsumer = 0;
      },
    );
  }
  for (const firm of economy.firms) {
    foldBitcoinCash(economy, firm);
    foldBitcoinLoan(
      economy,
      firm.bitcoinLoan,
      (value) => {
        firm.loan += value;
      },
      () => {
        firm.bitcoinLoan = 0;
      },
    );
  }
  for (const agent of economy.agents) {
    foldBitcoinCash(economy, agent);
  }
  const treasury = treasuryBitcoin(economy);
  foldBitcoinCash(economy, treasury);
}

function treasuryBitcoin(economy: Economy): { deposit: number; bitcoin: number } {
  return {
    get deposit() {
      return economy.govDeposits;
    },
    set deposit(value: number) {
      economy.govDeposits = value;
    },
    get bitcoin() {
      return economy.govBitcoin;
    },
    set bitcoin(value: number) {
      economy.govBitcoin = value;
    },
  };
}

function mortgageBook(household: Household): { bitcoinLoan: number } {
  return {
    get bitcoinLoan() {
      return household.bitcoinMortgage;
    },
    set bitcoinLoan(value: number) {
      household.bitcoinMortgage = value;
    },
  };
}

function consumerBook(household: Household): { bitcoinLoan: number } {
  return {
    get bitcoinLoan() {
      return household.bitcoinConsumer;
    },
    set bitcoinLoan(value: number) {
      household.bitcoinConsumer = value;
    },
  };
}

function bitcoinPrice(economy: Economy): number {
  return economy.bitcoinPrice > 0 ? economy.bitcoinPrice : 1e-12;
}

function applyDebtHaircut(economy: Economy, haircut: number): void {
  if (haircut <= 0) {
    return;
  }
  for (const firm of economy.firms) {
    const cut = moneyAmount(economy, firm.loan * haircut);
    if (cut <= 0) {
      continue;
    }
    setFirmLoan(firm, Math.max(0, firm.loan - cut));
    chargeEquityForDefault(economy.banks[firm.bank], economy, cut);
  }
  for (const household of economy.households) {
    const mortgageCut = moneyAmount(economy, household.mortgage * haircut);
    const consumerCut = moneyAmount(economy, household.consumerLoan * haircut);
    const cut = mortgageCut + consumerCut;
    setMortgage(household, Math.max(0, household.mortgage - mortgageCut));
    setConsumerLoan(household, Math.max(0, household.consumerLoan - consumerCut));
    if (cut > 0) {
      chargeEquityForDefault(economy.banks[household.bank], economy, cut);
    }
    if (household.mortgage <= 0) {
      household.mortgagePayment = 0;
      household.mortgageIndexed = false;
      if (household.tenure === 'mortgage') {
        household.tenure = 'owned';
      }
    }
  }
}

function redistributeDeposits(economy: Economy, weight: number): void {
  if (weight <= 0) {
    return;
  }
  const total = positiveDeposits(economy);
  if (total <= 0 || economy.households.length === 0) {
    return;
  }
  const weights = powerWeights(
    economy.households.map((household) => household.skill),
    1 + 4 * economy.params.holderConcentration,
  );
  const targetParts = splitResidual(total, weights);
  for (let index = 0; index < economy.households.length; index += 1) {
    const household = requireHousehold(economy, index);
    const target = roundedShare(economy, targetParts[index]);
    const next = household.deposit + (target - household.deposit) * weight;
    setDeposit(household, moneyAmount(economy, Math.max(0, next)));
  }
  // Seat residual on the last household so the stock is conserved after rounding.
  const after = positiveDeposits(economy);
  const last = requireHousehold(economy, economy.households.length - 1);
  setDeposit(last, last.deposit + (total - after));
}

function roundedShare(economy: Economy, share: number | undefined): number {
  if (share === undefined || !Number.isFinite(share)) {
    throw new Error('Deposit reassignment is missing a household share');
  }
  return moneyAmount(economy, share);
}

function requireHousehold(economy: Economy, index: number): Household {
  const household = economy.households[index];
  if (!household) {
    throw new Error('Deposit reassignment is missing a household');
  }
  return household;
}

function positiveDeposits(economy: Economy): number {
  return economy.households.reduce((sum, household) => sum + Math.max(0, household.deposit), 0);
}
