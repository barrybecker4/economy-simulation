import type { ResolvedConfig } from '../config/load.js';
import type { CategoryProductivity } from './basket.js';

export type Regime = 'fiat' | 'bitcoin' | 'hybrid';
export type LendingModel = 'maturityMatched' | 'fullReserve';
export type MoneyUnit = 'cent' | 'satoshi';

export interface Parameters {
  alpha: number;
  markup: number;
  priceSpeed: number;
  rigidity: number;
  maxApplications: number;
  sampleSize: number;
  taxRate: number;
  spendShare: number;
  inflationTarget: number;
  inflationWeight: number;
  outputWeight: number;
  rateSmoothing: number;
  reserveRequirement: number;
  capitalRatio: number;
  endogenousWeight: number;
  leverageStart: number;
  householdMortgageShare: number;
  rateTransmission: number;
  endogenousProductivity: number;
  bequests: 'firstHousehold' | 'skillWeighted';
  bitcoinMarketPriceWeight: number;
  durableShare: number;
  gradualTransition: number;
  bondRate: number;
  timePrefMean: number;
  inflationTimePreference: number;
  anchorWeight: number;
  prodGrowth: number;
  popGrowth: number;
  computeProductivity: number;
  categoryGrowth: CategoryProductivity;
  housingSupplyGrowth: number;
  marketClearing: 'off' | 'on';
  monetaryPremium: number;
  regime: Regime;
  unit: MoneyUnit;
  lendingModel: LendingModel;
  deflationSensitivity: number;
  autoStart: number;
  autoEnd: number;
  adoptionMidpoint: number;
  adoptionSteepness: number;
  computeDecline: number;
  physicalShare: number;
  bullishness: number;
  roboticsStartYear: number;
  roboticsRampYears: number;
  ownership: number;
  ownerShareCeiling: number;
  agentsPerOwnerCeiling: number;
  frictionFiat: number;
  frictionBitcoin: number;
  marketDepth: number;
  ubiShare: number;
  treasuryBufferMonths: number;
  shockFrequency: number;
  shockSize: number;
  householdCount: number;
  firmCount: number;
  bankCount: number;
  skillSigma: number;
  openingDepositMonths: number;
  prefStd: number;
  realReturnSensitivity: number;
  trendWeight: number;
  wageElasticity: number;
  demandWeight: number;
  firmLevelHiring: 'off' | 'on';
  equityMarket: 'off' | 'on';
  tenureChoice: 'off' | 'on';
  housingAdjustment: number;
  openingOwnerShare: number;
  openingMortgageAmongOwners: number;
  mortgageTermYears: number;
  mortgageLtv: number;
  consumerCreditLimit: number;
  mortgageDefaultShare: number;
  investmentHurdle: 'off' | 'on';
  hurdlePremium: number;
  depositPassThrough: number;
  depositInterestSubsidy: number;
  resolution: 'off' | 'merge';
  depositHaircut: number;
  bondPurchaseShare: number;
  moneyGrowth: number;
  stimulus: number;
  stimulusLag: number;
  injectionChannel: 'proRataDeposits' | 'governmentSpending' | 'newLoans' | 'assetPurchase';
  spendNewMoney: number;
  stabilizer: number;
  transitionLength: number;
  debtHaircut: number;
  holderConcentration: number;
  choiceSpeed: number;
  stablecoinStart: number;
  cbdcStart: number;
  fiatLegalTender: number;
  bitcoinTrust: number;
}

