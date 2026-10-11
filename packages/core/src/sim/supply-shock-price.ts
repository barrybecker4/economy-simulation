/**
 * Exogenous BTC/USD path from the Barry Becker supply-shock model.
 * https://barrybecker4.org/programming-projects/btc-price-model/
 *
 * Month 0 is October 2026. The recurrence runs for 300 months (25 years).
 * Later months compound the mean log change of months 240–300. Household
 * demand in this economy does not feed the path.
 */

import { cos, exp, log, sin } from '../math/elementary.js';

/** October 2026 as a fractional calendar year. */
const START_YEAR = 2026 + 9 / 12;
const HALVING_YEAR = 2028;
const HALVING_BOUNCE = 0.062;
const HALVING_DRAWDOWN = 0.262;
const LIQUID_FLOOR = 50_000;
const LIQUID_MIN_BEFORE_REBALANCE = 200_000;
const TAPER_SCALE = 12;
const MODEL_MONTHS = 300;
const EXTRAPOLATION_WINDOW = 60;

export const SUPPLY_SHOCK_HORIZON_MONTHS = MODEL_MONTHS;
export const SUPPLY_SHOCK_START_PRICE_USD = 85_000;

/** Published defaults with the screenshot overrides (3.1% inflation, 25 years). */
const PARAMS = {
  simYears: 25,
  startPrice: SUPPLY_SHOCK_START_PRICE_USD,
  inflation: 3.1,
  realGdpGrowth: 2,
  circulatingSupply: 20_000_000,
  alreadyLostCoins: 3_000_000,
  annualLossRate: 1,
  minerSellPct: 45,
  miningCostFloor: 65_000,
  strcInitialBtc: 815_000,
  strcInitialUsdB: 30,
  strcGrowthRate: 15,
  strcGrowthTaperYears: 10,
  otherInitialBtc: 370_000,
  otherTreasuryUsdB: 20,
  otherTreasuryGrowth: 5,
  otherTreasuryGrowthTaperYears: 12,
  etfInitialBtc: 1_600_000,
  etfDailyInflowM: 100,
  etfGrowthRate: 20,
  etfFlowVolatilityPct: 5,
  etfStressRedemptionCount: 1,
  etfOutflowShockPct: 2,
  etfGrowthTaperYears: 12,
  institutionalAllocationCapPct: 50,
  priceSensitiveDemandElasticity: 0.2,
  momentumDemandBoost: 1.25,
  momentumDecayMonths: 6,
  maxMomentumBoostPct: 75,
  randomSeed: 1,
  initialRetailPurchaseRateM: 20,
  organicBuyGrowth: 10,
  organicBuyGrowthTaperYears: 16,
  baseElasticity: 1.1,
  maxMonthlyPctGain: 30,
  initialAnnualVolatility: 40,
  volatilityReduction: 90,
  capBuyingToLiquidFloat: true,
  unmetDemandPriceStrength: 0.6,
  unmetPremiumMaxMonthlyPct: 8,
  halvingNarrativeAmp: 0.08,
  halvingImpactDecay: 0.88,
  lth155SharePct: 73,
  ancientSharePct: 17,
  flowLiquidToLth155Annual: 0.8,
  flowLiquidToAncientAnnual: 0.5,
  lthProfitDistributionAnnualPct: 2,
};

interface Params {
  simYears: number;
  startPrice: number;
  inflation: number;
  realGdpGrowth: number;
  circulatingSupply: number;
  alreadyLostCoins: number;
  annualLossRate: number;
  minerSellPct: number;
  miningCostFloor: number;
  strcInitialBtc: number;
  strcInitialUsdB: number;
  strcGrowthRate: number;
  strcGrowthTaperYears: number;
  otherInitialBtc: number;
  otherTreasuryUsdB: number;
  otherTreasuryGrowth: number;
  otherTreasuryGrowthTaperYears: number;
  etfInitialBtc: number;
  etfDailyInflowM: number;
  etfGrowthRate: number;
  etfFlowVolatilityPct: number;
  etfStressRedemptionCount: number;
  etfOutflowShockPct: number;
  etfGrowthTaperYears: number;
  institutionalAllocationCapPct: number;
  priceSensitiveDemandElasticity: number;
  momentumDemandBoost: number;
  momentumDecayMonths: number;
  maxMomentumBoostPct: number;
  randomSeed: number;
  initialRetailPurchaseRateM: number;
  organicBuyGrowth: number;
  organicBuyGrowthTaperYears: number;
  baseElasticity: number;
  maxMonthlyPctGain: number;
  initialAnnualVolatility: number;
  volatilityReduction: number;
  capBuyingToLiquidFloat: boolean;
  unmetDemandPriceStrength: number;
  unmetPremiumMaxMonthlyPct: number;
  halvingNarrativeAmp: number;
  halvingImpactDecay: number;
  lth155SharePct: number;
  ancientSharePct: number;
  flowLiquidToLth155Annual: number;
  flowLiquidToAncientAnnual: number;
  lthProfitDistributionAnnualPct: number;
}

