/**
 * Chart and month-diagram money display. Ledger amounts stay in model cents or
 * model satoshis. A skill-1 opening wage displays as $5,000 a month, and the
 * same wage at the model's opening bitcoin price sets the satoshi scale.
 */

import type { MetricId } from '../../../core/src/metrics/metrics.js';
import { INITIAL_WAGE } from '../../../core/src/sim/rules.js';
import { SUPPLY_SHOCK_START_PRICE_USD } from '../../../core/src/sim/supply-shock-price.js';

/** Display dollars for one month of the skill-1 opening wage. */
export const DISPLAY_MONTHLY_WAGE_DOLLARS = 5_000;

/** Satoshis in one bitcoin. */
const SATOSHIS_PER_BITCOIN = 100_000_000;

/** Dollars shown for one model cent (ledger unit). */
export const DOLLARS_PER_MODEL_CENT = DISPLAY_MONTHLY_WAGE_DOLLARS / INITIAL_WAGE;

/**
 * Real satoshis shown for one model satoshi. The opening wage maps to
 * DISPLAY_MONTHLY_WAGE_DOLLARS at SUPPLY_SHOCK_START_PRICE_USD per bitcoin.
 */
export const SATOSHIS_PER_MODEL_SAT =
  (DISPLAY_MONTHLY_WAGE_DOLLARS / SUPPLY_SHOCK_START_PRICE_USD) *
  (SATOSHIS_PER_BITCOIN / INITIAL_WAGE);

/** Nominal current dollars, or dollars of the run's first month. */
export type DollarBasis = 'nominal' | 'real';

/**
 * Metrics already divided by the CPI in assemble-metrics. Display multiplies
 * by that month's reported CPI to recover nominal original cents or sats.
 */
export const CPI_DEFLATED_METRICS = new Set<MetricId>([
  'realWage',
  'meanRealWealth',
  'medianRealWealth',
  'totalRealWealth',
  'realCashWealth',
  'realClaimWealth',
  'meanRealIncome',
  'medianRealIncome',
]);

/**
 * Goods quantities (not money). Display multiplies by that month's CPI so a
 * dollar of consumption matches a dollar of wages on the same chart.
 */
export const GOODS_QUANTITY_METRICS = new Set<MetricId>([
  'meanRealConsumption',
  'medianRealConsumption',
]);

/** True when the metric needs that month's CPI to become nominal money. */
export function needsPriceLevel(metricId: string): boolean {
  return (
    CPI_DEFLATED_METRICS.has(metricId as MetricId) ||
    GOODS_QUANTITY_METRICS.has(metricId as MetricId)
  );
}

/** Ledger money unit before the display scale. */
export function moneyUnit(regime: string): 'cents' | 'satoshis' {
  if (regime === 'fiat' || regime === 'hybrid') {
    return 'cents';
  }
  if (regime === 'bitcoin') {
    return 'satoshis';
  }
  throw new Error(`Unknown regime ${regime}`);
}

/** Axis label after the display scale. Bitcoin ignores the dollar basis. */
export function moneyDisplayUnit(regime: string, basis: DollarBasis): string {
  if (moneyUnit(regime) === 'satoshis') {
    return 'satoshis';
  }
  return basis === 'real' ? 'opening-month dollars' : 'dollars';
}

/**
 * Convert one reported metric value into display dollars or satoshis.
 * `priceLevel` and `openingPriceLevel` are reported CPI (original cents or sats).
 */
export function displayMoneyValue(
  value: number,
  metricId: string,
  regime: string,
  basis: DollarBasis,
  priceLevel: number,
  openingPriceLevel: number,
): number {
  const nominal = toNominalMoney(value, metricId, priceLevel);
  if (moneyUnit(regime) === 'satoshis') {
    return nominal * SATOSHIS_PER_MODEL_SAT;
  }
  const dollars = nominal * DOLLARS_PER_MODEL_CENT;
  if (basis === 'nominal') {
    return dollars;
  }
  if (!(priceLevel > 0) || !(openingPriceLevel > 0)) {
    return 0;
  }
  return dollars * (openingPriceLevel / priceLevel);
}

/** Convert a full series; nulls stay null. */
export function displayMoneySeries(
  values: readonly (number | null)[],
  metricId: string,
  regime: string,
  basis: DollarBasis,
  priceLevels: readonly (number | null)[],
  openingPriceLevel: number,
): (number | null)[] {
  return values.map((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    const price = priceLevels[index];
    if (price === null || price === undefined || !Number.isFinite(price)) {
      return null;
    }
    return displayMoneyValue(value, metricId, regime, basis, price, openingPriceLevel);
  });
}

