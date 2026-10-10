import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { TickContext } from '../engine/engine.js';
import { Ledger } from '../ledger/ledger.js';
import { MetricsRecorder } from '../metrics/metrics.js';
import { onBookkeeping } from './bookkeeping.js';
import { bankBalanceIdentity, ensureOpen } from './stocks.js';
import { onContractChoice } from './contracts.js';
import type { Economy } from './economy.js';
import { createEconomy } from './init.js';
import { setDeposit } from './money.js';
import { loadParameters } from './parameters.js';
import { revalueRealMortgages } from './real-mortgage.js';
import { onTransition } from './transition.js';
import type { Household } from './types.js';

const base = {
  'scale.households': 20,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
  'housing.tenureChoice': 'on',
  'housing.adjustmentRate': 0,
  'regime.type': 'bitcoin',
};

describe('phase 66 real mortgage at the rebase', () => {
  it('leaves principal, payment, equity, and deposits unchanged when the slider is off', () => {
    const economy = open({ ...base, 'transition.realMortgage': 'off' });
    const household = requireMortgagor(economy);
    placeIndexedMortgage(economy, household, 10_000, 100);
    const bank = requireBank(economy);
    const equity = bank.equity;
    const deposits = totalDeposits(economy);
    // Clear the indexed flag to simulate slider-off behavior
    household.mortgageIndexed = false;
    economy.priceLevel *= 0.9;
    revalueRealMortgages(economy);
    expect(household.mortgage).toBe(10_000);
    expect(household.mortgagePayment).toBe(100);
    expect(bank.equity).toBe(equity);
    expect(totalDeposits(economy)).toBe(deposits);
  });

  it('scales an indexed principal and payment by 0.9 when prices fall 10 percent', () => {
    const economy = open({ ...base, 'transition.realMortgage': 'on' });
    const household = requireMortgagor(economy);
    placeIndexedMortgage(economy, household, 10_000, 100);
    const bank = requireBank(economy);
    const equity = bank.equity;
    const deposits = totalDeposits(economy);
    const ratio = economy.params.capitalRatio;
    economy.priceLevel *= 0.9;
    revalueRealMortgages(economy);
    expect(household.mortgage).toBeCloseTo(9_000, 6);
    expect(household.mortgagePayment).toBeCloseTo(90, 6);
    const principalDelta = -1_000;
    expect(bank.equity).toBeCloseTo(equity + principalDelta * ratio, 6);
    expect(totalDeposits(economy)).toBeCloseTo(deposits + principalDelta * (1 - ratio), 4);
    expect(bank.failed).toBe(false);
    expect(bank.equity).toBeGreaterThan(0);
    auditOnce(economy);
  });

  it('scales an indexed claim up when prices rise', () => {
    const economy = open({ ...base, 'transition.realMortgage': 'on' });
    const household = requireMortgagor(economy);
    placeIndexedMortgage(economy, household, 10_000, 100);
    const bank = requireBank(economy);
    const equity = bank.equity;
    const deposits = totalDeposits(economy);
    const ratio = economy.params.capitalRatio;
    economy.priceLevel *= 1.1;
    revalueRealMortgages(economy);
    expect(household.mortgage).toBeCloseTo(11_000, 6);
    expect(household.mortgagePayment).toBeCloseTo(110, 6);
    const principalDelta = 1_000;
    expect(bank.equity).toBeCloseTo(equity + principalDelta * ratio, 6);
    expect(totalDeposits(economy)).toBeCloseTo(deposits + principalDelta * (1 - ratio), 4);
    auditOnce(economy);
  });

  it('keeps an indexed illiquid mortgagor out of foreclosure when prices and income fall', () => {
    const indexed = open({ ...base, 'transition.realMortgage': 'on' });
    const unindexed = open({ ...base, 'transition.realMortgage': 'off' });
    runArrearsPath(indexed, true);
    runArrearsPath(unindexed, false);
    const indexedBorrower = requireMortgagor(indexed);
    const unindexedBorrower = requireMortgagor(unindexed);
    expect(indexedBorrower.tenure).toBe('mortgage');
    expect(indexedBorrower.mortgage).toBeGreaterThan(0);
    expect(unindexedBorrower.tenure).toBe('rent');
    expect(unindexedBorrower.mortgage).toBe(0);
  });

  it('stamps only mortgages that exist at the flip', () => {
    const economy = open({
      ...base,
      'regime.type': 'fiat',
      'transition.lengthMonths': 1,
      'transition.gradualWeight': 0,
      'transition.debtHaircut': 0,
      'transition.realMortgage': 'on',
    });
    const inherited = requireMortgagor(economy);
    inherited.tenure = 'mortgage';
    inherited.mortgage = 8_000;
    inherited.mortgagePayment = 80;
    inherited.mortgageIndexed = false;
    const later = economy.households[1];
    if (!later) {
      throw new Error('Need a second household');
    }
    later.tenure = 'rent';
    later.mortgage = 0;
    later.mortgagePayment = 0;
    later.mortgageIndexed = false;
    economy.tick = 0;
    onTransition(economy);
    expect(economy.params.regime).toBe('bitcoin');
    expect(inherited.mortgageIndexed).toBe(true);
    expect(economy.realMortgagePrice).toBe(economy.priceLevel);

    later.tenure = 'mortgage';
    later.mortgage = 5_000;
    later.mortgagePayment = 50;
    later.mortgageIndexed = false;
    const inheritedBefore = inherited.mortgage;
    const laterBefore = later.mortgage;
    economy.priceLevel *= 0.8;
    revalueRealMortgages(economy);
    expect(inherited.mortgage).toBeCloseTo(inheritedBefore * 0.8, 6);
    expect(later.mortgage).toBe(laterBefore);
  });
});