interface Demand {
  strcBtc: number;
  otherBtc: number;
  etfBtc2: number;
  organicRetailNetBtcExecuted: number;
  retailBuyExecuted: number;
  retailSellExecuted: number;
  unmetDemandPremiumMonthly: number;
  coinsLost: number;
  minerSales: number;
}

interface PathCache {
  usd: number[];
  meanLog: number;
  floor: number;
}

let cache: PathCache | null = null;

/** BTC price in USD for simulation month `month` (0 = Oct 2026). */
export function supplyShockPriceUsd(month: number): number {
  const path = ensurePath();
  if (month <= MODEL_MONTHS) {
    return path.usd[month] ?? path.usd[MODEL_MONTHS] ?? PARAMS.startPrice;
  }
  const steps = month - MODEL_MONTHS;
  const base = path.usd[MODEL_MONTHS] ?? PARAMS.startPrice;
  return Math.max(base * exp(path.meanLog * steps), path.floor);
}

/** BTC price in ledger cents for simulation month `month`. */
export function supplyShockPriceCents(month: number): number {
  return supplyShockPriceUsd(month) * 100;
}

function ensurePath(): PathCache {
  if (cache) {
    return cache;
  }
  const usd = runModel(PARAMS);
  const start = usd[MODEL_MONTHS - EXTRAPOLATION_WINDOW] ?? PARAMS.startPrice;
  const end = usd[MODEL_MONTHS] ?? PARAMS.startPrice;
  const meanLog =
    EXTRAPOLATION_WINDOW > 0 && start > 0 ? log(end / start) / EXTRAPOLATION_WINDOW : 0;
  cache = { usd, meanLog, floor: PARAMS.miningCostFloor };
  return cache;
}

function runModel(params: Params): number[] {
  const totalMonths = params.simYears * 12;
  const lostCap = Math.min(params.alreadyLostCoins, params.circulatingSupply * 0.9);
  let price = params.startPrice;
  let lost = lostCap;
  let treasury = params.strcInitialBtc + params.otherInitialBtc;
  let etfBtc = params.etfInitialBtc;
  const free = Math.max(params.circulatingSupply - lost - treasury - etfBtc, 0);
  const split = splitHolders(free, params.lth155SharePct, params.ancientSharePct);
  const rebalanced = rebalanceLiquid(split.liquid, split.youngLth, split.ancientBtc, LIQUID_FLOOR);
  let liquid = rebalanced.liquid;
  let youngLth = rebalanced.youngLth;
  let ancientBtc = rebalanced.ancientBtc;
  const initLiq = liquid;
  if (!(initLiq > 0)) {
    throw new Error('supply-shock: initial liquid must be positive');
  }
  let strcUsd = (params.strcInitialUsdB * 1e9) / 12;
  let otherUsd = (params.otherTreasuryUsdB * 1e9) / 12;
  let etfUsd = params.etfDailyInflowM * 1e6 * 30;
  let retailUsd = params.initialRetailPurchaseRateM * 1e6 * 30;
  let retailHeld = 0;
  const priceHistory: number[] = [];
  let momentum = 0;
  const usd: number[] = [];

  for (let month = 0; month <= totalMonths; month += 1) {
    const year = START_YEAR + month / 12;
    const dailyMining = miningPerDay(year);
    const ma52 = trailingMean(priceHistory, 12);
    const demand = monthlyDemand({
      price,
      liquid,
      strcUsd,
      otherUsd,
      etfUsd,
      retailUsd,
      dailyMining,
      monthIndex: month,
      totalMonths,
      treasury,
      etfBtc,
      retailHeld,
      momentum,
      priceMa52w: ma52,
      params,
    });
    usd.push(nominalUsd(price, params.inflation, month));
    if (month === totalMonths) {
      break;
    }
    const netDemand =
      demand.strcBtc +
      demand.otherBtc +
      demand.etfBtc2 +
      demand.organicRetailNetBtcExecuted -
      demand.minerSales;
    const prior = price;
    price = nextPrice({
      price: prior,
      liquid,
      initLiq,
      netDemand,
      unmetDemandPremiumMonthly: demand.unmetDemandPremiumMonthly,
      year,
      monthIndex: month,
      totalMonths,
      params,
    });
    const ret = price / prior - 1;
    const alpha = 2 / (Math.max(1, params.momentumDecayMonths) + 1);
    momentum = momentum * (1 - alpha) + ret * alpha;
    priceHistory.push(price);
    liquid = Math.max(liquid - netDemand - demand.coinsLost, LIQUID_FLOOR);
    treasury += demand.strcBtc + demand.otherBtc;
    etfBtc = Math.max(0, etfBtc + demand.etfBtc2);
    lost += demand.coinsLost;
    retailHeld = Math.max(0, retailHeld + demand.retailBuyExecuted - demand.retailSellExecuted);
    const ma = trailingMean(priceHistory, 12) ?? params.startPrice;
    const holders = flowToLongTerm(liquid, youngLth, ancientBtc, params, price, ma);
    liquid = holders.liquid;
    youngLth = holders.youngLth;
    ancientBtc = holders.ancientBtc;
    const flows = growUsdFlows({
      strcUsd,
      otherUsd,
      etfUsd,
      retailUsd,
      monthIndex: month,
      params,
    });
    strcUsd = flows.strcUsd;
    otherUsd = flows.otherUsd;
    etfUsd = flows.etfUsd;
    retailUsd = flows.retailUsd;
  }
  return usd;
}

