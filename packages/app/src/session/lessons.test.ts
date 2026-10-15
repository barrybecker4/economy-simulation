import { describe, expect, it } from 'vitest';
import { matchingCategoryOption } from '../../../core/src/config/presets.js';
import {
  applyLessonLever,
  gainsBaselineMatchesWorld,
  LESSONS,
  lessonById,
  lessonPageState,
  lessonRunTicks,
  matchingLessonChoice,
  requireLesson,
  worldPlainSentences,
} from './lessons.js';

describe('lessons', () => {
  it('registers five classroom labs', () => {
    expect(LESSONS.map((lesson) => lesson.id)).toEqual([
      'prices',
      'interest',
      'deficit',
      'bitcoin',
      'gains',
    ]);
  });

  it('gives every scenario world a plain sentence', () => {
    for (const world of worldPlainSentences()) {
      expect(world.plain.length).toBeGreaterThan(10);
    }
  });

  it('opens each lesson on its baseline lever', () => {
    for (const lesson of LESSONS) {
      const page = lessonPageState(lesson);
      expect(page.lesson).toBe(lesson.id);
      expect(page.ticks).toBe(lessonRunTicks(lesson));
      expect(page.seeds).toBe(1);
      expect(page.regime).toBe(lesson.baseline.regime);
      expect(matchingLessonChoice(lesson, page.regime, page.overrides)).toBe(
        lesson.control.baselineId,
      );
    }
  });

  it('applies the interest hawkish lever as an inflation-weight patch only', () => {
    const lesson = requireLesson('interest');
    const side = applyLessonLever(lesson, 'hawkish');
    expect(side.regime).toBe('fiat');
    expect(side.overrides['centralBank.inflationWeight']).toBe(2.5);
    expect(side.overrides['centralBank.outputWeight']).toBeUndefined();
    expect(side.overrides['centralBank.bondPurchaseShare']).toBeUndefined();
    expect(matchingLessonChoice(lesson, side.regime, side.overrides)).toBe('hawkish');
  });

  it('applies the deficit lever as higher purchases on the lesson world', () => {
    const lesson = requireLesson('deficit');
    const side = applyLessonLever(lesson, 'deficit-spending');
    expect(side.overrides['government.spendingShareOfGDP']).toBe(0.35);
    expect(side.overrides['tax.incomeRate']).toBe(0.2);
    expect(matchingLessonChoice(lesson, side.regime, side.overrides)).toBe('deficit-spending');
  });

  it('switches the bitcoin lesson by regime only', () => {
    const lesson = requireLesson('bitcoin');
    const side = applyLessonLever(lesson, 'bitcoin');
    expect(side.regime).toBe('bitcoin');
    expect(side.overrides).toEqual(lesson.baseline.overrides);
  });

  it('restores the gains baseline when the baseline lever id is chosen', () => {
    const lesson = requireLesson('gains');
    expect(applyLessonLever(lesson, lesson.control.baselineId)).toEqual(lesson.baseline);
  });

  it('resolves modest AI differently from the no-AI gains baseline', () => {
    const lesson = requireLesson('gains');
    const modest = applyLessonLever(lesson, 'modest');
    expect(modest.overrides).not.toEqual(lesson.baseline.overrides);
    expect(matchingCategoryOption('aiBullishness', modest.overrides)).toBe('modest');
    expect(matchingCategoryOption('aiBullishness', lesson.baseline.overrides)).toBe('none');
  });

  it('applies the gains lever as AI bullishness on the no-AI baseline', () => {
    const lesson = requireLesson('gains');
    const side = applyLessonLever(lesson, 'extreme');
    expect(matchingCategoryOption('aiBullishness', side.overrides)).toBe('extreme');
    expect(matchingCategoryOption('publicFinance', side.overrides)).toBe('ai-dividend');
    expect(matchingLessonChoice(lesson, side.regime, side.overrides)).toBe('extreme');
    expect(gainsBaselineMatchesWorld()).toBe(true);
  });

  it('rejects an unknown lesson or lever', () => {
    expect(lessonById('missing')).toBeNull();
    expect(() => requireLesson('missing')).toThrow(/Unknown lesson/);
    expect(() => applyLessonLever(requireLesson('interest'), 'monetizing')).toThrow(
      /Unknown option/,
    );
  });
});
