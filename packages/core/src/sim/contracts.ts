import type { Economy } from './economy.js';
import { bankCreditRoom, mortgageCreditRoom } from './banking.js';
import { fundFromBitcoin } from './dual-currency.js';
import {
  chargeEquityForDefault,
  drawConsumerLoan,
  drawMortgage,
  payCashForHome,
  payMortgageInterest,
  repayConsumerLoan,
  repayMortgage,
  setMortgage,
} from './money.js';
import { deflationPenalty, expectedInflation, moneyAmount } from './helpers.js';
import { housingPriceFactors, updateHousingPressure } from './housing.js';
import { revalueRealMortgages } from './real-mortgage.js';
import { resolveInsolventBanks } from './resolution.js';
import {
  CONSUMER_LOAN_REPAY,
  LOAN_SPREAD,
  MONTHLY_RENT_RATE,
  MORTGAGE_ARREARS_MONTHS,
} from './rules.js';
import type { Household, Tenure } from './types.js';

/** Monthly rent as a share of the home price. */
export function monthlyRentCost(homePrice: number): number {
  return homePrice * MONTHLY_RENT_RATE;
}

/**
 * Monthly opportunity cost of owning outright: the home price times the real
 * loan rate, as a monthly flow.
 */
export function monthlyOwnedCost(homePrice: number, realLoanRate: number): number {
  return (homePrice * realLoanRate) / 12;
}

/** @deprecated Expected capital loss is no longer a separate tenure term. */
export function ownershipCapitalLoss(homePrice: number, expectedInflation: number): number {
  return (-expectedInflation * homePrice) / 12;
}

/** Level monthly payment on an amortizing mortgage. */
export function monthlyMortgagePayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  const months = Math.max(12, Math.round(termYears * 12));
  if (principal <= 0) {
    return 0;
  }
  const monthly = annualRate / 12;
  if (monthly <= 0) {
    return principal / months;
  }
  const growth = (1 + monthly) ** months;
  return (principal * monthly * growth) / (growth - 1);
}

/**
 * Longest mortgage term, up to the slider, at which the fixed nominal payment
 * stays inside the default share of current income. Zero means even a one-year
 * loan fails. Expected inflation enters buy-versus-rent through the real rate
 * only, not this affordability check.
 */
export function affordableMortgageTermYears(input: {
  principal: number;
  loanRate: number;
  income: number;
  defaultShare: number;
  expectedInflation?: number;
  maxTermYears: number;
}): number {
  if (input.principal <= 0 || input.income <= 0 || input.maxTermYears < 1) {
    return 0;
  }
  for (let term = Math.max(1, Math.round(input.maxTermYears)); term >= 1; term -= 1) {
    const payment = monthlyMortgagePayment(input.principal, input.loanRate, term);
    if (payment <= input.income * input.defaultShare) {
      return term;
    }
  }
  return 0;
}

/** @deprecated Prefer monthly user costs. Kept for phase 12 unit tests. */
export function expectedMortgageBurden(
  principal: number,
  expectedDeflation: number,
  termYears: number,
): number {
  return principal * (1 + expectedDeflation * termYears);
}

export function tenureFromBurdens(burdens: {
  rent: number;
  mortgage: number;
  owned: number;
}): Tenure {
  let best: Tenure = 'rent';
  let lowest = burdens.rent;
  if (burdens.mortgage < lowest) {
    best = 'mortgage';
    lowest = burdens.mortgage;
  }
  if (burdens.owned < lowest) {
    best = 'owned';
  }
  return best;
}