function nominalUsd(price: number, inflationPercent: number, monthIndex: number): number {
  const factor = monthIndex <= 0 ? 1 : (1 + inflationPercent / 100) ** (monthIndex / 12);
  return price * factor;
}

function miningPerDay(year: number): number {
  let reward = 3.125;
  for (let edge = HALVING_YEAR; year >= edge; edge += 4) {
    reward /= 2;
  }
  return 144 * reward;
}

function splitHolders(
  free: number,
  lthSharePct: number,
  ancientSharePct: number,
): { liquid: number; youngLth: number; ancientBtc: number } {
  const lthShare = Math.max(0.6, Math.min(0.8, lthSharePct / 100));
  const ancientShare = Math.max(0.15, Math.min(0.2, ancientSharePct / 100));
  let lthTotal = free * lthShare;
  let ancientBtc = Math.min(free * ancientShare, lthTotal);
  let youngLth = lthTotal - ancientBtc;
  let liquid = free - lthTotal;
  if (liquid < LIQUID_MIN_BEFORE_REBALANCE && free > LIQUID_MIN_BEFORE_REBALANCE) {
    const short = LIQUID_MIN_BEFORE_REBALANCE - liquid;
    lthTotal = Math.max(0, lthTotal - short);
    ancientBtc = Math.min(ancientBtc, lthTotal);
    youngLth = lthTotal - ancientBtc;
    liquid = free - lthTotal;
  }
  return { liquid, youngLth, ancientBtc };
}

function rebalanceLiquid(
  liquid: number,
  youngLth: number,
  ancientBtc: number,
  floor: number,
): { liquid: number; youngLth: number; ancientBtc: number } {
  let liq = liquid;
  let young = youngLth;
  let ancient = ancientBtc;
  if (liq >= floor) {
    return { liquid: liq, youngLth: young, ancientBtc: ancient };
  }
  let need = floor - liq;
  const fromYoung = Math.min(need, young);
  young -= fromYoung;
  liq += fromYoung;
  need = floor - liq;
  if (need > 0) {
    const fromAncient = Math.min(need, ancient);
    ancient -= fromAncient;
    liq += fromAncient;
  }
  return { liquid: liq, youngLth: young, ancientBtc: ancient };
}

