import { loadScenario } from '../config/load.js';
import { BITCOIN_OPENING_SHARE } from '../sim/bitcoin-supply.js';
import type { MetricId } from '../metrics/metrics.js';
import { FEATURE_OFF } from '../sim/feature-off.js';
import { simulate, type ForcedShock } from '../sim/simulate.js';
import type { SimulationResult } from '../engine/engine.js';

export interface HypothesisResult {
  id: string;
  claim: string;
  supported: boolean;
  detail: string;
}

const base = {
  ...FEATURE_OFF,
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
};

export function runHypotheses(): HypothesisResult[] {
  return [h1(), h2(), h3(), h4(), h5(), h6(), h7(), h8(), h9(), h10()];
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
  const fiat = run({
    ...base,
    'regime.type': 'fiat',
    'shock.frequency': 1,
    'shock.size': 0.1,
    'prices.trendWeight': 0,
  });
  const bitcoin = run({
    ...base,
    'regime.type': 'bitcoin',
    'shock.frequency': 1,
    'shock.size': 0.1,
    'prices.trendWeight': 0,
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
  const fast = { 'ai.adoptionMidpointYear': 1, 'ai.adoptionSteepness': 1.5 };
  const easy = run({ ...base, ...fast, 'ai.paymentFrictionFiat': 0 }, 48);
  const hard = run({ ...base, ...fast, 'ai.paymentFrictionFiat': 0.1 }, 48);
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
    'ai.roboticsStartYear': 50,
  });
  const physical = run({
    ...base,
    'ai.adoptionMidpointYear': 3,
    'ai.adoptionSteepness': 1.2,
    'ai.physicalTaskShare': 0.7,
    'ai.roboticsStartYear': 50,
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
  const housing = last(fiat, 'priceHousing') > last(fiat, 'priceLevel');
  const pathsDiffer = last(fiat, 'inflation') > last(bitcoin, 'inflation');
  return {
    id: 'H8',
    claim: 'Electronics cheapen and housing rises inside both a rising and a falling CPI.',
    supported: electronics && housing && pathsDiffer,
    detail: `fiat inflation ${last(fiat, 'inflation')} bitcoin ${last(bitcoin, 'inflation')}`,
  };
}

function h9(): HypothesisResult {
  const prefs = {
    ...base,
    'money.choiceSpeed': 0.2,
    'money.bitcoinTrust': 2,
    'money.fiatLegalTender': 0,
  };
  const fromFiat = run({ ...prefs, 'regime.type': 'fiat' });
  const fromBitcoin = run({ ...prefs, 'regime.type': 'bitcoin' });
  const moved =
    last(fromFiat, 'bitcoinShare') > BITCOIN_OPENING_SHARE &&
    last(fromBitcoin, 'bitcoinShare') > BITCOIN_OPENING_SHARE;
  return {
    id: 'H9',
    claim: 'Currency shares follow trust and legal tender, not only the opening regime label.',
    supported: moved,
    detail: `bitcoin share from fiat ${last(fromFiat, 'bitcoinShare')} from bitcoin ${last(fromBitcoin, 'bitcoinShare')}`,
  };
}

function h10(): HypothesisResult {
  // Credit shock with sticky wages so the fiat zombie budget binds (defaults fall
  // when support is on). Demand-only cuts often pass depth and speed without
  // ever sparing a firm; end GDP then still favors fiat under this mechanism.
  const shockTick = 12;
  const horizon = 72;
  const shock: ForcedShock = { tick: shockTick, kind: 'credit', size: 0.3 };
  const shared = {
    ...base,
    'scale.households': 60,
    'scale.firms': 6,
    'prices.trendWeight': 0,
    'production.demandWeight': 1,
    'wage.nominalRigidity': 0.9,
    'centralBank.stimulus': 1,
    'centralBank.stimulusLag': 3,
    'bank.capitalRatio': 0.04,
  };
  const fiat = run(
    { ...shared, 'regime.type': 'fiat', 'centralBank.zombieSupport': 1 },
    shockTick + horizon,
    shock,
  );
  const bitcoin = run(
    { ...shared, 'regime.type': 'bitcoin', 'centralBank.zombieSupport': 1 },
    shockTick + horizon,
    shock,
  );
  const fiatDepth = peakFrom(fiat, 'unemployment', shockTick);
  const bitcoinDepth = peakFrom(bitcoin, 'unemployment', shockTick);
  const fiatRecovery = monthsToRecover(fiat, 'unemployment', shockTick);
  const bitcoinRecovery = monthsToRecover(bitcoin, 'unemployment', shockTick);
  const fiatGdp = at(fiat, 'realGdp', shockTick + horizon - 1);
  const bitcoinGdp = at(bitcoin, 'realGdp', shockTick + horizon - 1);
  const deeper = bitcoinDepth.peak > fiatDepth.peak;
  const faster = bitcoinRecovery < fiatRecovery;
  const better = bitcoinGdp > fiatGdp;
  return {
    id: 'H10',
    claim:
      'A bitcoin crisis can trough deeper, recover sooner, and end with higher real GDP than fiat with zombie support.',
    supported: deeper && faster && better,
    detail: `peak u fiat ${fiatDepth.peak} bitcoin ${bitcoinDepth.peak}; recovery months fiat ${fiatRecovery} bitcoin ${bitcoinRecovery}; GDP fiat ${fiatGdp} bitcoin ${bitcoinGdp}`,
  };
}

function run(
  sliders: Record<string, number | string>,
  ticks = 36,
  shock: ForcedShock | null = null,
): SimulationResult {
  return simulate(loadScenario({ name: 'hypothesis', seed: 4, ticks, sliders }), shock);
}

function last(result: SimulationResult, id: MetricId): number {
  const values = result.metrics.series[id];
  return values[values.length - 1] ?? 0;
}

function at(result: SimulationResult, id: MetricId, tick: number): number {
  return result.metrics.series[id][tick] ?? 0;
}

function peakFrom(
  result: SimulationResult,
  id: MetricId,
  fromTick: number,
): { peak: number; tick: number } {
  const values = result.metrics.series[id];
  let peak = Number.NEGATIVE_INFINITY;
  let tick = fromTick;
  for (let index = fromTick; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    if (value > peak) {
      peak = value;
      tick = index;
    }
  }
  return { peak: Number.isFinite(peak) ? peak : 0, tick };
}

/** Months from the post-shock unemployment peak back to the pre-shock level. Never returns = Infinity. */
function monthsToRecover(result: SimulationResult, id: MetricId, shockTick: number): number {
  const values = result.metrics.series[id];
  const baseline = values[Math.max(0, shockTick - 1)] ?? 0;
  const { tick: peakTick } = peakFrom(result, id, shockTick);
  for (let index = peakTick; index < values.length; index += 1) {
    if ((values[index] ?? 0) <= baseline) {
      return index - peakTick;
    }
  }
  return Number.POSITIVE_INFINITY;
}