function runArrearsPath(economy: Economy, indexClaim: boolean): void {
  for (const household of economy.households) {
    household.mortgage = 0;
    household.mortgagePayment = 0;
    household.mortgageIndexed = false;
    household.tenure = 'rent';
    household.mortgageArrears = 0;
  }
  const borrower = requireMortgagor(economy);
  const income = 1_000;
  borrower.tenure = 'mortgage';
  borrower.mortgage = 20_000;
  borrower.mortgagePayment = 350;
  borrower.income = income;
  borrower.smoothed = income;
  borrower.deposit = 0;
  borrower.bitcoin = 0;
  borrower.mortgageArrears = 0;
  if (indexClaim) {
    borrower.mortgageIndexed = true;
    economy.realMortgagePrice = economy.priceLevel;
  }
  economy.priceLevel *= 0.5;
  if (indexClaim) {
    revalueRealMortgages(economy);
  }
  borrower.income = income * 0.5;
  borrower.smoothed = income * 0.5;
  for (let month = 0; month < 3; month += 1) {
    onContractChoice(economy);
  }
}

function placeIndexedMortgage(
  economy: Economy,
  household: Household,
  principal: number,
  payment: number,
): void {
  household.tenure = 'mortgage';
  household.mortgage = principal;
  household.mortgagePayment = payment;
  household.mortgageIndexed = true;
  economy.realMortgagePrice = economy.priceLevel;
  closeBankBooks(economy, household);
}

/** Seat a manual loan edit on deposits so the stock identity still closes. */
function closeBankBooks(economy: Economy, household: Household): void {
  const gap = bankBalanceIdentity(economy);
  if (gap !== 0) {
    setDeposit(household, household.deposit + gap);
  }
}

function requireMortgagor(economy: Economy) {
  const household = economy.households[0];
  if (!household) {
    throw new Error('Missing household');
  }
  return household;
}

function requireBank(economy: Economy) {
  const bank = economy.banks[0];
  if (!bank) {
    throw new Error('Missing bank');
  }
  return bank;
}

function totalDeposits(economy: Economy): number {
  let total = economy.govDeposits;
  for (const household of economy.households) {
    total += household.deposit;
  }
  for (const firm of economy.firms) {
    total += firm.deposit;
  }
  for (const agent of economy.agents) {
    total += agent.deposit;
  }
  return total;
}

function open(sliders: Record<string, number | string>): Economy {
  const config = loadScenario({ name: 'phase66', seed: 2, ticks: 1, sliders });
  return createEconomy(loadParameters(config), config.seed, null);
}

function auditOnce(economy: Economy): void {
  const config = loadScenario({
    name: 'phase66-audit',
    seed: 2,
    ticks: 1,
    sliders: {
      'regime.type': 'bitcoin',
      'scale.households': 20,
      'scale.firms': 4,
      'scale.banks': 1,
    },
  });
  const ledger = new Ledger(economy.params.unit);
  const recorder = new MetricsRecorder();
  const ctx: TickContext = {
    tick: 0,
    config,
    rng: economy.shockRng,
    ledger,
    metrics: recorder,
    audit: null,
  };
  ensureOpen(economy, ledger);
  onBookkeeping(economy, ctx);
  expect(ledger.audit().ok).toBe(true);
}
