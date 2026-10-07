import { describe, expect, it } from 'vitest';
import type { RunSuccess } from '../worker/protocol.js';
import { CHART_METRICS } from '../worker/series.js';
import { agentCountFromShare, monthCensus, ownerCount, type CensusFrame } from './census.js';

const ticks = [0, 1];

function series(): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const id of CHART_METRICS) {
    out[id] = [0, 0];
  }
  out.wealthQuintile1 = [0.05, 0.04];
  out.wealthQuintile2 = [0.1, 0.09];
  out.wealthQuintile3 = [0.15, 0.16];
  out.wealthQuintile4 = [0.2, 0.21];
  out.wealthQuintile5 = [0.5, 0.5];
  out.jobUnemployedShare = [0.06, 0.1];
  out.jobSmallFirmShare = [0.5, 0.45];
  out.jobLargeFirmShare = [0.44, 0.45];
  out.ownerWealthShare = [0, 0.3];
  out.aiShareOfWealth = [0, 0.02];
  out.aiShareOfAgents = [0, 0.2];
  return out;
}

describe('monthCensus', () => {
  it('builds wealth, job, and owner panels for the selected month', () => {
    const result: RunSuccess = { kind: 'run', ticks, series: series() };
    const frame = censusFrame();
    const empty = monthCensus(result, 0, frame);
    expect(empty.wealth.map((slice) => slice.share)).toEqual([0.05, 0.1, 0.15, 0.2, 0.5]);
    expect(empty.jobs.map((slice) => slice.share)).toEqual([0.06, 0.5, 0.44]);
    expect(empty.owners.hasAgents).toBe(false);
    expect(empty.owners.agentCount).toBe(0);

    const later = monthCensus(result, 1, frame);
    expect(later.owners.hasAgents).toBe(true);
    expect(later.owners.agentCount).toBe(25);
    expect(later.owners.ownerCount).toBe(25);
    expect(later.owners.ownerWealthShare).toBe(0.3);
  });
});

describe('agent and owner counts', () => {
  it('inverts the AI agent share and counts owners from the adoption curve', () => {
    expect(agentCountFromShare(0, 100)).toBe(0);
    expect(agentCountFromShare(0.2, 100)).toBe(25);
    const frame = censusFrame();
    expect(ownerCount(frame, 10, 25)).toBe(25);
    expect(ownerCount(frame, 10, 0)).toBe(0);
    expect(ownerCount({ ...frame, autoStart: 0.3, autoEnd: 0.3 }, 10, 25)).toBe(0);
  });
});

function censusFrame(): CensusFrame {
  return {
    households: 100,
    ownerShareCeiling: 0.95,
    autoStart: 0.1,
    autoEnd: 0.9,
    adoptionMidpoint: 0,
    adoptionSteepness: 0.4,
  };
}
