import { powerWeights, splitProportional } from './allocate.js';
import type { Economy } from './economy.js';
import { separate } from './helpers.js';
import { chargeEquityForDefault, creditDeposit, transferDeposit } from './money.js';
import { AI_INTERNET_TASK_GAIN, AI_UNBOUNDED_GROWTH } from './rules.js';

/** Skill weights to this power, so an estate concentrates on the highest-skill heirs. */
const BEQUEST_SKILL_EXPONENT = 16;
import { clamp, monthlyFromAnnual } from './stats.js';
import type { Household } from './types.js';

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
  const progress = adoptionProgress(autoStart, autoEnd, adoptionSteepness, adoptionMidpoint, years);
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

/**
 * Share of automatable tasks firms take up given compute cost versus the wage.
 * At or above the wage nothing is adopted; far below, the full reachable span counts.
 */
export function computeAdoptionFactor(wage: number, computeCost: number): number {
  if (!(wage > 0) || computeCost >= wage) {
    return 0;
  }
  return clamp((wage - computeCost) / wage, 0, 1);
}

/** Capacity multiplier per adopted task, given bullishness and years elapsed. */
export function taskGain(bullishness: number, years: number): number {
  const level = AI_INTERNET_TASK_GAIN + (1 - AI_INTERNET_TASK_GAIN) * Math.min(bullishness, 1);
  const compoundYears = Math.max(0, bullishness - 1) * AI_UNBOUNDED_GROWTH * years;
  return level * Math.exp(compoundYears);
}

export function onPopulation(economy: Economy): void {
  applyPopulationGrowth(economy);
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
  const costFactor = computeAdoptionFactor(economy.wageLevel, computeCost);
  const adopted = span * (1 - effectivePhysical) * costFactor;
  const gain = taskGain(economy.params.bullishness, years);
  economy.aiFactor = 1 + adopted * gain;
  economy.displacementFactor = 1 + adopted * Math.min(gain, 1);
  spawnAgents(economy, progress);
}

function applyPopulationGrowth(economy: Economy): void {
  const monthly = monthlyFromAnnual(economy.params.popGrowth);
  if (monthly === 0 || economy.households.length === 0) {
    return;
  }
  economy.populationCredit += economy.households.length * monthly;
  while (economy.populationCredit >= 1) {
    economy.populationCredit -= 1;
    addHousehold(economy);
  }
  while (economy.populationCredit <= -1 && economy.households.length > 1) {
    economy.populationCredit += 1;
    removeLastHousehold(economy);
  }
}

function addHousehold(economy: Economy): void {
  const id = economy.households.length;
  const sigma = economy.params.skillSigma;
  const skill =
    clamp(economy.populationRng.lognormal(0, sigma), 0.2, 5) / Math.exp((sigma * sigma) / 2);
  const timePref = clamp(
    economy.populationRng.normal(economy.params.timePrefMean, economy.params.prefStd),
    0.01,
    0.15,
  );
  const household: Household = {
    id,
    bank: id % Math.max(economy.params.bankCount, 1),
    skill,
    timePref,
    deposit: 0,
    employer: -1,
    income: 0,
    consumption: 0,
    realConsumption: 0,
    smoothed: 0,
    search: economy.populationRng.fork(id),
    tenure: 'none',
    mortgage: 0,
    mortgagePayment: 0,
    mortgageArrears: 0,
    consumerLoan: 0,
  };
  economy.households.push(household);
}

function removeLastHousehold(economy: Economy): void {
  const exiting = economy.households[economy.households.length - 1];
  const heir = economy.households[0];
  if (!exiting || !heir || exiting.id === heir.id) {
    return;
  }
  if (exiting.employer >= 0) {
    separate(economy, exiting);
  }
  if (exiting.deposit > 0) {
    if (economy.params.bequests === 'skillWeighted') {
      distributeBequest(economy, exiting);
    } else {
      transferDeposit(exiting, heir, exiting.deposit);
    }
  }
  const debt = exiting.mortgage + exiting.consumerLoan;
  if (debt > 0) {
    chargeEquityForDefault(economy.banks[exiting.bank], economy, debt);
    exiting.mortgage = 0;
    exiting.consumerLoan = 0;
  }
  for (const agent of economy.agents) {
    if (agent.owner === exiting.id) {
      agent.owner = heir.id;
    }
  }
  economy.households.pop();
}

function distributeBequest(economy: Economy, exiting: Household): void {
  const heirs = economy.households.filter((household) => household.id !== exiting.id);
  if (heirs.length === 0) {
    return;
  }
  const estate = exiting.deposit;
  exiting.deposit = 0;
  const parts = splitProportional(
    estate,
    powerWeights(
      heirs.map((household) => household.skill),
      BEQUEST_SKILL_EXPONENT,
    ),
  );
  for (let index = 0; index < heirs.length; index += 1) {
    const heir = heirs[index];
    const share = parts[index] ?? 0;
    if (heir && share > 0) {
      creditDeposit(heir, share);
    }
  }
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
