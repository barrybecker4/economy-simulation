import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import { simulate } from '../sim/simulate.js';
import type { SimulationResult } from '../engine/engine.js';

export interface HypothesisResult {
  id: string;
  claim: string;
  supported: boolean;
  detail: string;
}

const base = {
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
};

export function runHypotheses(): HypothesisResult[] {
  return [h1(), h2(), h3(), h4(), h5(), h6(), h7(), h8()];
}

function h1(): HypothesisResult {
  const quiet = run({
    ...base,
    'regime.type': 'bitcoin',
    'ai.automatableShareStart': 0.3,
    'ai.automatableShareEnd': 0.3,
  });
  const fast = run({
    ...base,
    'regime.type': 'bitcoin',
    'ai.adoptionMidpointYear': 3,
    'ai.adoptionSteepness': 1.2,
    'wage.nominalRigidity': 0.9,
  });
  const priceDown = last(fast, 'priceLevel') < last(quiet, 'priceLevel');
  return {
    id: 'H1',
    claim: 'Fixed money and rapid AI adoption lower the price level.',
    supported: priceDown,
    detail: `bitcoin price ${last(quiet, 'priceLevel')} -> ${last(fast, 'priceLevel')}`,
  };
}

function h2(): HypothesisResult {
  const fiat = run({ ...base, 'regime.type': 'fiat', 'shock.frequency': 1, 'shock.size': 0.1 });
  const bitcoin = run({
    ...base,
    'regime.type': 'bitcoin',
    'shock.frequency': 1,
    'shock.size': 0.1,
  });
  return {
    id: 'H2',
    claim: 'Inflation targeting changes output volatility relative to a fixed supply.',
    supported: last(fiat, 'realGdp') !== last(bitcoin, 'realGdp'),
    detail: `end GDP fiat ${last(fiat, 'realGdp')} bitcoin ${last(bitcoin, 'realGdp')}`,
  };
}

function h3(): HypothesisResult {
  const quiet = run({ ...base, 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3 });
  const fast = run({ ...base, 'ai.adoptionMidpointYear': 3, 'ai.adoptionSteepness': 1.2 });
  const spread = run({
    ...base,
    'ai.adoptionMidpointYear': 3,
    'ai.adoptionSteepness': 1.2,
    'ai.ownershipConcentration': 0.2,
  });
  const shareFalls = last(fast, 'laborShare') < last(quiet, 'laborShare');
  const ownershipMatters = last(fast, 'giniWealth') !== last(spread, 'giniWealth');
  return {
    id: 'H3',
    claim: 'AI adoption lowers the labor share, and ownership changes the wealth Gini.',
    supported: shareFalls && ownershipMatters,
    detail: `labor share ${last(quiet, 'laborShare')} -> ${last(fast, 'laborShare')}`,
  };
}

function h4(): HypothesisResult {
  const easy = run({ ...base, 'ai.agentAutonomyShareEnd': 0.6, 'ai.paymentFrictionFiat': 0 });
  const hard = run({ ...base, 'ai.agentAutonomyShareEnd': 0.6, 'ai.paymentFrictionFiat': 0.1 });
  return {
    id: 'H4',
    claim: 'Lower payment friction raises the AI transaction share.',
    supported: last(easy, 'aiShareOfTransactions') > last(hard, 'aiShareOfTransactions'),
    detail: `share ${last(hard, 'aiShareOfTransactions')} -> ${last(easy, 'aiShareOfTransactions')}`,
  };
}

function h5(): HypothesisResult {
  const matched = run({
    ...base,
    'regime.type': 'bitcoin',
    'bitcoin.lendingModel': 'maturityMatched',
    'shock.frequency': 1,
  });
  const full = run({
    ...base,
    'regime.type': 'bitcoin',
    'bitcoin.lendingModel': 'fullReserve',
    'shock.frequency': 1,
  });
  return {
    id: 'H5',
    claim: 'Full-reserve lending holds no more credit than maturity-matched lending.',
    supported: last(full, 'loanToSavings') <= last(matched, 'loanToSavings') + 1e-9,
    detail: `loan/savings matched ${last(matched, 'loanToSavings')} full ${last(full, 'loanToSavings')}`,
  };
}

function h6(): HypothesisResult {
  const flexible = run({
    ...base,
    'ai.adoptionMidpointYear': 3,
    'ai.adoptionSteepness': 1.2,
    'ai.physicalTaskShare': 0.1,
  });
  const physical = run({
    ...base,
    'ai.adoptionMidpointYear': 3,
    'ai.adoptionSteepness': 1.2,
    'ai.physicalTaskShare': 0.7,
  });
  return {
    id: 'H6',
    claim: 'A larger physical-task share lowers the productivity gain from AI.',
    supported: last(physical, 'productivityPerHuman') < last(flexible, 'productivityPerHuman'),
    detail: `productivity ${last(flexible, 'productivityPerHuman')} vs ${last(physical, 'productivityPerHuman')}`,
  };
}

function h7(): HypothesisResult {
  const mild = run({ ...base, 'regime.type': 'bitcoin', 'deflation.sensitivity': 0 });
  const sharp = run({ ...base, 'regime.type': 'bitcoin', 'deflation.sensitivity': 5 });
  const credit = last(sharp, 'creditToGdp') < last(mild, 'creditToGdp');
  const sharing = last(sharp, 'profitSharingShare') > last(mild, 'profitSharingShare');
  return {
    id: 'H7',
    claim: 'Stronger deflation cuts credit and raises profit-sharing.',
    supported: credit && sharing,
    detail: `credit/GDP ${last(mild, 'creditToGdp')} -> ${last(sharp, 'creditToGdp')}`,
  };
}

function h8(): HypothesisResult {
  const fiat = run(base);
  const bitcoin = run({ ...base, 'regime.type': 'bitcoin' });
  const electronics = last(fiat, 'priceElectronics') < last(fiat, 'priceGeneral');
  const beach = last(fiat, 'priceBeachfront') > last(fiat, 'priceLevel');
  const pathsDiffer = last(fiat, 'inflation') > last(bitcoin, 'inflation');
  return {
    id: 'H8',
    claim: 'Electronics cheapen and beachfront rises inside both a rising and a falling CPI.',
    supported: electronics && beach && pathsDiffer,
    detail: `fiat inflation ${last(fiat, 'inflation')} bitcoin ${last(bitcoin, 'inflation')}`,
  };
}

function run(sliders: Record<string, number | string>): SimulationResult {
  return simulate(loadScenario({ name: 'hypothesis', seed: 4, ticks: 36, sliders }));
}

function last(result: SimulationResult, id: MetricId): number {
  const values = result.metrics.series[id];
  return values[values.length - 1] ?? 0;
}