function monthlyDemand(input: {
  price: number;
  liquid: number;
  strcUsd: number;
  otherUsd: number;
  etfUsd: number;
  retailUsd: number;
  dailyMining: number;
  monthIndex: number;
  totalMonths: number;
  treasury: number;
  etfBtc: number;
  retailHeld: number;
  momentum: number;
  priceMa52w: number | undefined;
  params: Params;
}): Demand {
  const { params } = input;
  const minerSales = input.dailyMining * 30 * (params.minerSellPct / 100);
  const coinsLost = input.liquid * (params.annualLossRate / 100 / 12);
  const elasticity = Math.max(0, params.priceSensitiveDemandElasticity);
  const ma =
    input.priceMa52w !== undefined && input.priceMa52w > 0
      ? input.priceMa52w
      : Math.max(1, params.startPrice);
  const priceScale =
    elasticity === 0 ? 1 : Math.min(1, ma / Math.max(input.price, 1)) ** elasticity;
  const momentumBoost = Math.max(0, input.momentum);
  const maxBoost = Math.max(0, params.maxMomentumBoostPct) / 100;
  const momentumScale =
    1 + Math.min(maxBoost, momentumBoost * Math.max(0, params.momentumDemandBoost));
  const demandScale = priceScale * momentumScale;
  const etfVol = monthlyVol(params.etfFlowVolatilityPct / 100);
  const etfNoise = clippedNormal(params.randomSeed + 17, input.monthIndex + 911, 3.5);
  const etfMult = Math.max(-2, 1 + etfNoise * etfVol);
  const stressMonths = etfStressMonths(input.totalMonths, params.etfStressRedemptionCount);
  const etfShock = stressMonths.includes(input.monthIndex)
    ? (input.etfBtc * Math.max(0, params.etfOutflowShockPct)) / 100
    : 0;
  const strcRaw = (input.strcUsd * demandScale) / input.price;
  const otherRaw = (input.otherUsd * demandScale) / input.price;
  const etfRaw = (input.etfUsd * demandScale * etfMult) / input.price - etfShock;
  const etfBuy = Math.max(0, etfRaw);
  const etfSell = Math.min(input.etfBtc, Math.max(0, -etfRaw));
  const retailRaw = (input.retailUsd * demandScale) / input.price;
  const retailBuy = Math.max(0, retailRaw);
  const retailSellWanted = Math.max(0, -retailRaw);
  const retailSell = Math.min(input.retailHeld, retailSellWanted);
  const capBtc =
    (params.circulatingSupply * Math.max(0, params.institutionalAllocationCapPct)) / 100;
  const room = Math.max(0, capBtc - input.treasury - input.etfBtc);
  const institutionalRaw = strcRaw + otherRaw + etfBuy;
  const instScale = institutionalRaw > 0 ? Math.min(1, room / institutionalRaw) : 1;
  const strcScaled = strcRaw * instScale;
  const otherScaled = otherRaw * instScale;
  const etfBuyScaled = etfBuy * instScale;
  const gross = strcScaled + otherScaled + etfBuyScaled + retailBuy;
  let buyScale = 1;
  if (params.capBuyingToLiquidFloat && gross > 0) {
    const roomLiq = input.liquid - LIQUID_FLOOR + minerSales + retailSell + etfSell - coinsLost;
    buyScale = roomLiq <= 0 ? 0 : Math.min(1, roomLiq / gross);
  }
  const strcBtc = strcScaled * buyScale;
  const otherBtc = otherScaled * buyScale;
  const etfBuyExec = etfBuyScaled * buyScale;
  const etfBtc2 = etfBuyExec - etfSell;
  const retailBuyExec = retailBuy * buyScale;
  const organicRetailNetBtcExecuted = retailBuyExec - retailSell;
  const executed = strcBtc + otherBtc + etfBuyExec + retailBuyExec;
  const unmet = gross - executed;
  const denom = Math.max(input.liquid, LIQUID_FLOOR);
  let unmetPremium = 0;
  if (params.capBuyingToLiquidFloat && unmet > 0) {
    const strength = params.unmetDemandPriceStrength;
    const maxPremium = params.unmetPremiumMaxMonthlyPct / 100;
    unmetPremium = Math.min((unmet / denom) * strength, maxPremium);
  }
  return {
    strcBtc,
    otherBtc,
    etfBtc2,
    organicRetailNetBtcExecuted,
    retailBuyExecuted: retailBuyExec,
    retailSellExecuted: retailSell,
    unmetDemandPremiumMonthly: unmetPremium,
    coinsLost,
    minerSales,
  };
}

