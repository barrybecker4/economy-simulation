import type { MetricId } from '../../../core/src/metrics/metrics.js';
import type { BandRunResult, RunSuccess } from '../worker/protocol.js';
import { assertSent, requireSeries } from '../worker/series.js';

export interface WealthSlice {
  label: string;
  share: number;
  color: string;
}

export interface JobSlice {
  label: string;
  share: number;
  color: string;
}

export interface OwnerPicture {
  ownerWealthShare: number;
  aiShareOfWealth: number;
  agentCount: number;
  ownerCount: number;
  hasAgents: boolean;
}

export interface MonthCensus {
  monthIndex: number;
  wealth: WealthSlice[];
  jobs: JobSlice[];
  owners: OwnerPicture;
}

const WEALTH_IDS = [
  'wealthQuintile1',
  'wealthQuintile2',
  'wealthQuintile3',
  'wealthQuintile4',
  'wealthQuintile5',
] as const satisfies readonly MetricId[];

const WEALTH_COLORS = ['#fecaca', '#fca5a5', '#f87171', '#ef4444', '#b91c1c'] as const;
const WEALTH_LABELS = [
  'Poorest fifth',
  'Second fifth',
  'Middle fifth',
  'Fourth fifth',
  'Richest fifth',
] as const;

const JOB_SPECS = [
  { id: 'jobUnemployedShare', label: 'Unemployed', color: '#a8a29e' },
  { id: 'jobSmallFirmShare', label: 'Smaller firms', color: '#38bdf8' },
  { id: 'jobLargeFirmShare', label: 'Larger firms', color: '#0369a1' },
] as const satisfies readonly { id: MetricId; label: string; color: string }[];

for (const id of WEALTH_IDS) {
  assertSent(id);
}
for (const job of JOB_SPECS) {
  assertSent(job.id);
}
assertSent('ownerWealthShare');
assertSent('aiShareOfWealth');
assertSent('aiShareOfAgents');

export function monthCensus(
  result: RunSuccess,
  monthIndex: number,
  households: number,
  ownershipConcentration: number,
): MonthCensus {
  const index = clampIndex(monthIndex, result.ticks.length);
  const agentShare = valueAt(result, 'aiShareOfAgents', index);
  const agentCount = agentCountFromShare(agentShare, households);
  const owners = ownerCount(households, ownershipConcentration, agentCount);
  return {
    monthIndex: index,
    wealth: WEALTH_IDS.map((id, quintile) => ({
      label: WEALTH_LABELS[quintile] ?? `Quintile ${quintile + 1}`,
      share: valueAt(result, id, index),
      color: WEALTH_COLORS[quintile] ?? '#b91c1c',
    })),
    jobs: JOB_SPECS.map((job) => ({
      label: job.label,
      share: valueAt(result, job.id, index),
      color: job.color,
    })),
    owners: {
      ownerWealthShare: valueAt(result, 'ownerWealthShare', index),
      aiShareOfWealth: valueAt(result, 'aiShareOfWealth', index),
      agentCount,
      ownerCount: owners,
      hasAgents: agentCount > 0,
    },
  };
}

/** Agents = share * (households + agents), so agents = share * households / (1 - share). */
export function agentCountFromShare(share: number, households: number): number {
  if (!(share > 0) || households <= 0) {
    return 0;
  }
  if (share >= 1) {
    return households;
  }
  return Math.max(0, Math.round((share * households) / (1 - share)));
}

/** Matches packages/core/src/sim/population.ts: first round(households * (1 - concentration)) ids. */
export function ownerCount(
  households: number,
  ownershipConcentration: number,
  agentCount: number,
): number {
  if (agentCount <= 0 || households <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(households * (1 - ownershipConcentration)));
}

function valueAt(result: RunSuccess, id: MetricId, index: number): number {
  const values = result.kind === 'band' ? bandMid(result, id) : requireSeries(result.series, id);
  const value = values[index];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Missing ${id} at month ${index}`);
  }
  return value;
}

function bandMid(result: BandRunResult, id: string): number[] {
  const band = result.bands[id];
  if (band === undefined) {
    throw new Error(`Missing band ${id}`);
  }
  return band.mid;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    throw new Error('Run has no ticks');
  }
  if (!Number.isFinite(index)) {
    return length - 1;
  }
  return Math.min(Math.max(0, Math.floor(index)), length - 1);
}