export function loadParameters(config: ResolvedConfig): Parameters {
  const transitionLength = Math.round(slider(config, 'transition.lengthMonths'));
  const regime = transitionLength > 0 ? 'fiat' : regimeOf(config);
  return {
    alpha: slider(config, 'production.alpha'),
    markup: slider(config, 'firm.markup'),
    priceSpeed: slider(config, 'firm.priceAdjustSpeed'),
    rigidity: slider(config, 'wage.nominalRigidity'),
    maxApplications: Math.round(slider(config, 'labor.maxApplications')),
    sampleSize: Math.round(slider(config, 'goods.sampleSize')),
    taxRate: slider(config, 'tax.incomeRate'),
    spendShare: slider(config, 'government.spendingShareOfGDP'),
    inflationTarget: slider(config, 'centralBank.inflationTarget'),
    inflationWeight: slider(config, 'centralBank.inflationWeight'),
    outputWeight: slider(config, 'centralBank.outputWeight'),
    rateSmoothing: slider(config, 'centralBank.rateSmoothing'),
    reserveRequirement: slider(config, 'bank.reserveRequirement'),
    capitalRatio: slider(config, 'bank.capitalRatio'),
    endogenousWeight: slider(config, 'credit.endogenousWeight'),
    leverageStart: slider(config, 'credit.leverageStart'),
    householdMortgageShare: slider(config, 'credit.householdMortgageShare'),
    rateTransmission: slider(config, 'credit.rateTransmission'),
    endogenousProductivity: slider(config, 'productivity.endogenousWeight'),
    bequests: bequestsOf(config),
    bitcoinMarketPriceWeight: slider(config, 'bitcoin.marketPriceWeight'),
    durableShare: slider(config, 'household.durableShare'),
    gradualTransition: slider(config, 'transition.gradualWeight'),
    bondRate: slider(config, 'government.bondRate'),
    timePrefMean: slider(config, 'household.timePreferenceMean'),
    inflationTimePreference: slider(config, 'household.inflationTimePreference'),
    anchorWeight: slider(config, 'expectations.anchorWeight'),
    prodGrowth: slider(config, 'productivity.baseGrowth'),
    popGrowth: slider(config, 'population.growth'),
    computeProductivity: slider(config, 'ai.computeProductivity'),
    categoryGrowth: {
      food: slider(config, 'goods.foodProductivity'),
      energy: slider(config, 'goods.energyProductivity'),
      apparel: slider(config, 'goods.apparelProductivity'),
      transportation: slider(config, 'goods.transportProductivity'),
      medical: slider(config, 'goods.medicalProductivity'),
      education: slider(config, 'goods.educationProductivity'),
      recreation: slider(config, 'goods.recreationProductivity'),
      electronics: slider(config, 'goods.electronicsProductivity'),
    },
    housingSupplyGrowth: slider(config, 'goods.housingSupplyGrowth'),
    marketClearing: marketClearingOf(config),
    monetaryPremium: slider(config, 'housing.monetaryPremium'),
    regime,
    // Transition runs use satoshis from the start so the conversion can reassign
    // holdings without changing the ledger class mid-run.
    unit: transitionLength > 0 || regime !== 'fiat' ? 'satoshi' : 'cent',
    lendingModel: lendingModelOf(config),
    deflationSensitivity: slider(config, 'deflation.sensitivity'),
    autoStart: slider(config, 'ai.automatableShareStart'),
    autoEnd: slider(config, 'ai.automatableShareEnd'),
    adoptionMidpoint: slider(config, 'ai.adoptionMidpointYear'),
    adoptionSteepness: slider(config, 'ai.adoptionSteepness'),
    computeDecline: slider(config, 'ai.computeCostDeclineRate'),
    physicalShare: slider(config, 'ai.physicalTaskShare'),
    bullishness: slider(config, 'ai.bullishness'),
    roboticsStartYear: slider(config, 'ai.roboticsStartYear'),
    roboticsRampYears: slider(config, 'ai.roboticsRampYears'),
    ownership: slider(config, 'ai.ownershipConcentration'),
    ownerShareCeiling: slider(config, 'ai.ownerShareCeiling'),
    agentsPerOwnerCeiling: slider(config, 'ai.agentsPerOwnerCeiling'),
    frictionFiat: slider(config, 'ai.paymentFrictionFiat'),
    frictionBitcoin: slider(config, 'ai.paymentFrictionBitcoin'),
    marketDepth: slider(config, 'agent.marketDepth'),
    ubiShare: slider(config, 'government.ubiShare'),
    treasuryBufferMonths: slider(config, 'government.treasuryBufferMonths'),
    shockFrequency: slider(config, 'shock.frequency'),
    shockSize: slider(config, 'shock.size'),
    householdCount: Math.round(slider(config, 'scale.households')),
    firmCount: Math.round(slider(config, 'scale.firms')),
    bankCount: Math.round(slider(config, 'scale.banks')),
    skillSigma: slider(config, 'household.skillSigma'),
    openingDepositMonths: slider(config, 'household.openingDepositMonths'),
    prefStd: slider(config, 'household.timePreferenceStd'),
    realReturnSensitivity: slider(config, 'household.realReturnSensitivity'),
    trendWeight: slider(config, 'prices.trendWeight'),
    wageElasticity: slider(config, 'labor.wageElasticity'),
    demandWeight: slider(config, 'production.demandWeight'),
    firmLevelHiring: firmLevelHiringOf(config),
    equityMarket: equityMarketOf(config),
    tenureChoice: tenureChoiceOf(config),
    housingAdjustment: slider(config, 'housing.adjustmentRate'),
    openingOwnerShare: slider(config, 'housing.openingOwnerShare'),
    openingMortgageAmongOwners: slider(config, 'housing.openingMortgageShareOfOwners'),
    mortgageTermYears: slider(config, 'housing.mortgageTermYears'),
    mortgageLtv: slider(config, 'housing.mortgageLtv'),
    consumerCreditLimit: slider(config, 'housing.consumerCreditLimit'),
    mortgageDefaultShare: slider(config, 'housing.mortgageDefaultShare'),
    investmentHurdle: investmentHurdleOf(config),
    hurdlePremium: slider(config, 'firm.hurdlePremium'),
    depositPassThrough: slider(config, 'bank.depositPassThrough'),
    depositInterestSubsidy: slider(config, 'bank.depositInterestSubsidy'),
    resolution: resolutionOf(config),
    depositHaircut: slider(config, 'bank.depositHaircut'),
    bondPurchaseShare: slider(config, 'centralBank.bondPurchaseShare'),
    moneyGrowth: slider(config, 'centralBank.moneyGrowth'),
    stimulus: slider(config, 'centralBank.stimulus'),
    stimulusLag: Math.round(slider(config, 'centralBank.stimulusLag')),
    injectionChannel: injectionChannelOf(config),
    spendNewMoney: slider(config, 'centralBank.spendNewMoney'),
    stabilizer: slider(config, 'government.stabilizer'),
    transitionLength,
    debtHaircut: slider(config, 'transition.debtHaircut'),
    holderConcentration: slider(config, 'transition.holderConcentration'),
    choiceSpeed: slider(config, 'money.choiceSpeed'),
    stablecoinStart: slider(config, 'money.stablecoinStart'),
    cbdcStart: slider(config, 'money.cbdcStart'),
    fiatLegalTender: slider(config, 'money.fiatLegalTender'),
    bitcoinTrust: slider(config, 'money.bitcoinTrust'),
  };
}

