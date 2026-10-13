import { loadScenario } from '../config/load.js';
import type { SimulationResult } from '../engine/engine.js';
import type { MetricId } from '../metrics/metrics.js';
import { simulate } from '../sim/simulate.js';

export const INJECTION_CHANNELS = [
  'proRataDeposits',
  'governmentSpending',
  'newLoans',
  'assetPurchase',
] as const;

export type InjectionChannel = (typeof INJECTION_CHANNELS)[number];

/** Issue #16: wealth-Gini change within this of zero for assetPurchase / proRataDeposits. */
export const CANTILLON_GINI_TARGET = 0.01;

export const CANTILLON_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export const CANTILLON_TICKS = 24;
export const FIRST_RECEIVER_MONTHS = 12;

export interface CantillonExperimentConfig {
  seeds: readonly number[];
  ticks: number;
  regime: string;
  preset: string;
  baseSliders: Record<string, number | string>;
}

export interface CantillonResult {
  seed: number;
  regime: string;
  preset: string;
  channel: InjectionChannel;
  wealthGiniStart: number;
  wealthGiniEnd: number;
  wealthGiniChange: number;
  /** Same-seed end Gini minus proRataDeposits end Gini. */
  wealthGiniVsProRata: number;
  topDecileChange: number;
  firstReceiverGain: number;
}

export interface CantillonStats {
  mean: number;
  min: number;
  max: number;
  range: number;
}

export interface CantillonChannelSummary {
  channel: InjectionChannel;
  wealthGiniChange: CantillonStats;
  wealthGiniVsProRata: CantillonStats;
  topDecileChange: CantillonStats;
  firstReceiverGain: CantillonStats;
}

/**
 * Run each injection channel at the same money-growth rule so the only
 * difference is who first holds the new money.
 */
export function runCantillonExperiment(config: CantillonExperimentConfig): CantillonResult[] {
  const results: CantillonResult[] = [];
  for (const seed of config.seeds) {
    const byChannel = new Map<InjectionChannel, CantillonResult>();
    for (const channel of INJECTION_CHANNELS) {
      byChannel.set(channel, runChannel(config, seed, channel));
    }
    const proRata = byChannel.get('proRataDeposits');
    if (proRata === undefined) {
      throw new Error('proRataDeposits result missing');
    }
    for (const channel of INJECTION_CHANNELS) {
      const row = byChannel.get(channel);
      if (row === undefined) {
        throw new Error(`missing channel ${channel}`);
      }
      row.wealthGiniVsProRata = row.wealthGiniEnd - proRata.wealthGiniEnd;
      results.push(row);
    }
  }
  return results;
}

export function summarizeCantillonResults(
  results: readonly CantillonResult[],
  channel: string,
  metric: 'wealthGiniChange' | 'wealthGiniVsProRata' | 'topDecileChange' | 'firstReceiverGain',
): CantillonStats {
  const values = results.filter((row) => row.channel === channel).map((row) => row[metric]);
  return stats(values);
}

export function summarizeCantillonChannels(
  results: readonly CantillonResult[],
): CantillonChannelSummary[] {
  return INJECTION_CHANNELS.map((channel) => ({
    channel,
    wealthGiniChange: summarizeCantillonResults(results, channel, 'wealthGiniChange'),
    wealthGiniVsProRata: summarizeCantillonResults(results, channel, 'wealthGiniVsProRata'),
    topDecileChange: summarizeCantillonResults(results, channel, 'topDecileChange'),
    firstReceiverGain: summarizeCantillonResults(results, channel, 'firstReceiverGain'),
  }));
}

export function meetsCantillonGiniTarget(mean: number): boolean {
  return Math.abs(mean) <= CANTILLON_GINI_TARGET;
}

function runChannel(
  config: CantillonExperimentConfig,
  seed: number,
  channel: InjectionChannel,
): CantillonResult {
  const result = simulate(
    loadScenario({
      name: config.preset,
      seed,
      ticks: config.ticks,
      sliders: {
        ...config.baseSliders,
        'regime.type': config.regime,
        'centralBank.injectionChannel': channel,
      },
    }),
  );
  const giniStart = at(result, 'giniWealth', 0);
  const giniEnd = at(result, 'giniWealth', lastIndex(result));
  const decileStart = at(result, 'topDecileWealthShare', 0);
  const decileEnd = at(result, 'topDecileWealthShare', lastIndex(result));
  return {
    seed,
    regime: config.regime,
    preset: config.preset,
    channel,
    wealthGiniStart: giniStart,
    wealthGiniEnd: giniEnd,
    wealthGiniChange: giniEnd - giniStart,
    wealthGiniVsProRata: 0,
    topDecileChange: decileEnd - decileStart,
    firstReceiverGain: firstReceiverGain(result, channel),
  };
}

function firstReceiverGain(result: SimulationResult, channel: InjectionChannel): number {
  const later = Math.min(FIRST_RECEIVER_MONTHS, lastIndex(result));
  if (channel === 'governmentSpending' || channel === 'newLoans') {
    return relativeChange(at(result, 'realClaimWealth', 0), at(result, 'realClaimWealth', later));
  }
  return relativeChange(topDecileRealWealth(result, 0), topDecileRealWealth(result, later));
}

function topDecileRealWealth(result: SimulationResult, tick: number): number {
  return at(result, 'topDecileWealthShare', tick) * at(result, 'totalRealWealth', tick);
}

function relativeChange(start: number, end: number): number {
  if (start === 0) {
    return 0;
  }
  return (end - start) / start;
}

function at(result: SimulationResult, id: MetricId, tick: number): number {
  return result.metrics.series[id][tick] ?? 0;
}

function lastIndex(result: SimulationResult): number {
  return Math.max(0, result.metrics.ticks.length - 1);
}

function stats(values: readonly number[]): CantillonStats {
  if (values.length === 0) {
    return { mean: 0, min: 0, max: 0, range: 0 };
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { mean, min, max, range: max - min };
}
