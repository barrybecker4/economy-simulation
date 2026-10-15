import { describe, expect, it } from 'vitest';
import { requireLesson } from './lessons.js';
import { defaultPage, pageSearch, parsePageState } from './query.js';

describe('parsePageState', () => {
  it('uses the page defaults when the query is empty', () => {
    expect(parsePageState('')).toEqual(defaultPage());
  });

  it('round-trips a page through the query string', () => {
    const state = {
      seed: 4,
      ticks: 36,
      seeds: 5,
      regime: 'bitcoin',
      overrides: { 'firm.markup': 0.4, 'bitcoin.lendingModel': 'fullReserve' },
      lesson: null as string | null,
    };
    expect(parsePageState(`?${pageSearch(state)}`)).toEqual(state);
  });

  it('omits the default seed count from the query string', () => {
    expect(pageSearch({ ...defaultPage(), seed: 2, ticks: 24 })).toBe(
      'seed=2&ticks=24&regime=fiat',
    );
  });

  it('drops an override that restates the default', () => {
    const state = parsePageState('?firm.markup=0.2');
    expect(state.overrides).toEqual({});
    expect(state.lesson).toBeNull();
  });

  it('opens the deficit lesson link on the lesson baseline', () => {
    const deficit = requireLesson('deficit');
    const state = parsePageState('?lesson=deficit');
    expect(state.lesson).toBe('deficit');
    expect(state.ticks).toBe(48);
    expect(state.regime).toBe(deficit.baseline.regime);
    expect(state.overrides).toEqual(deficit.baseline.overrides);
  });

  it('ignores a query parameter whose name starts with an underscore', () => {
    expect(parsePageState('?_ijt=abc&firm.markup=0.4')).toEqual({
      ...defaultPage(),
      overrides: { 'firm.markup': 0.4 },
    });
  });

  it('opens a lesson link on the lesson baseline', () => {
    const gains = requireLesson('gains');
    const state = parsePageState('?lesson=gains');
    expect(state.lesson).toBe('gains');
    expect(state.ticks).toBe(120);
    expect(state.regime).toBe(gains.baseline.regime);
    expect(state.overrides).toEqual(gains.baseline.overrides);
  });

  it('keeps the lesson id and lever when the query carries overrides', () => {
    const interest = requireLesson('interest');
    const hawkish = {
      seed: 1,
      ticks: 120,
      seeds: 1,
      regime: 'fiat' as string,
      overrides: { ...interest.baseline.overrides, 'centralBank.inflationWeight': 2.5 },
      lesson: 'interest' as string | null,
    };
    const roundTrip = parsePageState(`?${pageSearch(hawkish)}`);
    expect(roundTrip.lesson).toBe('interest');
    expect(roundTrip.overrides['centralBank.inflationWeight']).toBe(2.5);
  });

  it('rejects a bad seed, tick count, seed count, regime, lesson, number, option, duplicate, or unknown key', () => {
    expect(() => parsePageState('?seed=-1')).toThrow(/Seed/);
    expect(() => parsePageState('?ticks=0')).toThrow(/Ticks/);
    expect(() => parsePageState('?seeds=0')).toThrow(/Seed count/);
    expect(() => parsePageState('?seeds=21')).toThrow(/Seed count/);
    expect(() => parsePageState('?regime=gold')).toThrow(/regime.type/);
    expect(() => parsePageState('?lesson=missing')).toThrow(/Unknown lesson/);
    expect(() => parsePageState('?firm.markup=nope')).toThrow(/finite number/);
    expect(() => parsePageState('?firm.markup=9')).toThrow(/between/);
    expect(() => parsePageState('?bitcoin.lendingModel=nope')).toThrow(/one of/);
    expect(() => parsePageState('?seed=1&seed=2')).toThrow(/Duplicate/);
    expect(() => parsePageState('?missing=1')).toThrow(/Unknown slider missing/);
    expect(() => parsePageState('?regime.type=fiat')).toThrow(/regime parameter/);
  });
});