function nextPrice(input: {
  price: number;
  liquid: number;
  initLiq: number;
  netDemand: number;
  unmetDemandPremiumMonthly: number;
  year: number;
  monthIndex: number;
  totalMonths: number;
  params: Params;
}): number {
  const { params } = input;
  if (!(input.initLiq > 0)) {
    return Math.max(input.price, params.miningCostFloor);
  }
  const thin = Math.max(input.liquid / input.initLiq, 0.03);
  const elasticity = params.baseElasticity / thin;
  const float = Math.max(input.liquid, LIQUID_FLOOR);
  const raw = (input.netDemand / float) * elasticity + input.unmetDemandPremiumMonthly;
  const narrative = halvingNarrative(
    input.year,
    params.halvingNarrativeAmp,
    params.halvingImpactDecay,
  );
  const maxGain = params.maxMonthlyPctGain / 100;
  let change = Math.max(-0.2, Math.min(raw, maxGain)) + narrative;
  const vol = monthlyVol(params.initialAnnualVolatility / 100);
  const fade = volatilityFade(
    params.volatilityReduction / 100,
    input.monthIndex,
    input.totalMonths,
  );
  change += clippedNormal(params.randomSeed, input.monthIndex, 2.5) * vol * fade;
  change = Math.max(-0.6, Math.min(change, maxGain));
  return Math.max(input.price * (1 + change), params.miningCostFloor);
}

function flowToLongTerm(
  liquid: number,
  youngLth: number,
  ancientBtc: number,
  params: Params,
  price: number,
  ma52: number,
): { liquid: number; youngLth: number; ancientBtc: number } {
  const flowYoung = params.flowLiquidToLth155Annual;
  const flowAncient = params.flowLiquidToAncientAnnual;
  let liq = liquid;
  let young = youngLth;
  let ancient = ancientBtc;
  let toYoung = flowYoung > 0 ? ((flowYoung / 100) * liq) / 12 : 0;
  let toAncient = flowAncient > 0 ? ((flowAncient / 100) * liq) / 12 : 0;
  const spare = Math.max(0, liq - LIQUID_FLOOR);
  const total = toYoung + toAncient;
  if (total > spare && total > 0) {
    const scale = spare / total;
    toYoung *= scale;
    toAncient *= scale;
  }
  liq -= toYoung + toAncient;
  young += toYoung;
  ancient += toAncient;
  if (flowYoung < 0) {
    const back = Math.min(young, ((Math.abs(flowYoung) / 100) * young) / 12);
    young -= back;
    liq += back;
  }
  if (flowAncient < 0) {
    const back = Math.min(ancient, ((Math.abs(flowAncient) / 100) * ancient) / 12);
    ancient -= back;
    liq += back;
  }
  const distribute = Math.max(0, params.lthProfitDistributionAnnualPct);
  const start = Math.max(1, params.startPrice);
  const ref = ma52 > 0 ? ma52 : start;
  const multiple = Math.max(0, price / ref);
  const intensity = multiple <= 1 ? 0 : Math.min(2, log(multiple) / log(3));
  if (distribute > 0 && intensity > 0) {
    const rate = (distribute / 100 / 12) * intensity;
    const fromYoung = Math.min(young, young * rate);
    const fromAncient = Math.min(ancient, ancient * rate);
    young -= fromYoung;
    ancient -= fromAncient;
    liq += fromYoung + fromAncient;
  }
  return {
    liquid: Math.max(liq, LIQUID_FLOOR),
    youngLth: Math.max(young, 0),
    ancientBtc: Math.max(ancient, 0),
  };
}

function growUsdFlows(input: {
  strcUsd: number;
  otherUsd: number;
  etfUsd: number;
  retailUsd: number;
  monthIndex: number;
  params: Params;
}): { strcUsd: number; otherUsd: number; etfUsd: number; retailUsd: number } {
  const { params } = input;
  const years = input.monthIndex / 12;
  const terminal = params.realGdpGrowth + params.inflation;
  const strcRate = taperedRate({
    start: params.strcGrowthRate,
    end: terminal,
    years,
    taperYears: params.strcGrowthTaperYears,
  });
  const otherRate = taperedRate({
    start: params.otherTreasuryGrowth,
    end: terminal,
    years,
    taperYears: params.otherTreasuryGrowthTaperYears,
  });
  const etfRate = taperedRate({
    start: params.etfGrowthRate,
    end: terminal,
    years,
    taperYears: params.etfGrowthTaperYears,
  });
  const retailRate = taperedRate({
    start: params.organicBuyGrowth,
    end: terminal,
    years,
    taperYears: params.organicBuyGrowthTaperYears,
  });
  return {
    strcUsd: input.strcUsd * monthlyGrowth(strcRate),
    otherUsd: input.otherUsd * monthlyGrowth(otherRate),
    etfUsd: input.etfUsd * monthlyGrowth(etfRate),
    retailUsd: input.retailUsd * monthlyGrowth(retailRate),
  };
}

