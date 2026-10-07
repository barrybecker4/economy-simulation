import { describe, expect, it } from 'vitest';
import type { MetricId } from '../metrics/metrics.js';
import { assembleMetrics, type MetricSnapshot } from './assemble-metrics.js';

function recorded(snapshot: MetricSnapshot): Map<MetricId, number> {
  const values = new Map<MetricId, number>();
  assembleMetrics(snapshot, {
    set(id, value) {
      values.set(id, value);
    },
  });
  return values;
}

describe('assembleMetrics', () => {
  it('derives household goods spend from consumption minus agent goods', () => {
    const values = recorded(snapshot({ consumptionSpend: 40, agentGoodsSpend: 15 }));
    expect(values.get('householdGoodsSpend')).toBe(25);
    expect(
      recorded(snapshot({ consumptionSpend: 4, agentGoodsSpend: 10 })).get('householdGoodsSpend'),
    ).toBe(0);
  });

  it('uses tenure counts when tenure choice is on', () => {
    const values = recorded(
      snapshot({
        householdCount: 4,
        priceLevel: 2,
        realGdp: 30,
        tenure: {
          mortgageCount: 2,
          rentCount: 1,
          ownedCount: 1,
          tenureChanges: 1,
          consumerCredit: 48,
          medianDebtService: 0.2,
          newConsumerBorrowing: 3,
        },
      }),
    );
    expect(values.get('mortgageShare')).toBe(0.5);
    expect(values.get('rentShare')).toBe(0.25);
    expect(values.get('ownedShare')).toBe(0.25);
    expect(values.get('nonMortgageHousingShare')).toBe(0.5);
    expect(values.get('propertyTurnover')).toBe(0.25);
    expect(values.get('consumerCreditToGdp')).toBe(48 / (2 * 30 * 12));
    expect(values.get('medianDebtService')).toBe(0.2);
  });

  it('uses the deflation penalty when tenure choice is off', () => {
    const values = recorded(
      snapshot({
        inflation: -0.5,
        deflationSensitivity: 1,
        tick: 24,
        prodGrowth: 0,
        housingSupplyGrowth: 0,
      }),
    );
    expect(values.get('mortgageShare')).toBe(0);
    expect(values.get('rentShare')).toBe(0);
    expect(values.get('ownedShare')).toBe(0);
    expect(values.get('newConsumerBorrowing')).toBe(0);
    expect(values.get('medianDebtService')).toBe(0);
    expect(values.get('consumerCreditToGdp')).toBe(0);
    expect(values.get('nonMortgageHousingShare')).toBeCloseTo(0.25 + 0.6 * 0.5);
    expect(values.get('propertyTurnover')).toBeCloseTo(0.08 * 0.5);
  });

  it('records profit sharing, velocity, credit, and the AI output share', () => {
    const values = recorded(
      snapshot({
        inflation: 0,
        deflationSensitivity: 0,
        investmentHurdle: 'off',
        deposits: 100,
        consumptionSpend: 30,
        investmentSpend: 20,
        loans: 240,
        priceLevel: 2,
        realGdp: 10,
        aiFactor: 2,
        agentCount: 1,
        householdCount: 1,
      }),
    );
    expect(values.get('profitSharingShare')).toBeCloseTo(0.15);
    expect(values.get('velocity')).toBe(0.5);
    expect(values.get('creditToGdp')).toBe(240 / (20 * 12));
    expect(values.get('aiShareOfOutput')).toBe(0.5);
    expect(values.get('aiShareOfAgents')).toBe(0.5);
  });

  it('passes well-being through and divides wages by the price level', () => {
    const values = recorded(
      snapshot({
        priceLevel: 2,
        wageLevel: 10,
        housingSecurity: 0.4,
        wellbeingMean: 1.5,
        wellbeingMedian: 1.2,
      }),
    );
    expect(values.get('housingSecurity')).toBe(0.4);
    expect(values.get('meanWellbeing')).toBe(1.5);
    expect(values.get('medianWellbeing')).toBe(1.2);
    expect(values.get('realWage')).toBe(5);
    expect(recorded(snapshot({ priceLevel: 0, wageLevel: 10 })).get('realWage')).toBe(0);
  });
});

