import { adoptionProgress, ownerSlotCount } from '../../../core/src/sim/population.js';
import { CENSUS_JOBS, CENSUS_OWNERS, CENSUS_WEALTH } from '../dashboard/catalog.js';
import type { RunSuccess } from '../worker/protocol.js';
import { metricAt } from '../worker/series.js';

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
  /** Real household wealth at this month: non-negative holdings over CPI. */
  totalRealWealth: number;
  /** Real GDP (sum of firm capacities) at this month. */
  realGdp: number;
  jobs: JobSlice[];
  owners: OwnerPicture;
}

export interface CensusFrame {
  households: number;
  ownerShareCeiling: number;
  autoStart: number;
  autoEnd: number;
  adoptionMidpoint: number;
  adoptionSteepness: number;
}

export function monthCensus(
  result: RunSuccess,
  monthIndex: number,
  frame: CensusFrame,
): MonthCensus {
  const index = clampIndex(monthIndex, result.ticks.length);
  const agentShare = metricAt(result, CENSUS_OWNERS.aiShareOfAgents, index);
  const agentCount = agentCountFromShare(agentShare, frame.households);
  const owners = ownerCount(frame, index / 12, agentCount);
  return {
    monthIndex: index,
    wealth: CENSUS_WEALTH.map((slice) => ({
      label: slice.label,
      share: metricAt(result, slice.id, index),
      color: slice.color,
    })),
    totalRealWealth: metricAt(result, 'totalRealWealth', index),
    realGdp: metricAt(result, 'realGdp', index),
    jobs: CENSUS_JOBS.map((job) => ({
      label: job.label,
      share: metricAt(result, job.id, index),
      color: job.color,
    })),
    owners: {
      ownerWealthShare: metricAt(result, CENSUS_OWNERS.ownerWealthShare, index),
      aiShareOfWealth: metricAt(result, CENSUS_OWNERS.aiShareOfWealth, index),
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

/** Households that hold an agent once slots are filled from the lowest id. */
export function ownerCount(frame: CensusFrame, years: number, agentCount: number): number {
  if (agentCount <= 0 || frame.households <= 0) {
    return 0;
  }
  const progress = adoptionProgress(
    frame.autoStart,
    frame.autoEnd,
    frame.adoptionSteepness,
    frame.adoptionMidpoint,
    years,
  );
  const slots = ownerSlotCount(frame.households, frame.ownerShareCeiling, progress);
  return Math.min(agentCount, slots);
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
