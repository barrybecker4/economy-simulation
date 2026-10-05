import type { Economy } from './economy.js';

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
    spawnAgents(economy, years);
    return;
  }
  const computeCost = economy.wageLevel * (1 - economy.params.computeDecline) ** years;
  const adopted = computeCost < economy.wageLevel ? span * (1 - economy.params.physicalShare) : 0;
  economy.aiFactor = 1 + adopted;
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