export function onContractChoice(economy: Economy): void {
  resolveInsolventBanks(economy);
  revalueRealMortgages(economy);
  economy.tenureChanges = 0;
  economy.rentToMortgage = 0;
  economy.mortgageToOwned = 0;
  economy.mortgageToRent = 0;
  economy.mortgageOriginations = 0;
  economy.newConsumerBorrowing = 0;
  economy.newBorrowing = 0;
  economy.loanRepaid = 0;
  economy.mortgageInterest = new Map();
  if (economy.params.tenureChoice === 'off') {
    updateHousingPressure(economy);
    return;
  }
  const penalty = deflationPenalty(economy);
  const inflation = expectedInflation(economy);
  const maxTermYears = economy.params.mortgageTermYears;
  const ltv = economy.params.mortgageLtv;
  const loanRate = economy.policyRate + LOAN_SPREAD;
  const realRate = loanRate - inflation;
  for (const household of economy.households) {
    const priorTenure = household.tenure;
    serviceDebts(economy, household);
    if (priorTenure === 'mortgage' && household.tenure === 'owned') {
      economy.mortgageToOwned += 1;
    } else if (priorTenure === 'mortgage' && household.tenure === 'rent') {
      economy.mortgageToRent += 1;
    }
    const income = Math.max(household.income, household.smoothed, 1);
    const homePrice = moneyAmount(economy, income * housingPriceFactors(economy).months);
    const downPayment = moneyAmount(economy, homePrice * (1 - ltv));
    const maxLoan = moneyAmount(economy, homePrice * ltv);
    const impatience = (homePrice * (household.timePref - economy.params.timePrefMean)) / 12;
    const rentBurden = monthlyRentCost(homePrice);
    const ownedBurden = monthlyOwnedCost(homePrice, realRate) + impatience;
    const termYears = affordableMortgageTermYears({
      principal: maxLoan,
      loanRate,
      income,
      defaultShare: economy.params.mortgageDefaultShare,
      maxTermYears,
    });
    // Burden uses the real loan rate once so deflation raises the cost of
    // buying now. Affordability and the booked payment use the contractual
    // nominal loan rate against current income. Impatience keeps the median
    // household near the rent-mortgage margin at the neutral rate.
    const mortgageBurden =
      termYears > 0
        ? monthlyMortgagePayment(maxLoan, realRate, termYears) +
          monthlyOwnedCost(downPayment, realRate) +
          impatience
        : Number.POSITIVE_INFINITY;
    const choice = tenureFromBurdens({
      rent: rentBurden,
      mortgage: mortgageBurden,
      owned: ownedBurden,
    });

    const considerPrepay =
      inflation < 0 && household.tenure === 'mortgage' && household.mortgage > 0;
    const adjusting = household.search.uniform() < economy.params.housingAdjustment;
    if (considerPrepay && (choice === 'rent' || choice === 'owned')) {
      fundFromBitcoin(economy, household, household.mortgage);
      if (household.deposit >= household.mortgage) {
        const payoff = household.mortgage;
        repayMortgage(household, payoff);
        economy.loanRepaid += payoff;
        household.mortgagePayment = 0;
        household.mortgageArrears = 0;
        household.mortgageIndexed = false;
        household.tenure = 'owned';
        economy.mortgageToOwned += 1;
        economy.tenureChanges += 1;
      }
    }

    if (!adjusting) {
      maybeBorrowConsumer(economy, household, income, penalty);
      continue;
    }

    if (household.tenure !== choice) {
      economy.tenureChanges += 1;
    }
    if (choice === 'owned' && household.tenure === 'mortgage' && household.mortgage <= 0) {
      household.mortgagePayment = 0;
      household.mortgageIndexed = false;
      household.tenure = 'owned';
      economy.mortgageToOwned += 1;
    } else if (
      choice === 'owned' &&
      household.tenure !== 'owned' &&
      household.tenure !== 'mortgage' &&
      homePrice > 0
    ) {
      // Check if household can afford home with deposit + bitcoin
      const bitcoinValue = household.bitcoin * economy.bitcoinPrice;
      const totalWealth = household.deposit + bitcoinValue;
      if (totalWealth >= homePrice) {
        fundFromBitcoin(economy, household, homePrice);
        payCashForHome(household, economy, homePrice);
        setMortgage(household, 0);
        household.mortgagePayment = 0;
        household.mortgageIndexed = false;
        household.tenure = 'owned';
      }
    } else if (
      (choice === 'mortgage' || choice === 'owned') &&
      household.tenure !== 'mortgage' &&
      household.tenure !== 'owned' &&
      termYears > 0
    ) {
      // Owned may win on user cost while cash is short; try a mortgage before rent.
      const room = mortgageCreditRoom(economy, household.bank);
      const principal = Math.min(maxLoan, Math.max(0, room));
      if (principal > 0 && household.deposit >= downPayment && downPayment >= 0) {
        if (downPayment > 0) {
          payCashForHome(household, economy, downPayment);
        }
        drawMortgage(household, economy, principal);
        household.mortgagePayment = moneyAmount(
          economy,
          monthlyMortgagePayment(principal, loanRate, termYears),
        );
        household.mortgageIndexed = false;
        household.tenure = 'mortgage';
        economy.newBorrowing += principal;
        economy.mortgageOriginations += 1;
        if (priorTenure === 'rent' || priorTenure === 'none' || priorTenure === undefined) {
          economy.rentToMortgage += 1;
        }
      } else {
        household.tenure = 'rent';
      }
    } else if (choice === 'rent' && household.tenure === 'mortgage' && household.mortgage <= 0) {
      household.tenure = 'rent';
      household.mortgagePayment = 0;
      household.mortgageIndexed = false;
    } else if (household.tenure === 'none' || household.tenure === undefined) {
      household.tenure = 'rent';
    }

    maybeBorrowConsumer(economy, household, income, penalty);
  }
  updateHousingPressure(economy);
}

