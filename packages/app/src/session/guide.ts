import type { ComparisonSession } from './compare.js';

export const GUIDE_STORAGE_KEY = 'economy-simulation.guide';

export const GUIDE_STEPS = [
  'Press Run. Charts below show one path of the economy for the months you set. Seed picks the random path. More than one seed charts the median.',
  'Under Parameters, change the regime or a preset, then run again. Expand a group to move its sliders. A dotted name explains that control.',
  'Press Pin as baseline, change one assumption, and run again. Charts draw both paths, and each caption says how the variant differs.',
  'The address bar keeps the seed and sliders, so a link reopens the same settings.',
] as const;

export const NEXT_RUN =
  'Press Run. Charts of prices, jobs, and welfare appear below.';
export const NEXT_RERUN = 'These settings differ from the charts. Press Run again.';
export const NEXT_PIN =
  'Pin this run, then change the regime or a preset and run again to compare.';
export const NEXT_CHANGE =
  'Change a preset or slider, then Run. The new path overlays the baseline.';
export const NEXT_READ = 'Each chart caption compares the variant with the baseline.';

/** Missing or unreadable storage means open; only the closed token closes it. */
export function guideOpenFromStorage(raw: string | null | undefined): boolean {
  return raw !== 'closed';
}

export function nextStep(session: ComparisonSession): string {
  if (session.result === null) {
    return NEXT_RUN;
  }
  if (settingsDifferFromShown(session)) {
    return NEXT_RERUN;
  }
  if (session.pin === null) {
    return NEXT_PIN;
  }
  if (session.result === session.pin.result) {
    return NEXT_CHANGE;
  }
  return NEXT_READ;
}

function settingsDifferFromShown(session: ComparisonSession): boolean {
  if (
    session.seed !== session.shownSeed ||
    session.ticks !== session.shownTicks ||
    session.seeds !== session.shownSeeds ||
    session.regime !== session.shownRegime
  ) {
    return true;
  }
  return !sameOverrides(session.overrides, session.shownOverrides);
}

function sameOverrides(
  left: Readonly<Record<string, number | string>>,
  right: Readonly<Record<string, number | string>>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const key of leftKeys) {
    if (String(left[key]) !== String(right[key])) {
      return false;
    }
  }
  return true;
}
