import type { Economy } from './economy.js';
import { AI_INTERNET_TASK_GAIN, AI_UNBOUNDED_GROWTH } from './rules.js';
import { clamp } from './stats.js';

/**
 * Progress of the adoption curve, from 0 to 1.
 * Zero when the automatable share does not rise.
 */
export function adoptionProgress(
  autoStart: number,
  autoEnd: number,
  adoptionSteepness: number,
  adoptionMidpoint: number,
  years: number,
): number {
  if (autoEnd === autoStart) {
    return 0;
  }
  return 1 / (1 + Math.exp(-adoptionSteepness * (years - adoptionMidpoint)));
}

/** Logistic automatable-share path from start to end. Flat when the ends match. */
export function automationShare(
  autoStart: number,
  autoEnd: number,
  adoptionSteepness: number,
  adoptionMidpoint: number,
  years: number,
): number {
  if (autoEnd === autoStart) {
    return autoStart;
  }
  const progress = adoptionProgress(
    autoStart,
    autoEnd,
    adoptionSteepness,
    adoptionMidpoint,
    years,
  );
  return autoStart + (autoEnd - autoStart) * progress;
}

/** Households eligible to own agents this month, the lowest ids first. */
export function ownerSlotCount(
  households: number,
  ownerShareCeiling: number,
  progress: number,
): number {
  return Math.max(0, Math.round(households * ownerShareCeiling * progress));
}

/** Agents scheduled once each owner slot holds `agentsPerOwnerCeiling * progress`. */
export function scheduledAgentCount(
  slots: number,
  agentsPerOwnerCeiling: number,
  progress: number,
): number {
  return Math.max(0, Math.round(slots * agentsPerOwnerCeiling * progress));
}

/** How much of the physical-task share robots have opened by this year. */
export function roboticsProgress(
  years: number,
  roboticsStartYear: number,
  roboticsRampYears: number,
): number {
  if (roboticsRampYears <= 0) {
    return years >= roboticsStartYear ? 1 : 0;
  }
  return clamp((years - roboticsStartYear) / roboticsRampYears, 0, 1);
}

/** Capacity multiplier per adopted task, given bullishness and years elapsed. */
export function taskGain(bullishness: number, years: number): number {
  const level = AI_INTERNET_TASK_GAIN + (1 - AI_INTERNET_TASK_GAIN) * Math.min(bullishness, 1);
  const compoundYears = Math.max(0, bullishness - 1) * AI_UNBOUNDED_GROWTH * years;
  return level * Math.exp(compoundYears);
}

export function onPopulation(economy: Economy): void {
  const years = economy.tick / 12;
  const progress = adoptionProgress(
    economy.params.autoStart,
    economy.params.autoEnd,
    economy.params.adoptionSteepness,
    economy.params.adoptionMidpoint,
    years,
  );
  economy.adoptionProgress = progress;
  economy.automatedShare = automationShare(
    economy.params.autoStart,
    economy.params.autoEnd,
    economy.params.adoptionSteepness,
    economy.params.adoptionMidpoint,
    years,
  );
  const span = Math.max(0, economy.automatedShare - economy.params.autoStart);
  if (span === 0) {
    economy.aiFactor = 1;
    economy.displacementFactor = 1;
    spawnAgents(economy, progress);
    return;
  }
  const robotics = roboticsProgress(
    years,
    economy.params.roboticsStartYear,
    economy.params.roboticsRampYears,
  );
  const effectivePhysical = economy.params.physicalShare * (1 - robotics);
  const computeCost = economy.wageLevel * (1 - economy.params.computeDecline) ** years;
  const adopted = computeCost < economy.wageLevel ? span * (1 - effectivePhysical) : 0;
  const gain = taskGain(economy.params.bullishness, years);
  economy.aiFactor = 1 + adopted * gain;
  economy.displacementFactor = 1 + adopted * Math.min(gain, 1);
  spawnAgents(economy, progress);
}

function spawnAgents(economy: Economy, progress: number): void {
  const slots = ownerSlotCount(
    economy.households.length,
    economy.params.ownerShareCeiling,
    progress,
  );
  const target = scheduledAgentCount(slots, economy.params.agentsPerOwnerCeiling, progress);
  const counts = new Map<number, number>();
  for (let id = 0; id < slots; id += 1) {
    counts.set(id, 0);
  }
  for (const agent of economy.agents) {
    const count = counts.get(agent.owner);
    if (count !== undefined) {
      counts.set(agent.owner, count + 1);
    }
  }
  while (economy.agents.length < target && slots > 0) {
    const owner = shortestOwner(counts, slots);
    const id = economy.agents.length;
    economy.agents.push({ id, owner, deposit: 0, income: 0, smoothed: 0 });
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
}

/** Lowest id among the owner slots that currently hold the fewest agents. */
function shortestOwner(counts: ReadonlyMap<number, number>, slots: number): number {
  let best = 0;
  let bestCount = counts.get(0) ?? 0;
  for (let id = 1; id < slots; id += 1) {
    const count = counts.get(id) ?? 0;
    if (count < bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}
