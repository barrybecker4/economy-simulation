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
  jobs: JobSlice[];
  owners: OwnerPicture;
}

export function monthCensus(
  result: RunSuccess,
  monthIndex: number,
  households: number,
  ownershipConcentration: number,
): MonthCensus {
  const index = clampIndex(monthIndex, result.ticks.length);
  const agentShare = metricAt(result, CENSUS_OWNERS.aiShareOfAgents, index);
  const agentCount = agentCountFromShare(agentShare, households);
  const owners = ownerCount(households, ownershipConcentration, agentCount);
  return {
    monthIndex: index,
    wealth: CENSUS_WEALTH.map((slice) => ({
      label: slice.label,
      share: metricAt(result, slice.id, index),
      color: slice.color,
    })),
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

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    throw new Error('Run has no ticks');
  }
  if (!Number.isFinite(index)) {
    return length - 1;
  }
  return Math.min(Math.max(0, Math.floor(index)), length - 1);
}
