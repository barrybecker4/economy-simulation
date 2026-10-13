import type { Economy } from './economy.js';
import type { Household } from './types.js';

/**
 * Track job-stayer wage cut statistics for measuring downward nominal wage rigidity.
 * A "job-stayer" is a worker who was employed at the same firm 12 months ago.
 */
export interface JobStayerWageStats {
  /** Number of job-stayers (employed at same firm 12 months ago) */
  jobStayerCount: number;
  /** Number of job-stayers whose nominal wage fell from 12 months ago */
  jobStayersWithCuts: number;
  /** Share of job-stayers with nominal wage cuts (0 to 1) */
  jobStayerCutShare: number;
}

interface WageHistory {
  wage: number;
  employer: number;
}

const wageHistoryMap = new Map<number, WageHistory[]>();

/**
 * Record current wages for all households. Call this at the END of each tick
 * after wages have been updated.
 */
export function recordWageHistory(economy: Economy): void {
  for (const household of economy.households) {
    const tick = economy.tick;
    let history = wageHistoryMap.get(household.id);
    if (!history) {
      history = [];
      wageHistoryMap.set(household.id, history);
    }
    
    // Store current wage and employer
    history.push({
      wage: household.nominalWage,
      employer: household.employer,
    });
    
    // Keep only last 13 months (current + 12 back)
    if (history.length > 13) {
      history.shift();
    }
  }
}

/**
 * Calculate job-stayer wage cut statistics.
 * Should be called AFTER recordWageHistory for the current tick.
 */
export function calculateJobStayerStats(economy: Economy): JobStayerWageStats {
  if (economy.tick < 12) {
    return {
      jobStayerCount: 0,
      jobStayersWithCuts: 0,
      jobStayerCutShare: 0,
    };
  }

  let jobStayerCount = 0;
  let jobStayersWithCuts = 0;

  for (const household of economy.households) {
    const history = wageHistoryMap.get(household.id);
    if (!history || history.length < 13) {
      continue;
    }

    // Current state (most recent)
    const current = history[history.length - 1];
    // State 12 months ago
    const yearAgo = history[history.length - 13];

    if (!current || !yearAgo) {
      continue;
    }

    // Only count job-stayers: same employer for 12 months, and employed now
    if (
      current.employer < 0 ||
      yearAgo.employer < 0 ||
      current.employer !== yearAgo.employer
    ) {
      continue;
    }

    jobStayerCount++;

    // Check if nominal wage fell
    if (current.wage < yearAgo.wage && yearAgo.wage > 0) {
      jobStayersWithCuts++;
    }
  }

  return {
    jobStayerCount,
    jobStayersWithCuts,
    jobStayerCutShare: jobStayerCount > 0 ? jobStayersWithCuts / jobStayerCount : 0,
  };
}

/**
 * Clear wage history (for testing)
 */
export function clearWageHistory(): void {
  wageHistoryMap.clear();
}