function maybeBorrowConsumer(
  economy: Economy,
  household: Household,
  income: number,
  penalty: number,
): void {
  const creditCap = moneyAmount(economy, income * economy.params.consumerCreditLimit);
  const headroom = Math.max(0, creditCap - household.consumerLoan);
  const borrowFactor = Math.max(0, 1 - penalty) * rateTransmissionFactor(economy);
  // Consumer credit uses general firm room so mortgage draws do not invert the
  // deflation effect by freeing capital for more consumer loans.
  const room = bankCreditRoom(economy, household.bank);
  const borrowed = moneyAmount(economy, Math.min(headroom, Math.max(0, room)) * borrowFactor);
  if (borrowed > 0) {
    drawConsumerLoan(household, borrowed);
    economy.newConsumerBorrowing += borrowed;
    economy.newBorrowing += borrowed;
  }
}

function serviceDebts(economy: Economy, household: Household): void {
  if (household.mortgage > 0 && household.mortgagePayment > 0) {
    const due = Math.min(household.mortgage, household.mortgagePayment);
    fundFromBitcoin(economy, household, due);
    const pay = Math.min(due, household.deposit);
    const interestDue = Math.min(
      due,
      moneyAmount(economy, (household.mortgage * (economy.policyRate + LOAN_SPREAD)) / 12),
    );
    const interest = Math.min(pay, interestDue);
    const principal = pay - interest;
    const bank = economy.banks[household.bank];
    if (interest > 0 && bank) {
      payMortgageInterest(household, bank, economy, interest);
      economy.mortgageInterest.set(
        bank.id,
        (economy.mortgageInterest.get(bank.id) ?? 0) + interest,
      );
    }
    if (principal > 0) {
      repayMortgage(household, principal);
      economy.loanRepaid += principal;
    }
    if (pay + 1e-9 >= due) {
      household.mortgageArrears = 0;
    } else {
      household.mortgageArrears += 1;
    }
    if (household.mortgage <= 0) {
      setMortgage(household, 0);
      household.mortgagePayment = 0;
      household.mortgageArrears = 0;
      household.mortgageIndexed = false;
      household.tenure = 'owned';
    } else if (shouldForeclose(economy, household)) {
      forecloseMortgage(economy, household);
    }
  }
  if (household.consumerLoan > 0) {
    const cap = moneyAmount(economy, household.consumerLoan * CONSUMER_LOAN_REPAY);
    fundFromBitcoin(economy, household, Math.min(household.consumerLoan, cap));
    const pay = Math.min(household.consumerLoan, household.deposit, cap);
    if (pay > 0) {
      repayConsumerLoan(household, pay);
      economy.loanRepaid += pay;
    }
  }
}

function shouldForeclose(economy: Economy, household: Household): boolean {
  if (household.mortgageArrears < MORTGAGE_ARREARS_MONTHS) {
    return false;
  }
  const income = Math.max(household.income, household.smoothed, 1);
  return household.mortgagePayment > income * economy.params.mortgageDefaultShare;
}

function forecloseMortgage(economy: Economy, household: Household): void {
  const loss = household.mortgage;
  if (loss > 0) {
    chargeEquityForDefault(economy.banks[household.bank], economy, loss);
    economy.defaultsThisTick += loss;
  }
  setMortgage(household, 0);
  household.mortgagePayment = 0;
  household.mortgageArrears = 0;
  household.mortgageIndexed = false;
  household.tenure = 'rent';
}

/** max(0, 1 − transmission × max(0, policyRate − inflation)). */
export function rateTransmissionFactor(economy: Economy): number {
  const weight = economy.params.rateTransmission;
  if (weight <= 0) {
    return 1;
  }
  const realRate = Math.max(0, economy.policyRate - expectedInflation(economy));
  return Math.max(0, 1 - weight * realRate);
}
