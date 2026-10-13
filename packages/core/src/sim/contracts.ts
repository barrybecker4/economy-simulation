import type { Economy } from './economy.js';
import { bankCreditRoom, mortgageCreditRoom } from './banking.js';
import { fundFromBitcoin } from './dual-currency.js';
import { fundCoinsFromFiat, raiseFiatFromCoins } from './hybrid-money.js';
import {
  chargeEquityForDefault,
  drawConsumerLoan,
  drawMortgage,
  hasMortgageDebt,
  payCashForHome,
  payMortgageInterest,
  repayBitcoinConsumer,
  repayBitcoinMortgage,
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
  const monthlyMobilityRate = economy.params.housingMobility / 12;
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

    // A payoff clears the fiat leg only, so wait until a converted bitcoin leg
    // has folded back into the mortgage.
    const considerPrepay =
      inflation < 0 &&
      household.tenure === 'mortgage' &&
      household.mortgage > 0 &&
      household.bitcoinMortgage <= 0;
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

    // Housing mobility: mortgage holders may refinance/move; this generates purchase originations.
    // At the real-world rate of ~9%/year, owners experience life events (job change, family change,
    // move to different city) that trigger a home sale and repurchase. Since the model doesn't track
    // individual homes or a resale market, we model this as: pay off existing mortgage (if any),
    // then immediately try to originate a new mortgage. This creates the steady flow of purchase
    // originations without needing to model the full housing market.
    const mobilityEvent =
      household.tenure === 'mortgage' &&
      hasMortgageDebt(household) &&
      household.search.uniform() < monthlyMobilityRate;
    if (mobilityEvent) {
      const totalDebt = household.mortgage + household.bitcoinMortgage * economy.bitcoinPrice;
      fundFromBitcoin(economy, household, totalDebt);
      if (household.deposit >= totalDebt) {
        // Pay off existing mortgage
        if (household.mortgage > 0) {
          const payoff = household.mortgage;
          repayMortgage(household, payoff);
          economy.loanRepaid += payoff;
        }
        if (household.bitcoinMortgage > 0) {
          const price = economy.bitcoinPrice > 0 ? economy.bitcoinPrice : 0;
          const coinValue = household.bitcoinMortgage * price;
          if (coinValue > 0) {
            repayBitcoinMortgage(economy, household, coinValue);
          }
        }
        household.mortgagePayment = 0;
        household.mortgageArrears = 0;
        household.mortgageIndexed = false;
        household.tenure = 'rent';
        
        // Immediately try to originate a new mortgage for the "move"
        if (termYears > 0) {
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
            economy.rentToMortgage += 1;
          }
        }
      }
      maybeBorrowConsumer(economy, household, income, penalty);
      continue;
    }

    if (!adjusting) {
      maybeBorrowConsumer(economy, household, income, penalty);
      continue;
    }

    if (household.tenure !== choice) {
      economy.tenureChanges += 1;
    }
    if (choice === 'owned' && household.tenure === 'mortgage' && !hasMortgageDebt(household)) {
      household.mortgagePayment = 0;
      household.mortgageIndexed = false;
      household.tenure = 'owned';
      economy.mortgageToOwned += 1;
    } else if (
      choice === 'owned' &&
      household.tenure !== 'owned' &&
      household.tenure !== 'mortgage' &&
      homePrice > 0 &&
      household.deposit + household.bitcoin * economy.bitcoinPrice >= homePrice
    ) {
      fundFromBitcoin(economy, household, homePrice);
      payCashForHome(household, economy, homePrice);
      setMortgage(household, 0);
      household.mortgagePayment = 0;
      household.mortgageIndexed = false;
      household.tenure = 'owned';
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
    } else if (
      choice === 'rent' &&
      household.tenure === 'mortgage' &&
      !hasMortgageDebt(household)
    ) {
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
  // Bitcoin originates no new consumer loans. Mortgages stay savings-capped;
  // existing consumer balances still repay through serviceDebts.
  if (economy.params.regime === 'bitcoin') {
    return;
  }
  const creditCap = moneyAmount(economy, income * economy.params.consumerCreditLimit);
  const headroom = Math.max(0, creditCap - household.consumerLoan);
  const borrowFactor = Math.max(0, 1 - penalty) * rateTransmissionFactor(economy);
  // Consumer credit uses general firm room so mortgage draws do not invert the
  // deflation effect by freeing capital for more consumer loans.
  const room = bankCreditRoom(economy, household.bank);
  const borrowed = moneyAmount(economy, Math.min(headroom, Math.max(0, room)) * borrowFactor);
  if (borrowed > 0) {
    drawConsumerLoan(household, borrowed, economy);
    economy.newConsumerBorrowing += borrowed;
    economy.newBorrowing += borrowed;
  }
}