export function equityMarketOf(config: ResolvedConfig): 'off' | 'on' {
  const value = config.sliders['equity.marketOn'];
  if (value === 'off' || value === 'on') {
    return value;
  }
  throw new Error('equity.marketOn must be off or on');
}

export function marketClearingOf(config: ResolvedConfig): 'off' | 'on' {
  const value = config.sliders['housing.marketClearing'];
  if (value === 'off' || value === 'on') {
    return value;
  }
  throw new Error('housing.marketClearing must be off or on');
}

export function firmLevelHiringOf(config: ResolvedConfig): 'off' | 'on' {
  const value = config.sliders['labor.firmLevelHiring'];
  if (value === 'off' || value === 'on') {
    return value;
  }
  throw new Error('labor.firmLevelHiring must be off or on');
}

export function tenureChoiceOf(config: ResolvedConfig): 'off' | 'on' {
  const value = config.sliders['housing.tenureChoice'];
  if (value === 'off' || value === 'on') {
    return value;
  }
  throw new Error('housing.tenureChoice must be off or on');
}

export function investmentHurdleOf(config: ResolvedConfig): 'off' | 'on' {
  const value = config.sliders['firm.investmentHurdle'];
  if (value === 'off' || value === 'on') {
    return value;
  }
  throw new Error('firm.investmentHurdle must be off or on');
}

export function resolutionOf(config: ResolvedConfig): 'off' | 'merge' {
  const value = config.sliders['bank.resolution'];
  if (value === 'off' || value === 'merge') {
    return value;
  }
  throw new Error('bank.resolution must be off or merge');
}

export function injectionChannelOf(
  config: ResolvedConfig,
): 'proRataDeposits' | 'governmentSpending' | 'newLoans' | 'assetPurchase' {
  const value = config.sliders['centralBank.injectionChannel'];
  if (
    value === 'proRataDeposits' ||
    value === 'governmentSpending' ||
    value === 'newLoans' ||
    value === 'assetPurchase'
  ) {
    return value;
  }
  throw new Error(
    'centralBank.injectionChannel must be proRataDeposits, governmentSpending, newLoans, or assetPurchase',
  );
}

export function bequestsOf(config: ResolvedConfig): 'firstHousehold' | 'skillWeighted' {
  const value = config.sliders['population.bequests'];
  if (value === 'firstHousehold' || value === 'skillWeighted') {
    return value;
  }
  throw new Error('population.bequests must be firstHousehold or skillWeighted');
}

export function regimeOf(config: ResolvedConfig): Regime {
  const value = config.sliders['regime.type'];
  if (value === 'fiat' || value === 'bitcoin' || value === 'hybrid') {
    return value;
  }
  throw new Error('regime.type must be fiat, bitcoin, or hybrid');
}

export function lendingModelOf(config: ResolvedConfig): LendingModel {
  const value = config.sliders['bitcoin.lendingModel'];
  if (value === 'maturityMatched' || value === 'fullReserve') {
    return value;
  }
  throw new Error('bitcoin.lendingModel must be maturityMatched or fullReserve');
}

export function slider(config: ResolvedConfig, id: string): number {
  const value = config.sliders[id];
  if (typeof value !== 'number') {
    throw new Error(`${id} must be a number`);
  }
  return value;
}
