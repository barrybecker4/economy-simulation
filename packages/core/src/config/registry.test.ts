import { describe, expect, it } from 'vitest';
import { loadScenario } from './load.js';
import { listSliders } from './registry.js';

const EXPECTED_IDS = [
  'household.timePreferenceMean',
  'household.timePreferenceStd',
  'household.inflationTimePreference',
  'expectations.anchorWeight',
  'household.openingDepositMonths',
  'household.skillSigma',
  'household.realReturnSensitivity',
  'firm.markup',
  'firm.priceAdjustSpeed',
  'firm.investmentHurdle',
  'firm.hurdlePremium',
  'prices.trendWeight',
  'wage.nominalRigidity',
  'equity.marketOn',
  'productivity.baseGrowth',
  'population.growth',
  'shock.frequency',
  'shock.size',
  'tax.incomeRate',
  'government.spendingShareOfGDP',
  'government.ubiShare',
  'government.treasuryBufferMonths',
  'centralBank.inflationTarget',
  'centralBank.inflationWeight',
  'centralBank.outputWeight',
  'centralBank.rateSmoothing',
  'bank.reserveRequirement',
  'bank.capitalRatio',
  'bank.resolution',
  'bank.depositHaircut',
  'credit.endogenousWeight',
  'credit.leverageStart',
  'credit.householdMortgageShare',
  'credit.rateTransmission',
  'productivity.endogenousWeight',
  'population.bequests',
  'bitcoin.marketPriceWeight',
  'household.durableShare',
  'transition.gradualWeight',
  'bank.depositPassThrough',
  'bank.depositInterestSubsidy',
  'centralBank.bondPurchaseShare',
  'centralBank.moneyGrowth',
  'centralBank.injectionChannel',
  'centralBank.spendNewMoney',
  'government.stabilizer',
  'government.bondRate',
  'transition.lengthMonths',
  'transition.debtHaircut',
  'transition.holderConcentration',
  'regime.type',
  'bitcoin.lendingModel',
  'goods.electronicsProductivity',
  'goods.foodProductivity',
  'goods.housingSupplyGrowth',
  'housing.marketClearing',
  'goods.energyProductivity',
  'goods.apparelProductivity',
  'goods.transportProductivity',
  'goods.medicalProductivity',
  'goods.educationProductivity',
  'goods.recreationProductivity',
  'deflation.sensitivity',
  'housing.tenureChoice',
  'housing.adjustmentRate',
  'housing.openingOwnerShare',
  'housing.openingMortgageShareOfOwners',
  'housing.mortgageTermYears',
  'housing.mortgageLtv',
  'housing.consumerCreditLimit',
  'housing.mortgageDefaultShare',
  'ai.automatableShareStart',
  'ai.automatableShareEnd',
  'ai.adoptionMidpointYear',
  'ai.adoptionSteepness',
  'ai.computeCostDeclineRate',
  'ai.physicalTaskShare',
  'ai.bullishness',
  'ai.roboticsStartYear',
  'ai.roboticsRampYears',
  'ai.ownershipConcentration',
  'ai.ownerShareCeiling',
  'ai.agentsPerOwnerCeiling',
  'ai.computeProductivity',
  'ai.paymentFrictionFiat',
  'ai.paymentFrictionBitcoin',
  'agent.marketDepth',
  'scale.households',
  'scale.firms',
  'scale.banks',
  'labor.maxApplications',
  'labor.wageElasticity',
  'labor.firmLevelHiring',
  'production.alpha',
  'production.demandWeight',
  'goods.sampleSize',
  'money.choiceSpeed',
  'money.stablecoinStart',
  'money.cbdcStart',
  'money.fiatLegalTender',
  'money.bitcoinTrust',
];

describe('slider registry', () => {
  it('contains every planned slider exactly once', () => {
    const ids = listSliders().map((slider) => slider.id);
    expect(ids).toEqual(EXPECTED_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps each default inside its range', () => {
    for (const slider of listSliders()) {
      expect(['sourced', 'calibrated', 'guess']).toContain(slider.status);
      expect(slider.source.length).toBeGreaterThan(0);
      if (slider.kind === 'number') {
        expect(slider.default).toBeGreaterThanOrEqual(slider.min);
        expect(slider.default).toBeLessThanOrEqual(slider.max);
      } else {
        expect(slider.options).toContain(slider.default);
      }
    }
  });
});

describe('loadScenario', () => {
  it('merges defaults, the preset, and overrides', () => {
    const resolved = loadScenario(
      {
        name: 'preset',
        seed: 1,
        ticks: 10,
        sliders: { 'firm.markup': 0.3 },
      },
      { seed: 9, sliders: { 'firm.markup': 0.4, 'tax.incomeRate': 0.1 } },
    );
    expect(resolved.seed).toBe(9);
    expect(resolved.ticks).toBe(10);
    expect(resolved.sliders['firm.markup']).toBe(0.4);
    expect(resolved.sliders['tax.incomeRate']).toBe(0.1);
    expect(resolved.sliders['wage.nominalRigidity']).toBe(0.9);
    expect(resolved.sliders['regime.type']).toBe('fiat');
  });

  it('rejects an unknown slider, an out-of-range value, and a missing seed', () => {
    expect(() => loadScenario({ seed: 1, sliders: { 'not.a.slider': 1 } })).toThrow(
      /Unknown slider/,
    );
    expect(() => loadScenario({ seed: 1, sliders: { 'firm.markup': 0.9 } })).toThrow(/between/);
    expect(() => loadScenario({ ticks: 10 })).toThrow(/seed/);
    expect(() =>
      loadScenario({
        seed: 1,
        sliders: { 'ai.automatableShareStart': 0.5, 'ai.automatableShareEnd': 0.3 },
      }),
    ).toThrow(/automatableShareEnd/);
  });

  it('rejects ticks above MAX_TICKS through overrides', () => {
    expect(() => loadScenario({ seed: 1, ticks: 10 }, { ticks: 12_001 })).toThrow(/12_000|12000/);
  });
});
