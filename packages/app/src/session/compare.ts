import { getSlider, type Slider } from '../../../core/src/config/registry.js';
import { applyCategory } from './presets.js';
import { defaultPage } from './query.js';
import { assertSeedCount, MAX_SEEDS, MIN_SEEDS, readyLabel } from './run.js';
import { parameterSliders, sliderValue, writeSlider } from './sliders.js';
import type { RunSuccess } from '../worker/protocol.js';

export interface CompareSide {
  regime: string;
  overrides: Readonly<Record<string, number | string>>;
}

export interface CompareDiff {
  id: string;
  label: string;
  baseline: number | string;
  variant: number | string;
}

/** Scale, scoring, and inert assumptions held fixed while a baseline is pinned. */
const COMPARISON_FRAME = new Set([
  'scale.households',
  'scale.firms',
  'scale.banks',
  'welfare.housingSecurityWeight',
  'welfare.weightInequality',
  'welfare.weightMedianWealth',
  'welfare.weightWellbeing',
  'welfare.weightStability',
  'population.growth',
  'household.trustInBanks',
]);

export function comparisonFrame(id: string): boolean {
  return COMPARISON_FRAME.has(id);
}

/**
 * Rewrites only comparison-frame sliders on the live side to the baseline's
 * resolved values, so a variant cannot change the size or scoring of the run.
 */
export function alignComparisonFrame(
  sliders: readonly Slider[],
  live: CompareSide,
  baseline: CompareSide,
): CompareSide {
  let regime = live.regime;
  let overrides = { ...live.overrides };
  for (const slider of parameterSliders(sliders)) {
    if (!comparisonFrame(slider.id)) {
      continue;
    }
    const next = writeSlider(
      slider,
      String(sliderValue(slider, baseline.regime, baseline.overrides)),
      regime,
      overrides,
    );
    regime = next.regime;
    overrides = next.overrides;
  }
  return { regime, overrides };
}

/** Sliders whose resolved values differ between a pinned baseline and the live variant. */
export function compareDiffs(
  sliders: readonly Slider[],
  baseline: CompareSide,
  variant: CompareSide,
): CompareDiff[] {
  const diffs: CompareDiff[] = [];
  for (const slider of parameterSliders(sliders)) {
    const left = sliderValue(slider, baseline.regime, baseline.overrides);
    const right = sliderValue(slider, variant.regime, variant.overrides);
    if (String(left) === String(right)) {
      continue;
    }
    diffs.push({
      id: slider.id,
      label: slider.label,
      baseline: left,
      variant: right,
    });
  }
  return diffs;
}

export const IDLE_STATUS = 'Set the parameters and run.';

const FRAME_STATUS =
  'Baseline pinned. Edit parameters and run a variant. Scale, scoring, population growth, and trust in banks stay at the baseline.';

const PROMOTE_STATUS =
  'Variant is now the baseline. Scale, scoring, population growth, and trust in banks stay at the baseline.';

/** Census falls back here only when a resolved slider is not a finite number. */
const CENSUS_HOUSEHOLDS_FALLBACK = 1000;
const CENSUS_OWNERSHIP_FALLBACK = 0.5;

export interface ComparisonSession {
  seed: number;
  ticks: number;
  seeds: number;
  regime: string;
  overrides: Record<string, number | string>;
  shownRegime: string;
  shownOverrides: Record<string, number | string>;
  pendingRegime: string;
  pendingOverrides: Record<string, number | string>;
  result: RunSuccess | null;
  pin: PinnedBaseline | null;
}

interface PinnedBaseline {
  result: RunSuccess;
  regime: string;
  overrides: Record<string, number | string>;
  seed: number;
  ticks: number;
}

export interface ComparisonSide {
  result: RunSuccess;
  regime: string;
  households: number;
  ownership: number;
  /** Resolved transition.lengthMonths for chart marks. */
  transitionLength: number;
}

export interface ComparisonBundle {
  variant: ComparisonSide | null;
  baseline: ComparisonSide | null;
}

export interface SessionUpdate {
  session: ComparisonSession;
  status?: string;
}

export interface PreparedRun {
  blocked: boolean;
  session: ComparisonSession;
}

export function openComparisonSession(input: {
  seed: number;
  ticks: number;
  seeds?: number;
  regime: string;
  overrides: Record<string, number | string>;
}): ComparisonSession {
  const seeds = input.seeds ?? 1;
  assertSeedCount(seeds);
  const overrides = { ...input.overrides };
  return {
    seed: input.seed,
    ticks: input.ticks,
    seeds,
    regime: input.regime,
    overrides,
    shownRegime: input.regime,
    shownOverrides: { ...overrides },
    pendingRegime: input.regime,
    pendingOverrides: { ...overrides },
    result: null,
    pin: null,
  };
}

export function setSeed(session: ComparisonSession, seed: number): ComparisonSession {
  return retarget(session, seed, session.ticks, session.seeds);
}

export function setTicks(session: ComparisonSession, ticks: number): ComparisonSession {
  return retarget(session, session.seed, ticks, session.seeds);
}

export function setSeeds(session: ComparisonSession, seeds: number): ComparisonSession {
  if (!Number.isSafeInteger(seeds) || seeds < MIN_SEEDS || seeds > MAX_SEEDS) {
    return session;
  }
  return retarget(session, session.seed, session.ticks, seeds);
}

export function editSlider(
  session: ComparisonSession,
  slider: Slider,
  raw: string,
): ComparisonSession {
  if (session.pin !== null && comparisonFrame(slider.id)) {
    return session;
  }
  return writeSide(session, writeSlider(slider, raw, session.regime, session.overrides));
}

export function editRegime(session: ComparisonSession, regime: string): ComparisonSession {
  return { ...session, regime };
}

