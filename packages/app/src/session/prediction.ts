import type { MetricId } from '../../../core/src/metrics/metrics.js';
import type { RunSuccess } from '../worker/protocol.js';
import type { Lesson } from './lessons.js';
import { endingDirection } from './snapshot.js';

export interface PredictionFeedback {
  /** Whether the student's guess matched the run. Null when there is no score yet. */
  matched: boolean | null;
  message: string;
}

/** Map a guess id to the metric ending the student was asked about. */
export function predictionOutcome(
  lesson: Lesson,
  guessId: string,
  baseline: RunSuccess | null,
  variant: RunSuccess,
): PredictionFeedback {
  if (lesson.id === 'prices') {
    return pricesOutcome(guessId, variant);
  }
  if (baseline === null) {
    return {
      matched: null,
      message: 'Try a change below the guess. It runs as soon as you pick one.',
    };
  }
  if (lesson.id === 'interest') {
    return rateGuess(guessId, endingDirection(baseline, variant, 'interestRate'));
  }
  if (lesson.id === 'deficit' || lesson.id === 'bitcoin') {
    return pricesGuess(guessId, endingDirection(baseline, variant, 'priceLevel'));
  }
  if (lesson.id === 'gains') {
    return grantGuess(guessId, endingDirection(baseline, variant, 'ubiOutlay'));
  }
  return { matched: null, message: 'Compare the charts to your guess.' };
}

function pricesOutcome(guessId: string, result: RunSuccess): PredictionFeedback {
  const apparel = change(result, 'priceApparel');
  const electronics = change(result, 'priceElectronics');
  const housing = change(result, 'priceHousing');
  const medical = change(result, 'priceMedical');
  const cheap = apparel < 0 && electronics < 0;
  const shelterUp = housing > 0 || medical > 0;
  const happened =
    cheap && shelterUp
      ? 'Apparel and electronics got cheaper while housing or medical care rose.'
      : cheap
        ? 'Apparel and electronics got cheaper.'
        : 'The category paths did not split the way this lab usually shows.';
  const matched = guessId === 'apparel-electronics' && cheap;
  return scored(matched, happened);
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

function rateGuess(
  guessId: string,
  direction: 'higher' | 'lower' | 'same',
): PredictionFeedback {
  const happened =
    direction === 'higher'
      ? 'The policy rate ended higher.'
      : direction === 'lower'
        ? 'The policy rate ended lower.'
        : 'The policy rate ended about the same.';
  const matched =
    (guessId === 'rate-up' && direction === 'higher') ||
    (guessId === 'rate-down' && direction === 'lower') ||
    (guessId === 'rate-same' && direction === 'same');
  return scored(matched, happened);
}

function pricesGuess(
  guessId: string,
  direction: 'higher' | 'lower' | 'same',
): PredictionFeedback {
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
  return scored(matched, happened);
}

function grantGuess(
  guessId: string,
  direction: 'higher' | 'lower' | 'same',
): PredictionFeedback {
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
  return scored(matched, happened);
}

function scored(matched: boolean, happened: string): PredictionFeedback {
  return {
    matched,
    message: matched ? `Your guess matched. ${happened}` : `Your guess did not match. ${happened}`,
  };
}
