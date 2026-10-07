import type { Economy } from './economy.js';
import {
  drawConsumerLoan,
  drawMortgage,
  payCashForHome,
  repayConsumerLoan,
  repayMortgage,
  setMortgage,
} from './money.js';
import { bankCreditRoom } from './banking.js';
import { deflationPenalty, expectedInflation, moneyAmount } from './helpers.js';
import { updateHousingPressure } from './housing.js';
import { CONSUMER_LOAN_REPAY, HOME_PRICE_MONTHS, MONTHLY_RENT_RATE } from './rules.js';
import type { Household, Tenure } from './types.js';

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
  economy.tenureChanges = 0;
  economy.newConsumerBorrowing = 0;
  economy.newBorrowing = 0;
  economy.loanRepaid = 0;
  if (economy.params.tenureChoice === 'off') {
    updateHousingPressure(economy);
    return;
  }
  const penalty = deflationPenalty(economy);
  const expectedDeflation = Math.max(0, -expectedInflation(economy));
  const termYears = economy.params.mortgageTermYears;
  const termMonths = Math.max(12, Math.round(termYears * 12));
  const ltv = economy.params.mortgageLtv;
  for (const household of economy.households) {
    serviceDebts(economy, household);
    const income = Math.max(household.income, household.smoothed, 1);
    const scarcity = economy.params.marketClearing === 'on' ? economy.housingPressure : 1;
    const homePrice = moneyAmount(economy, income * HOME_PRICE_MONTHS * scarcity);
    const rentBurden = homePrice * MONTHLY_RENT_RATE * termMonths;
    const maxLoan = moneyAmount(economy, homePrice * ltv);
    const mortgageBurden = expectedMortgageBurden(maxLoan, expectedDeflation, termYears);
    const ownedBurden = homePrice;
    const choice = tenureFromBurdens({
      rent: rentBurden,
      mortgage: mortgageBurden,
      owned: ownedBurden,
    });
    if (household.tenure !== choice) {
      economy.tenureChanges += 1;
    }
    if (choice === 'owned' && household.tenure !== 'owned') {
      const price = Math.min(homePrice, household.deposit);
      if (price > 0 && household.deposit >= price) {
        payCashForHome(household, price);
        setMortgage(household, 0);
        household.mortgagePayment = 0;
        household.tenure = 'owned';
      } else {
        household.tenure = 'rent';
      }
    } else if (
      choice === 'mortgage' &&
      household.tenure !== 'mortgage' &&
      household.tenure !== 'owned'
    ) {
      const room = bankCreditRoom(economy, household.bank);
      const principal = Math.min(maxLoan, Math.max(0, room));
      if (principal > 0) {
        drawMortgage(household, principal);
        household.mortgagePayment = moneyAmount(economy, principal / termMonths);
        household.tenure = 'mortgage';
        economy.newBorrowing += principal;
      } else {
        household.tenure = 'rent';
      }
    } else if (choice === 'rent' && household.tenure === 'mortgage' && household.mortgage <= 0) {
      household.tenure = 'rent';
      household.mortgagePayment = 0;
    } else if (household.tenure === 'none' || household.tenure === undefined) {
      household.tenure = 'rent';
    }

    const creditCap = moneyAmount(economy, income * economy.params.consumerCreditLimit);
    const headroom = Math.max(0, creditCap - household.consumerLoan);
    const borrowFactor = Math.max(0, 1 - penalty);
    const room = bankCreditRoom(economy, household.bank);
    const borrowed = moneyAmount(economy, Math.min(headroom, Math.max(0, room)) * borrowFactor);
    if (borrowed > 0) {
      drawConsumerLoan(household, borrowed);
      economy.newConsumerBorrowing += borrowed;
      economy.newBorrowing += borrowed;
    }
  }
  updateHousingPressure(economy);
}

function serviceDebts(economy: Economy, household: Household): void {
  if (household.mortgage > 0 && household.mortgagePayment > 0) {
    const pay = Math.min(household.mortgage, household.mortgagePayment, household.deposit);
    if (pay > 0) {
      repayMortgage(household, pay);
      economy.loanRepaid += pay;
      if (household.mortgage <= 0) {
        setMortgage(household, 0);
        household.mortgagePayment = 0;
        household.tenure = 'owned';
      }
    }
  }
  if (household.consumerLoan > 0) {
    const pay = Math.min(
      household.consumerLoan,
      household.deposit,
      moneyAmount(economy, household.consumerLoan * CONSUMER_LOAN_REPAY),
    );
    if (pay > 0) {
      repayConsumerLoan(household, pay);
      economy.loanRepaid += pay;
    }
  }
}
