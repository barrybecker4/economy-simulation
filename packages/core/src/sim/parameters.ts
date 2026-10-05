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
  reserveRequirement: number;
  capitalRatio: number;
  timePrefMean: number;
  prodGrowth: number;
  categoryGrowth: CategoryProductivity;
  housingSupplyGrowth: number;
  housingWeight: number;
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
  ownership: number;
  autonomyEnd: number;
  frictionFiat: number;
  frictionBitcoin: number;
  ubiShare: number;
  shockFrequency: number;
  shockSize: number;
  householdCount: number;
  firmCount: number;
  bankCount: number;
  skillSigma: number;
  prefStd: number;
}

export function loadParameters(config: ResolvedConfig): Parameters {
  const regime = regimeOf(config);
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
    reserveRequirement: slider(config, 'bank.reserveRequirement'),
    capitalRatio: slider(config, 'bank.capitalRatio'),
    timePrefMean: slider(config, 'household.timePreferenceMean'),
    prodGrowth: slider(config, 'productivity.baseGrowth'),
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
    housingWeight: slider(config, 'welfare.housingSecurityWeight'),
    regime,
    unit: regime === 'fiat' ? 'cent' : 'satoshi',
    lendingModel: lendingModelOf(config),
    deflationSensitivity: slider(config, 'deflation.sensitivity'),
    autoStart: slider(config, 'ai.automatableShareStart'),
    autoEnd: slider(config, 'ai.automatableShareEnd'),
    adoptionMidpoint: slider(config, 'ai.adoptionMidpointYear'),
    adoptionSteepness: slider(config, 'ai.adoptionSteepness'),
    computeDecline: slider(config, 'ai.computeCostDeclineRate'),
    physicalShare: slider(config, 'ai.physicalTaskShare'),
    ownership: slider(config, 'ai.ownershipConcentration'),
    autonomyEnd: slider(config, 'ai.agentAutonomyShareEnd'),
    frictionFiat: slider(config, 'ai.paymentFrictionFiat'),
    frictionBitcoin: slider(config, 'ai.paymentFrictionBitcoin'),
    ubiShare: slider(config, 'government.ubiShare'),
    shockFrequency: slider(config, 'shock.frequency'),
    shockSize: slider(config, 'shock.size'),
    householdCount: Math.round(slider(config, 'scale.households')),
    firmCount: Math.round(slider(config, 'scale.firms')),
    bankCount: Math.round(slider(config, 'scale.banks')),
    skillSigma: slider(config, 'household.skillSigma'),
    prefStd: slider(config, 'household.timePreferenceStd'),
  };
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