export function editCategory(
  session: ComparisonSession,
  categoryId: string,
  optionId: string,
): ComparisonSession {
  return writeSide(session, applyCategory(categoryId, optionId, session.regime, session.overrides));
}

export function resetDiffToBaseline(session: ComparisonSession, id: string): ComparisonSession {
  if (session.pin === null) {
    return session;
  }
  const slider = getSlider(id);
  const baselineValue = sliderValue(slider, session.pin.regime, session.pin.overrides);
  return writeSide(
    session,
    writeSlider(slider, String(baselineValue), session.regime, session.overrides),
  );
}

export function pinBaseline(session: ComparisonSession, sliders: readonly Slider[]): SessionUpdate {
  const pinned = capture(session);
  if (pinned === null) {
    return { session };
  }
  return { session: snap(session, sliders, pinned), status: FRAME_STATUS };
}

export function clearBaseline(session: ComparisonSession): SessionUpdate {
  const status = session.result === null ? IDLE_STATUS : readyLabel();
  return { session: { ...session, pin: null }, status };
}

export function resetToDefaults(): SessionUpdate {
  return { session: openComparisonSession(defaultPage()), status: IDLE_STATUS };
}

export function promoteBaseline(
  session: ComparisonSession,
  sliders: readonly Slider[],
): SessionUpdate {
  const pinned = capture(session);
  if (pinned === null) {
    return { session };
  }
  return { session: snap(session, sliders, pinned), status: PROMOTE_STATUS };
}

export function prepareRun(session: ComparisonSession, sliders: readonly Slider[]): PreparedRun {
  if (session.pin === null) {
    return { blocked: false, session };
  }
  const aligned = alignComparisonFrame(sliders, liveSide(session), pinSide(session.pin));
  return { blocked: false, session: writeSide(session, aligned) };
}

export function notePosted(session: ComparisonSession): ComparisonSession {
  return {
    ...session,
    pendingRegime: session.regime,
    pendingOverrides: { ...session.overrides },
  };
}

export function noteResult(session: ComparisonSession, result: RunSuccess): ComparisonSession {
  return {
    ...session,
    shownRegime: session.pendingRegime,
    shownOverrides: { ...session.pendingOverrides },
    result,
  };
}

export function noteFailure(session: ComparisonSession): ComparisonSession {
  return { ...session, result: null };
}

export function canPinBaseline(session: ComparisonSession): boolean {
  return session.result !== null;
}

export function canPromoteBaseline(session: ComparisonSession): boolean {
  return session.pin !== null && session.result !== null && session.result !== session.pin.result;
}

export function isPinned(session: ComparisonSession): boolean {
  return session.pin !== null;
}

export function comparisonDiffs(
  session: ComparisonSession,
  sliders: readonly Slider[],
): CompareDiff[] {
  if (session.pin === null) {
    return [];
  }
  return compareDiffs(sliders, pinSide(session.pin), liveSide(session));
}

export function comparisonBundle(session: ComparisonSession): ComparisonBundle {
  if (session.result === null) {
    return { variant: null, baseline: null };
  }
  return {
    variant: {
      result: session.result,
      regime: session.shownRegime,
      ...censusCounts(session.regime, session.overrides),
    },
    baseline: baselineView(session),
  };
}

function retarget(
  session: ComparisonSession,
  seed: number,
  ticks: number,
  seeds: number,
): ComparisonSession {
  const pin =
    session.pin !== null && (seed !== session.pin.seed || ticks !== session.pin.ticks)
      ? null
      : session.pin;
  if (
    seed === session.seed &&
    ticks === session.ticks &&
    seeds === session.seeds &&
    pin === session.pin
  ) {
    return session;
  }
  return { ...session, seed, ticks, seeds, pin };
}

function capture(session: ComparisonSession): PinnedBaseline | null {
  if (session.result === null) {
    return null;
  }
  return {
    result: session.result,
    regime: session.shownRegime,
    overrides: { ...session.shownOverrides },
    seed: session.seed,
    ticks: session.ticks,
  };
}

function snap(
  session: ComparisonSession,
  sliders: readonly Slider[],
  pin: PinnedBaseline,
): ComparisonSession {
  const aligned = alignComparisonFrame(sliders, liveSide(session), pinSide(pin));
  return { ...writeSide(session, aligned), pin };
}

function writeSide(
  session: ComparisonSession,
  side: { regime: string; overrides: Record<string, number | string> },
): ComparisonSession {
  return { ...session, regime: side.regime, overrides: side.overrides };
}

function liveSide(session: ComparisonSession): CompareSide {
  return { regime: session.regime, overrides: session.overrides };
}

function pinSide(pin: PinnedBaseline): CompareSide {
  return { regime: pin.regime, overrides: pin.overrides };
}

function baselineView(session: ComparisonSession): ComparisonSide | null {
  const pin = session.pin;
  const result = session.result;
  if (pin === null || result === null || result === pin.result) {
    return null;
  }
  return {
    result: pin.result,
    regime: pin.regime,
    ...censusCounts(pin.regime, pin.overrides),
  };
}

function censusCounts(
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): { households: number; ownership: number; transitionLength: number } {
  return {
    households: finiteNumber(
      sliderValue(getSlider('scale.households'), regime, overrides),
      CENSUS_HOUSEHOLDS_FALLBACK,
    ),
    ownership: finiteNumber(
      sliderValue(getSlider('ai.ownershipConcentration'), regime, overrides),
      CENSUS_OWNERSHIP_FALLBACK,
    ),
    transitionLength: Math.round(
      finiteNumber(sliderValue(getSlider('transition.lengthMonths'), regime, overrides), 0),
    ),
  };
}

function finiteNumber(value: number | string, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
