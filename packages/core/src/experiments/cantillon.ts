import { loadScenario } from '../config/load.js';
import { simulate } from '../sim/simulate.js';
import type { SimulationResult } from '../engine/engine.js';

export interface CantillonExperimentConfig {
  seeds: number[];
  ticks: number;
  regime: string;
  preset: string;
  baseSliders: Record<string, number | string>;
}

export interface CantillonResult {
  seed: number;
  regime: string;
  preset: string;
  channel: string;
  wealthGiniChange: number;
  topDecileChange: number;
  firstReceiverGain: number;
}

const INJECTION_CHANNELS = [
  'proRataDeposits',
  'governmentSpending',
  'newLoans',
  'assetPurchase',
] as const;

/**
 * Run the Cantillon effect experiment across multiple injection channels.
 * Each channel is tested with the same money growth rate to isolate the
 * distributional effect of who receives new money first.
 */
export function runCantillonExperiment(config: CantillonExperimentConfig): CantillonResult[] {
  const results: CantillonResult[] = [];

  for (const seed of config.seeds) {
    for (const channel of INJECTION_CHANNELS) {
      const result = runChannel(config, seed, channel);
      results.push(result);
    }
  }

  return results;
}

function runChannel(
  config: CantillonExperimentConfig,
  seed: number,
  channel: string,
): CantillonResult {
  const sliders = {
    ...config.baseSliders,
    'regime.type': config.regime,
    'centralBank.injectionChannel': channel,
    'centralBank.moneyGrowth': 1,
    'centralBank.stimulus': 0, // Isolate secular money growth only
    'prices.trendWeight': 0, // Let prices respond to money
    'production.demandWeight': 1, // Demand-driven output
  };

  const result = simulate(
    loadScenario({
      name: config.preset,
      seed,
      ticks: config.ticks,
      sliders,
    }),
  );

  return {
    seed,
    regime: config.regime,
    preset: config.preset,
    channel,
    wealthGiniChange: calculateWealthGiniChange(result),
    topDecileChange: calculateTopDecileChange(result),
    firstReceiverGain: calculateFirstReceiverGain(result, channel),
  };
}

/**
 * Calculate the change in wealth Gini from the beginning to end of the run.
 */
function calculateWealthGiniChange(result: SimulationResult): number {
  const giniSeries = result.metrics.series.giniWealth;
  const start = giniSeries[0] ?? 0;
  const end = giniSeries[giniSeries.length - 1] ?? 0;
  return end - start;
}

/**
 * Calculate the change in top decile wealth share from beginning to end.
 */
function calculateTopDecileChange(result: SimulationResult): number {
  const topDecileSeries = result.metrics.series.topDecileWealthShare;
  const start = topDecileSeries[0] ?? 0;
  const end = topDecileSeries[topDecileSeries.length - 1] ?? 0;
  return end - start;
}

/**
 * Calculate first-receiver gain as the wealth change of the first-receiving
 * group over 12 months after money injection starts.
 *
 * First receivers by channel:
 * - proRataDeposits: households (by existing balance) - measure top quintile
 * - governmentSpending: firms - measure median firm wealth change
 * - newLoans: firms - measure median firm wealth change
 * - assetPurchase: households - measure top quintile (bondholders proxy)
 */
function calculateFirstReceiverGain(result: SimulationResult, channel: string): number {
  // Use tick 0 as baseline and tick 12 (one year later) as the measurement point
  const baselineTick = 0;
  const measurementTick = Math.min(12, result.metrics.ticks.length - 1);

  if (channel === 'proRataDeposits') {
    // Households receive proportionally; measure top quintile gain
    return calculateTopQuintileGain(result, baselineTick, measurementTick);
  }

  if (channel === 'assetPurchase') {
    // Households with bonds (proxied by top quintile) receive first
    return calculateTopQuintileGain(result, baselineTick, measurementTick);
  }

  // For governmentSpending and newLoans, firms receive first
  // Measure via total real wealth change (firms hold capital and deposits)
  return calculateRealWealthGain(result, baselineTick, measurementTick);
}

/**
 * Calculate the gain in top quintile wealth share.
 */
function calculateTopQuintileGain(
  result: SimulationResult,
  baselineTick: number,
  measurementTick: number,
): number {
  const quintile5 = result.metrics.series.wealthQuintile5;
  const baseline = quintile5[baselineTick] ?? 0;
  const measurement = quintile5[measurementTick] ?? 0;
  return measurement - baseline;
}

/**
 * Calculate the gain in mean real wealth (a proxy for firm wealth gains
 * flowing through to households).
 */
function calculateRealWealthGain(
  result: SimulationResult,
  baselineTick: number,
  measurementTick: number,
): number {
  const meanRealWealth = result.metrics.series.meanRealWealth;
  const baseline = meanRealWealth[baselineTick] ?? 0;
  const measurement = meanRealWealth[measurementTick] ?? 0;
  if (baseline === 0) {
    return 0;
  }
  return (measurement - baseline) / baseline;
}

/**
 * Calculate summary statistics for a set of Cantillon results.
 */
export function summarizeCantillonResults(
  results: CantillonResult[],
  channel: string,
  metric: 'wealthGiniChange' | 'topDecileChange' | 'firstReceiverGain',
): { mean: number; min: number; max: number; range: number } {
  const channelResults = results.filter((r) => r.channel === channel);
  const values = channelResults.map((r) => r[metric]);

  if (values.length === 0) {
    return { mean: 0, min: 0, max: 0, range: 0 };
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return { mean, min, max, range };
}
