import type { MetricId } from '../../../core/src/metrics/metrics.js';
import type { RunSuccess } from '../worker/protocol.js';
import type { Lesson } from './lessons.js';
import { endingDirection } from './snapshot.js';

/** Map a guess id to the metric ending the student was asked about. */
export function predictionOutcome(
  lesson: Lesson,
  guessId: string,
  baseline: RunSuccess | null,
  variant: RunSuccess,
): string {
  if (lesson.id === 'prices') {
    return pricesOutcome(guessId, variant);
  }
  if (baseline === null) {
    return 'Run the baseline first, then the scenario.';
  }
  if (lesson.id === 'interest') {
    return jobsGuess(guessId, endingDirection(baseline, variant, 'unemployment'));
  }
  if (lesson.id === 'deficit' || lesson.id === 'bitcoin') {
    return pricesGuess(guessId, endingDirection(baseline, variant, 'priceLevel'));
  }
  if (lesson.id === 'gains') {
    return grantGuess(guessId, endingDirection(baseline, variant, 'ubiOutlay'));
  }
  return 'Compare the charts to your guess.';
}

function pricesOutcome(guessId: string, result: RunSuccess): string {
  const apparel = change(result, 'priceApparel');
  const electronics = change(result, 'priceElectronics');
  const housing = change(result, 'priceHousing');
  const medical = change(result, 'priceMedical');
  const cheap = apparel < 0 && electronics < 0;
  const shelterUp = housing > 0 || medical > 0;
  const happened = cheap && shelterUp
    ? 'Apparel and electronics got cheaper while housing or medical care rose.'
    : cheap
      ? 'Apparel and electronics got cheaper.'
      : 'The category paths did not split the way this lab usually shows.';
  if (guessId === 'apparel-electronics' && cheap) {
    return `Your guess matched. ${happened}`;
  }
  if (guessId === 'housing-medical' && !cheap) {
    return `Your guess did not match. ${happened}`;
  }
  if (guessId === 'all-rise') {
    return `Your guess did not match. ${happened}`;
  }
  return `Your guess did not match. ${happened}`;
}

function change(result: RunSuccess, id: MetricId): number {
  const series = result.kind === 'band' ? result.bands[id]?.mid : result.series[id];
  if (series === undefined || series.length === 0) {
    return 0;
  }
  const open = series[0] ?? 0;
  const end = series[series.length - 1] ?? 0;
  return end - open;
}

function jobsGuess(
  guessId: string,
  direction: 'higher' | 'lower' | 'same',
): string {
  const happened =
    direction === 'higher'
      ? 'Unemployment ended higher.'
      : direction === 'lower'
        ? 'Unemployment ended lower.'
        : 'Unemployment ended about the same.';
  const matched =
    (guessId === 'jobs-worse' && direction === 'higher') ||
    (guessId === 'jobs-better' && direction === 'lower') ||
    (guessId === 'jobs-same' && direction === 'same');
  return matched ? `Your guess matched. ${happened}` : `Your guess did not match. ${happened}`;
}

function pricesGuess(
  guessId: string,
  direction: 'higher' | 'lower' | 'same',
): string {
  const happened =
    direction === 'higher'
      ? 'Prices ended higher.'
      : direction === 'lower'
        ? 'Prices ended lower.'
        : 'Prices ended about the same.';
  const matched =
    (guessId === 'prices-up' && direction === 'higher') ||
    (guessId === 'prices-down' && direction === 'lower') ||
    (guessId === 'prices-same' && direction === 'same');
  return matched ? `Your guess matched. ${happened}` : `Your guess did not match. ${happened}`;
}

function grantGuess(
  guessId: string,
  direction: 'higher' | 'lower' | 'same',
): string {
  const happened =
    direction === 'higher'
      ? 'The household grant rose.'
      : direction === 'lower'
        ? 'The household grant fell.'
        : 'The household grant stayed about the same.';
  const matched =
    (guessId === 'grant-rises' && direction === 'higher') ||
    (guessId === 'grant-falls' && direction === 'lower') ||
    (guessId === 'grant-zero' && direction === 'same');
  return matched ? `Your guess matched. ${happened}` : `Your guess did not match. ${happened}`;
}
