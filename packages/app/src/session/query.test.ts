import { describe, expect, it } from 'vitest';
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
    };
    expect(parsePageState(`?${pageSearch(state)}`)).toEqual(state);
  });

  it('omits the default seed count from the query string', () => {
    expect(pageSearch({ ...defaultPage(), seed: 2, ticks: 24 })).toBe(
      'seed=2&ticks=24&regime=fiat&bank.capitalRatio=0.04&bank.depositPassThrough=1&credit.endogenousWeight=1&credit.leverageStart=1&expectations.anchorWeight=0.5&household.openingDepositMonths=12&housing.tenureChoice=on&prices.trendWeight=0&production.demandWeight=1',
    );
  });

  it('drops an override that restates the default', () => {
    const state = parsePageState('?firm.markup=0.2');
    expect(state.overrides).toEqual({});
  });

  it('ignores a query parameter whose name starts with an underscore', () => {
    expect(parsePageState('?_ijt=abc&firm.markup=0.4')).toEqual({
      ...defaultPage(),
      overrides: { 'firm.markup': 0.4 },
    });
  });

  it('rejects a bad seed, tick count, seed count, regime, number, option, duplicate, or unknown key', () => {
    expect(() => parsePageState('?seed=-1')).toThrow(/Seed/);
    expect(() => parsePageState('?ticks=0')).toThrow(/Ticks/);
    expect(() => parsePageState('?seeds=0')).toThrow(/Seed count/);
    expect(() => parsePageState('?seeds=21')).toThrow(/Seed count/);
    expect(() => parsePageState('?regime=gold')).toThrow(/regime.type/);
    expect(() => parsePageState('?firm.markup=nope')).toThrow(/finite number/);
    expect(() => parsePageState('?firm.markup=9')).toThrow(/between/);
    expect(() => parsePageState('?bitcoin.lendingModel=nope')).toThrow(/one of/);
    expect(() => parsePageState('?seed=1&seed=2')).toThrow(/Duplicate/);
    expect(() => parsePageState('?missing=1')).toThrow(/Unknown slider missing/);
    expect(() => parsePageState('?regime.type=fiat')).toThrow(/regime parameter/);
  });
});