function snapshot(overrides: Partial<TestInput> = {}): MetricSnapshot {
  const input = { ...defaults(), ...overrides };
  const nominalOutput = input.priceLevel * input.realGdp;
  return {
    realGdp: input.realGdp,
    growth: 0,
    employed: input.employed,
    householdCount: input.householdCount,
    agentCount: input.agentCount,
    priceLevel: input.priceLevel,
    categories: {
      priceFood: 1,
      priceHousing: 1,
      priceEnergy: 1,
      priceApparel: 1,
      priceTransportation: 1,
      priceMedical: 1,
      priceEducation: 1,
      priceRecreation: 1,
      priceElectronics: 1,
      priceGeneral: 1,
    },
    housingSecurity: input.housingSecurity,
    inflation: input.inflation,
    interestRate: 0.02,
    deflationSensitivity: input.deflationSensitivity,
    deposits: input.deposits,
    reserves: 0,
    loans: input.loans,
    savings: input.deposits,
    tick: input.tick,
    prodGrowth: input.prodGrowth,
    housingSupplyGrowth: input.housingSupplyGrowth,
    tenureChoice: input.tenure === null ? 'off' : 'on',
    tenure: input.tenure,
    investmentHurdle: input.investmentHurdle,
    loanFinance: 0,
    profitSharingFinance: 0,
    consumptionSpend: input.consumptionSpend,
    investmentSpend: input.investmentSpend,
    agentGoodsSpend: input.agentGoodsSpend,
    govGoodsSpend: 0,
    agentVolume: 0,
    agentFees: 0,
    agentSweep: 0,
    interestPaid: 0,
    newBorrowing: 0,
    loanRepaid: 0,
    taxRevenue: 0,
    agentTaxRevenue: 0,
    ubiOutlay: 0,
    wageBill: 0,
    profitPaid: 0,
    wageLevel: input.wageLevel,
    demandImpulse: 0,
    creditImpulse: 0,
    productivityImpulse: 0,
    realInvestment: 0,
    defaultsThisTick: 0,
    cumulativeFailures: 0,
    boomLength: 0,
    bustLength: 0,
    fiatShare: 1,
    bitcoinShare: 0,
    stablecoinShare: 0,
    cbdcShare: 0,
    bitcoinPrice: 1,
    nominalOutput,
    income: dist(),
    wealth: dist(),
    skill: dist(),
    consumption: dist(),
    wellbeingMean: input.wellbeingMean,
    wellbeingMedian: input.wellbeingMedian,
    consumptionFloorShare: 0,
    jobs: { unemployed: 0, small: 0, large: 0 },
    ownerWealthShare: 0,
    aiShareOfWealth: 0,
    aiFactor: input.aiFactor,
    automatedShare: 0,
    naturalUnemployment: 0,
  };
}

interface TestInput {
  consumptionSpend: number;
  agentGoodsSpend: number;
  householdCount: number;
  agentCount: number;
  employed: number;
  priceLevel: number;
  realGdp: number;
  wageLevel: number;
  inflation: number;
  deflationSensitivity: number;
  tick: number;
  prodGrowth: number;
  housingSupplyGrowth: number;
  deposits: number;
  loans: number;
  investmentSpend: number;
  investmentHurdle: 'off' | 'on';
  housingSecurity: number;
  wellbeingMean: number;
  wellbeingMedian: number;
  aiFactor: number;
  tenure: MetricSnapshot['tenure'];
}

function defaults(): TestInput {
  return {
    consumptionSpend: 0,
    agentGoodsSpend: 0,
    householdCount: 1,
    agentCount: 0,
    employed: 1,
    priceLevel: 1,
    realGdp: 1,
    wageLevel: 1,
    inflation: 0,
    deflationSensitivity: 0,
    tick: 0,
    prodGrowth: 0,
    housingSupplyGrowth: 0,
    deposits: 1,
    loans: 0,
    investmentSpend: 0,
    investmentHurdle: 'off',
    housingSecurity: 0,
    wellbeingMean: 0,
    wellbeingMedian: 0,
    aiFactor: 1,
    tenure: null,
  };
}

function dist(): MetricSnapshot['income'] {
  return {
    gini: 0,
    mean: 0,
    median: 0,
    topDecile: 0,
    bottomQuintile: 0,
    quintiles: [0, 0, 0, 0, 0],
  };
}