function taperedRate(input: {
  start: number;
  end: number;
  years: number;
  taperYears: number;
}): number {
  const horizon = input.taperYears;
  if (!(horizon >= 1)) {
    return input.start;
  }
  if (input.years <= 0) {
    return input.start;
  }
  if (input.years >= horizon) {
    return input.end;
  }
  const progress = softStep(Math.min(input.years / horizon, 1), taperSteepness(horizon));
  return input.end + (input.start - input.end) * progress;
}

function taperSteepness(taperYears: number): number {
  return (TAPER_SCALE * 12) / Math.max(taperYears, 1);
}

function softStep(x: number, steepness: number): number {
  const z = steepness * (Math.min(Math.max(x, 0), 1) - 0.5);
  if (z > 0) {
    const e = exp(-z);
    return e / (1 + e);
  }
  return 1 / (1 + exp(z));
}

function monthlyGrowth(annualPercent: number): number {
  return 1 + annualPercent / 100 / 12;
}

function halvingNarrative(year: number, amp: number, decay: number): number {
  if (!(amp > 0)) {
    return 0;
  }
  const strength = Math.max(0, Math.min(1, amp));
  const fade = decay == null || !Number.isFinite(decay) ? 1 : Math.max(0, Math.min(1, decay));
  const since = year - HALVING_YEAR;
  const epochs = since >= 0 ? Math.floor(since / 4) : 0;
  const phase = ((((since % 4) + 4) % 4) / 4) * 2 * Math.PI;
  const wave = sin(phase);
  const up = Math.max(0, wave);
  const down = Math.max(0, -wave);
  return strength * fade ** epochs * (HALVING_BOUNCE * up - HALVING_DRAWDOWN * down);
}

function etfStressMonths(totalMonths: number, count: number): number[] {
  const n = Math.max(0, Math.min(3, Math.round(count)));
  const span = Math.max(0, totalMonths);
  if (n === 0 || span <= 1) {
    return [];
  }
  const last = span - 1;
  const take = Math.min(n, last);
  if (take === 0) {
    return [];
  }
  if (take === 1) {
    return [Math.max(1, Math.min(last, Math.round(span / 2)))];
  }
  const months: number[] = [];
  for (let i = 0; i < take; i += 1) {
    months.push(Math.max(1, Math.min(last, Math.round(((i + 1) * span) / (take + 1)))));
  }
  months.sort((a, b) => a - b);
  for (let i = 1; i < months.length; i += 1) {
    const prev = months[i - 1] ?? 0;
    const cur = months[i] ?? 0;
    if (cur <= prev) {
      months[i] = Math.min(last, prev + 1);
    }
  }
  return months;
}

function monthlyVol(annual: number): number {
  if (!Number.isFinite(annual) || annual <= 0) {
    return 0;
  }
  return annual / Math.sqrt(12);
}

function volatilityFade(reduction: number, monthIndex: number, totalMonths: number): number {
  const r = Number.isFinite(reduction) ? Math.max(0, Math.min(1, reduction)) : 0;
  const denom = totalMonths <= 1 ? 1 : totalMonths - 1;
  return 1 - r * (totalMonths <= 1 ? 1 : monthIndex / denom);
}

function clippedNormal(seed: number, index: number, clip: number): number {
  const bound = Math.max(0, clip);
  return Math.max(-bound, Math.min(bound, boxMuller(seed, index)));
}

function boxMuller(seed: number, index: number): number {
  const u1 = Math.max(Number.MIN_VALUE, unit(seed, index * 2 + 1013904223));
  const u2 = unit(seed, index * 2 + 362437);
  return Math.sqrt(-2 * log(u1)) * cos(2 * Math.PI * u2);
}

function unit(seed: number, salt: number): number {
  let n = ((seed | 0) ^ (salt | 0)) >>> 0;
  n ^= n >>> 16;
  n = Math.imul(n, 2146121005);
  n ^= n >>> 15;
  n = Math.imul(n, 2221713035);
  n ^= n >>> 16;
  return n / 4294967296;
}

function trailingMean(values: readonly number[], window: number): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const take = Math.min(window, values.length);
  let sum = 0;
  for (let i = values.length - take; i < values.length; i += 1) {
    sum += values[i] ?? 0;
  }
  return sum / take;
}
