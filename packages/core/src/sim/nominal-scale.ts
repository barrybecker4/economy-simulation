import { centIdentityGap } from './banking.js';
import type { Economy } from './economy.js';
import type { Bank } from './types.js';

/** Divide nominal fiat quantities by this much at each redenomination. */
const FACTOR = 1000;
/**
 * Internal cents or price index past which the next tick would threaten the
 * safe integer. 10^12 leaves three orders of magnitude before 2^53 − 1.
 */
const CEILING = 1e12;
const MAX_STEPS = 12;

/**
 * Divide nominal fiat quantities by 1,000, repeatedly, once a price or money
 * stock passes the ceiling. `nominalScale` records how many original cents one
 * internal unit stands for. Real ratios are unchanged. Bitcoin unit balances
 * stay put; their fiat price is divided with the other prices.
 */
export function rebaseNominal(economy: Economy): void {
  if (economy.params.unit !== 'cent') {
    return;
  }
  for (let step = 0; step < MAX_STEPS; step += 1) {
    if (!needsRebase(economy)) {
      return;
    }
    divideNominal(economy);
    economy.nominalScale *= FACTOR;
    seatRounding(economy);
  }
  if (needsRebase(economy)) {
    throw new Error('Fiat nominal scale could not be reduced');
  }
}

function needsRebase(economy: Economy): boolean {
  if (exceeds(economy.priceLevel) || exceeds(economy.wageLevel) || exceeds(economy.govDeposits)) {
    return true;
  }
  for (const household of economy.households) {
    if (exceeds(household.deposit) || exceeds(household.mortgage) || exceeds(household.income)) {
      return true;
    }
  }
  for (const firm of economy.firms) {
    if (exceeds(firm.deposit) || exceeds(firm.loan) || exceeds(firm.price) || exceeds(firm.wage)) {
      return true;
    }
  }
  for (const agent of economy.agents) {
    if (exceeds(agent.deposit) || exceeds(agent.income)) {
      return true;
    }
  }
  for (const bank of economy.banks) {
    if (
      exceeds(bank.bonds) ||
      exceeds(bank.reserves) ||
      exceeds(bank.vault) ||
      exceeds(bank.equity)
    ) {
      return true;
    }
  }
  return false;
}

function exceeds(value: number): boolean {
  return Math.abs(value) > CEILING;
}

function divideNominal(economy: Economy): void {
  economy.priceLevel = divide(economy.priceLevel);
  economy.wageLevel = divide(economy.wageLevel);
  economy.bitcoinPrice = divide(economy.bitcoinPrice);
  economy.stablecoinPrice = divide(economy.stablecoinPrice);
  economy.cbdcPrice = divide(economy.cbdcPrice);
  economy.realMortgagePrice = divide(economy.realMortgagePrice);
  economy.govDeposits = divideMoney(economy.govDeposits);
  economy.privateEquity = divideMoney(economy.privateEquity);
  economy.openingDeposits = divideMoney(economy.openingDeposits);
  economy.bitcoinCarried = divideMoney(economy.bitcoinCarried);
  economy.bitcoinLoanCarried = divideMoney(economy.bitcoinLoanCarried);
  economy.channelLoans = divideMoney(economy.channelLoans);
  economy.unmetGoodsDemand = divide(economy.unmetGoodsDemand);
  economy.demandBase = divide(economy.demandBase);
  economy.desiredSpend = divide(economy.desiredSpend);
  economy.consumptionSpend = divide(economy.consumptionSpend);
  economy.investmentSpend = divide(economy.investmentSpend);
  economy.agentVolume = divide(economy.agentVolume);
  economy.agentGoodsSpend = divide(economy.agentGoodsSpend);
  economy.agentFees = divide(economy.agentFees);
  economy.agentSweep = divide(economy.agentSweep);
  economy.wageBill = divide(economy.wageBill);
  economy.profitPaid = divide(economy.profitPaid);
  economy.govGoodsSpend = divide(economy.govGoodsSpend);
  economy.interestPaid = divide(economy.interestPaid);
  economy.newBorrowing = divide(economy.newBorrowing);
  economy.loanRepaid = divide(economy.loanRepaid);
  economy.taxRevenue = divide(economy.taxRevenue);
  economy.agentTaxRevenue = divide(economy.agentTaxRevenue);
  economy.ubiOutlay = divide(economy.ubiOutlay);
  economy.depositInterestPaid = divide(economy.depositInterestPaid);
  economy.reserveInterestPaid = divide(economy.reserveInterestPaid);
  economy.fiatInjectionFlow = divide(economy.fiatInjectionFlow);
  economy.reserveAccommodationFlow = divide(economy.reserveAccommodationFlow);
  economy.loanFinance = divide(economy.loanFinance);
  economy.profitSharingFinance = divide(economy.profitSharingFinance);
  economy.defaultsThisTick = divide(economy.defaultsThisTick);
  economy.zombieBudget = divide(economy.zombieBudget);
  divideAll(economy.priceHistory);
  divideAll(economy.creditHistory);
  economy.equityClaims = economy.equityClaims.map((claim) => divide(claim));
  for (const row of economy.depositFlowHistory) {
    row.fiatInjection = divide(row.fiatInjection);
    row.netCredit = divide(row.netCredit);
    row.interestRetained = divide(row.interestRetained);
    row.writeDowns = divide(row.writeDowns);
    row.reserveAccommodation = divide(row.reserveAccommodation);
  }
  for (const [bankId, interest] of economy.mortgageInterest) {
    economy.mortgageInterest.set(bankId, divideMoney(interest));
  }
  for (const household of economy.households) {
    household.deposit = divideMoney(household.deposit);
    household.income = divide(household.income);
    household.smoothed = divide(household.smoothed);
    household.consumption = divide(household.consumption);
    household.mortgage = divideMoney(household.mortgage);
    household.mortgagePayment = divideMoney(household.mortgagePayment);
    household.consumerLoan = divideMoney(household.consumerLoan);
  }
  for (const firm of economy.firms) {
    firm.price = divide(firm.price);
    firm.wage = divide(firm.wage);
    firm.deposit = divideMoney(firm.deposit);
    firm.loan = divideMoney(firm.loan);
  }
  for (const agent of economy.agents) {
    agent.deposit = divideMoney(agent.deposit);
    agent.income = divide(agent.income);
    agent.smoothed = divide(agent.smoothed);
  }
  for (const bank of economy.banks) {
    divideBank(bank);
  }
}

function divideBank(bank: Bank): void {
  const bonds = bank.bonds + Number(bank.bondsOver);
  bank.bonds = divideMoney(bonds);
  bank.bondsOver = 0n;
  bank.reserves = divideMoney(bank.reserves);
  bank.vault = divideMoney(bank.vault);
  bank.equity = divideMoney(bank.equity);
}

/** Put cent-rounding residue on the first bank's equity and the vault residual. */
function seatRounding(economy: Economy): void {
  const bank = economy.banks[0];
  if (bank === undefined) {
    return;
  }
  const gap = centIdentityGap(economy);
  if (gap !== 0n) {
    bank.equity += Number(gap);
  }
  let vault = 0;
  let equity = 0;
  for (const item of economy.banks) {
    vault += item.vault;
    equity += item.equity;
  }
  economy.privateEquity = vault - equity;
}

function divide(value: number): number {
  return value / FACTOR;
}

function divideMoney(value: number): number {
  return Math.round(value / FACTOR);
}

function divideAll(values: number[]): void {
  for (let index = 0; index < values.length; index += 1) {
    values[index] = divide(values[index] ?? 0);
  }
}
