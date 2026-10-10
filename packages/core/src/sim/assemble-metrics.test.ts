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
          mortgageOriginations: 1,
          rentToMortgage: 1,
          mortgageToOwned: 0,
          mortgageToRent: 0,
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

  it('records total real wealth as the non-negative wealth total over CPI', () => {
    const withPrice = recorded(
      snapshot({
        priceLevel: 2,
        wealth: {
          gini: 0.4,
          mean: 20,
          median: 10,
          topDecile: 0.5,
          bottomQuintile: 0.05,
          quintiles: [0.05, 0.1, 0.15, 0.2, 0.5],
          total: 100,
        },
        cashWealthTotal: 100,
        claimWealthTotal: 0,
      }),
    );
    expect(withPrice.get('totalRealWealth')).toBe(50);
    expect(withPrice.get('realCashWealth')).toBe(50);
    expect(withPrice.get('realClaimWealth')).toBe(0);
    expect(
      recorded(
        snapshot({
          priceLevel: 0,
          wealth: {
            gini: 0,
            mean: 0,
            median: 0,
            topDecile: 0,
            bottomQuintile: 0,
            quintiles: [0.2, 0.2, 0.2, 0.2, 0.2],
            total: 100,
          },
          cashWealthTotal: 60,
          claimWealthTotal: 40,
        }),
      ).get('totalRealWealth'),
    ).toBe(0);
  });

  it('divides cash and claim wealth by CPI so they partition total real wealth', () => {
    const values = recorded(
      snapshot({
        priceLevel: 2,
        wealth: {
          gini: 0.3,
          mean: 50,
          median: 40,
          topDecile: 0.4,
          bottomQuintile: 0.1,
          quintiles: [0.1, 0.15, 0.2, 0.25, 0.3],
          total: 100,
        },
        cashWealthTotal: 60,
        claimWealthTotal: 40,
      }),
    );
    expect(values.get('totalRealWealth')).toBe(50);
    expect(values.get('realCashWealth')).toBe(30);
    expect(values.get('realClaimWealth')).toBe(20);
    expect((values.get('realCashWealth') ?? 0) + (values.get('realClaimWealth') ?? 0)).toBe(
      values.get('totalRealWealth'),
    );
  });

  it('reports fiat levels in original cents after redenomination', () => {
    const values = recorded({
      ...snapshot({ priceLevel: 4, deposits: 7, inflation: 0.2, wageLevel: 2 }),
      nominalScale: 1000,
    });
    expect(values.get('priceLevel')).toBe(4000);
    expect(values.get('moneySupply')).toBe(7000);
    expect(values.get('inflation')).toBe(0.2);
    expect(values.get('realWage')).toBe(0.5);
  });
});

function snapshot(
  overrides: Partial<TestInput> & {
    wealth?: MetricSnapshot['wealth'];
    cashWealthTotal?: number;
    claimWealthTotal?: number;
  } = {},
): MetricSnapshot {
  const { wealth, cashWealthTotal, claimWealthTotal, ...rest } = overrides;
  const input = { ...defaults(), ...rest };
  const nominalOutput = input.priceLevel * input.realGdp;
  return {
    realGdp: input.realGdp,
    growth: 0,
    employed: input.employed,
    householdCount: input.householdCount,
    agentCount: input.agentCount,
    priceLevel: input.priceLevel,
    nominalScale: 1,
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
    homePriceMonths: input.homePriceMonths,
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
    wealth: wealth ?? dist(),
    cashWealthTotal: cashWealthTotal ?? wealth?.total ?? 0,
    claimWealthTotal: claimWealthTotal ?? 0,
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
  homePriceMonths: number;
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
    homePriceMonths: 48,
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
    total: 0,
  };
}