function serviceDebts(economy: Economy, household: Household): void {
  if (economy.params.regime === 'hybrid') {
    serviceHybridDebts(economy, household);
    return;
  }
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
      // A converted bitcoin leg is still owed: keep the tenure and the payment
      // so the folded balance is serviced after the transition.
      if (!hasMortgageDebt(household)) {
        household.mortgagePayment = 0;
        household.mortgageArrears = 0;
        household.mortgageIndexed = false;
        household.tenure = 'owned';
      }
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

/** Hybrid services each debt in the currency it was issued in. */
function serviceHybridDebts(economy: Economy, household: Household): void {
  const price = economy.bitcoinPrice > 0 ? economy.bitcoinPrice : 0;
  const fiatPrincipal = Math.max(0, household.mortgage);
  const coinPrincipal = Math.max(0, household.bitcoinMortgage) * price;
  const mortgageValue = fiatPrincipal + coinPrincipal;
  if (mortgageValue > 0 && household.mortgagePayment > 0) {
    const due = Math.min(mortgageValue, household.mortgagePayment);
    const interestDue = Math.min(
      due,
      moneyAmount(economy, (mortgageValue * (economy.policyRate + LOAN_SPREAD)) / 12),
    );
    const coinShare = coinPrincipal / mortgageValue;
    const coinDue = Math.min(due, moneyAmount(economy, due * coinShare));
    const fiatDue = due - coinDue;
    const coinInterest = Math.min(coinDue, moneyAmount(economy, interestDue * coinShare));
    const fiatInterest = Math.min(fiatDue, interestDue - coinInterest);
    const coinPaid = payCoinMortgage(economy, household, coinDue, coinInterest);
    const fiatPaid = payFiatMortgage(economy, household, fiatDue, fiatInterest);
    const pay = coinPaid.interest + coinPaid.principal + fiatPaid.interest + fiatPaid.principal;
    economy.loanRepaid += coinPaid.principal + fiatPaid.principal;
    if (pay + 1e-9 >= due) {
      household.mortgageArrears = 0;
    } else {
      household.mortgageArrears += 1;
    }
    const remaining = household.mortgage + household.bitcoinMortgage * price;
    if (remaining <= 0) {
      setMortgage(household, 0);
      household.bitcoinMortgage = 0;
      household.mortgagePayment = 0;
      household.mortgageArrears = 0;
      household.mortgageIndexed = false;
      household.tenure = 'owned';
    } else if (shouldForeclose(economy, household)) {
      forecloseMortgage(economy, household);
    }
  }
  serviceHybridConsumer(economy, household, price);
}

function payCoinMortgage(
  economy: Economy,
  household: Household,
  budget: number,
  interestWant: number,
): { interest: number; principal: number } {
  const price = economy.bitcoinPrice;
  if (!(budget > 0) || !(price > 0) || household.bitcoinMortgage <= 0) {
    return { interest: 0, principal: 0 };
  }
  fundCoinsFromFiat(economy, household, budget);
  const payable = Math.min(budget, Math.max(0, household.bitcoin) * price);
  const interestTarget = Math.min(payable, interestWant);
  let interest = 0;
  if (interestTarget > 0) {
    const raised = raiseFiatFromCoins(economy, household, interestTarget);
    interest = Math.min(interestTarget, raised);
    bookMortgageInterest(economy, household, interest);
  }
  const principalWant = Math.min(payable - interest, Math.max(0, household.bitcoin) * price);
  const principal = principalWant > 0 ? repayBitcoinMortgage(economy, household, principalWant) : 0;
  return { interest, principal };
}

function payFiatMortgage(
  economy: Economy,
  household: Household,
  budget: number,
  interestWant: number,
): { interest: number; principal: number } {
  if (!(budget > 0) || household.mortgage <= 0) {
    return { interest: 0, principal: 0 };
  }
  fundFromBitcoin(economy, household, budget);
  const payable = Math.min(budget, Math.max(0, household.deposit));
  const interest = Math.min(payable, interestWant);
  bookMortgageInterest(economy, household, interest);
  const principal = Math.min(household.mortgage, Math.max(0, household.deposit), budget - interest);
  if (principal > 0) {
    repayMortgage(household, principal);
  }
  return { interest, principal };
}

function bookMortgageInterest(economy: Economy, household: Household, interest: number): void {
  const bank = economy.banks[household.bank];
  if (!(interest > 0) || !bank) {
    return;
  }
  payMortgageInterest(household, bank, economy, interest);
  economy.mortgageInterest.set(bank.id, (economy.mortgageInterest.get(bank.id) ?? 0) + interest);
}

function serviceHybridConsumer(economy: Economy, household: Household, price: number): void {
  const fiat = Math.max(0, household.consumerLoan);
  const coin = Math.max(0, household.bitcoinConsumer) * price;
  const value = fiat + coin;
  if (!(value > 0)) {
    return;
  }
  const due = Math.min(value, moneyAmount(economy, value * CONSUMER_LOAN_REPAY));
  if (!(due > 0)) {
    return;
  }
  const coinShare = coin / value;
  const coinDue = Math.min(due, moneyAmount(economy, due * coinShare));
  const fiatDue = due - coinDue;
  if (coinDue > 0 && price > 0 && household.bitcoinConsumer > 0) {
    fundCoinsFromFiat(economy, household, coinDue);
    const payable = Math.min(coinDue, Math.max(0, household.bitcoin) * price);
    economy.loanRepaid += repayBitcoinConsumer(economy, household, payable);
  }
  if (fiatDue > 0 && household.consumerLoan > 0) {
    fundFromBitcoin(economy, household, Math.min(fiatDue, household.consumerLoan));
    const paid = Math.min(fiatDue, household.consumerLoan, Math.max(0, household.deposit));
    if (paid > 0) {
      repayConsumerLoan(household, paid);
      economy.loanRepaid += paid;
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
  // Foreclosure ends the whole claim, including a leg converted to bitcoin
  // during a gradual transition. Gradual transition and hybrid coin mortgages
  // keep a slice on bitcoinMortgage. Write off both legs so debt cannot linger
  // on a renter. Under hybrid, only the fiat leg charges equity: the custody
  // plug absorbs the coin leg on sync.
  const price = economy.bitcoinPrice > 0 ? economy.bitcoinPrice : 0;
  const coinLoss = household.bitcoinMortgage * price;
  const fiatLoss = household.mortgage;
  const hybrid = economy.params.regime === 'hybrid';
  const equityLoss = hybrid ? fiatLoss : fiatLoss + coinLoss;
  if (equityLoss > 0) {
    chargeEquityForDefault(economy.banks[household.bank], economy, equityLoss);
  }
  if (fiatLoss + coinLoss > 0) {
    economy.defaultsThisTick += fiatLoss + coinLoss;
  }
  if (coinLoss > 0) {
    economy.bitcoinLoanCarried -= coinLoss;
    household.bitcoinMortgage = 0;
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
