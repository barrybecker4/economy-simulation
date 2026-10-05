import type { Economy } from './economy.js';
import { AI_INTERNET_TASK_GAIN, AI_UNBOUNDED_GROWTH } from './rules.js';
import { clamp } from './stats.js';

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
  const logistic = 1 / (1 + Math.exp(-adoptionSteepness * (years - adoptionMidpoint)));
  return autoStart + (autoEnd - autoStart) * logistic;
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

function autonomyShare(autonomyEnd: number, years: number): number {
  if (autonomyEnd === 0) {
    return 0;
  }
  return autonomyEnd * Math.min(1, years / 5);
}

export function onPopulation(economy: Economy): void {
  const years = economy.tick / 12;
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
    spawnAgents(economy, years);
    return;
  }
  const progress = roboticsProgress(
    years,
    economy.params.roboticsStartYear,
    economy.params.roboticsRampYears,
  );
  const effectivePhysical = economy.params.physicalShare * (1 - progress);
  const computeCost = economy.wageLevel * (1 - economy.params.computeDecline) ** years;
  const adopted = computeCost < economy.wageLevel ? span * (1 - effectivePhysical) : 0;
  const gain = taskGain(economy.params.bullishness, years);
  economy.aiFactor = 1 + adopted * gain;
  economy.displacementFactor = 1 + adopted * Math.min(gain, 1);
  spawnAgents(economy, years);
}

function spawnAgents(economy: Economy, years: number): void {
  const target = Math.round(
    autonomyShare(economy.params.autonomyEnd, years) * economy.households.length,
  );
  const owners = Math.max(
    1,
    Math.round(economy.households.length * (1 - economy.params.ownership)),
  );
  while (economy.agents.length < target) {
    const id = economy.agents.length;
    economy.agents.push({ id, owner: id % owners, deposit: 0, income: 0, smoothed: 0 });
  }
}