/** Wealth and living-standards labels omit "real" when the chart shows nominal dollars. */
export function moneyLineLabel(label: string, basis: DollarBasis, regime: string): string {
  if (basis !== 'nominal' || moneyUnit(regime) === 'satoshis') {
    return label;
  }
  const stripped = label.replace(/\breal /gi, '');
  if (stripped === label) {
    return label;
  }
  // "Real wage" → "Wage" after stripping the leading word.
  return stripped.replace(/^[a-z]/, (letter) => letter.toUpperCase());
}

/**
 * Living standards chart blurb. Nominal dollars are monthly money amounts; opening-month
 * dollars are the same flows on the Dollars control's inflation-adjusted basis.
 */
export function livingStandardsDescription(basis: DollarBasis, regime: string): string {
  const shared =
    'Income and consumption use households only. Charted amounts use the shared dollar or satoshi display scale so a dollar matches money stocks and flows. More than one seed draws each median.';
  if (moneyUnit(regime) === 'satoshis' || basis === 'nominal') {
    return `Wage is the monthly money wage. Mean and median income are household monthly wages and profits, plus the UBI grant and any treasury surplus rebate. Consumption is monthly goods buying. ${shared}`;
  }
  return `Wage is the monthly money wage in dollars of the run’s first month. Mean and median income are household monthly wages and profits, plus the UBI grant and any treasury surplus rebate, on that same basis. Consumption is monthly goods buying on that basis. When the CPI has fallen, these opening-month dollars sit above nominal dollars; when it has risen, they sit below. ${shared}`;
}

/**
 * Bitcoin exchange-rate blurb. The catalog text is the fiat chart: a goods index
 * times the redenomination scale. Bitcoin skips that scale. Hybrid charts cents per bitcoin.
 */
export function bitcoinExchangeDescription(regime: string, fiatDescription: string): string {
  const seeds = 'More than one seed draws the median.';
  if (regime === 'hybrid') {
    return `Cents per bitcoin on the outside supply-shock path. The path opens in October 2026 at $85,000, which is 8.5 million cents. Household demand in this economy leaves the path unchanged. After a fiat redenomination the chart still shows that price in original cents. ${seeds}`;
  }
  if (regime === 'bitcoin') {
    return `Goods bought by one unit of bitcoin money. The goods-unit is one unit of the consumption basket, the basket the CPI prices in satoshis. The index opens at 1 and stays between 0.05 and 20. It moves with the bitcoin money share and issuance when monetary choice or the market-price weight is on. ${seeds}`;
  }
  return fiatDescription;
}

/** Prices chart blurb. Opening-month dollars hold the CPI at the opening basket price. */
export function pricesDescription(basis: DollarBasis, regime: string): string {
  const categories =
    'Food and beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics can move apart from it.';
  const shared =
    'Dollar and satoshi charts share one display scale (a skill-1 opening wage is $5,000). More than one seed draws each median.';
  if (moneyUnit(regime) === 'satoshis' || basis === 'nominal') {
    return `CPI is the expenditure-weighted basket in current dollars. ${categories} ${shared}`;
  }
  return `CPI is the expenditure-weighted basket in dollars of the run’s first month, so the CPI line stays at the opening basket price and category prices move relative to it. ${categories} ${shared}`;
}

/** Total / typical wealth blurbs follow the Dollars control without claiming a CPI divide on nominal. */
export function wealthDescription(
  kind: 'total' | 'typical',
  basis: DollarBasis,
  regime: string,
): string {
  const stock =
    kind === 'total'
      ? 'Sum of household wealth — the stock the wealth-by-fifth shares divide. Cash and capital claims partition that stock: cash is deposits (and bitcoin valued at the exchange rate), and claims are equity claims on firm capital when the equity market is on. Negative holdings count as zero. Agent deposits are not included.'
      : 'Mean and median household wealth. Households only; agent deposits are not included.';
  const output =
    kind === 'total'
      ? ' For the output pie that grows like historical real GDP, see the Output chart.'
      : '';
  const seeds = kind === 'total' ? ' More than one seed draws the median.' : ' More than one seed draws each median.';
  if (moneyUnit(regime) === 'satoshis') {
    return `${stock} Charted amounts use the shared satoshi display scale.${output}${seeds}`;
  }
  if (basis === 'nominal') {
    return `${stock} Charted amounts are current dollars on the shared display scale.${output}${seeds}`;
  }
  return `${stock} Charted amounts are dollars of the run’s first month on the shared display scale.${output}${seeds}`;
}

function toNominalMoney(value: number, metricId: string, priceLevel: number): number {
  if (!needsPriceLevel(metricId)) {
    return value;
  }
  if (!(priceLevel > 0)) {
    return 0;
  }
  return value * priceLevel;
}
