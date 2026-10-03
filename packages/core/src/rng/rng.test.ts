import { describe, expect, it } from 'vitest';
import { Rng } from './rng.js';

describe('Rng', () => {
  it('repeats a stream for the same seed', () => {
    const left = new Rng(42);
    const right = new Rng(42);
    const draws = Array.from({ length: 8 }, () => left.uniform());
    expect(draws).toEqual(Array.from({ length: 8 }, () => right.uniform()));
  });

  it('draws uniforms on the unit interval', () => {
    const rng = new Rng(7);
    for (let index = 0; index < 1000; index += 1) {
      const draw = rng.uniform();
      expect(draw).toBeGreaterThanOrEqual(0);
      expect(draw).toBeLessThan(1);
    }
  });

  it('keeps an agent stream stable when another agent draws more', () => {
    const baseline = new Rng(5).fork(2);
    const expected = [
      baseline.uniform(),
      baseline.uniform(),
      baseline.uniform(),
      baseline.normal(0, 1),
    ];

    const root = new Rng(5);
    const neighbor = root.fork(1);
    neighbor.uniform();
    neighbor.poisson(3);
    neighbor.weightedIndex([1, 2, 3]);
    const agent = root.fork(2);
    expect([agent.uniform(), agent.uniform(), agent.uniform(), agent.normal(0, 1)]).toEqual(
      expected,
    );
  });

  it('keeps existing streams stable when a new agent stream is added', () => {
    const expected = new Rng(5).fork(2).uniform();
    const root = new Rng(5);
    root.fork(99).lognormal(0, 0.2);
    expect(root.fork(2).uniform()).toBe(expected);
  });

  it('does not change forks when the root stream is used', () => {
    const expected = new Rng(5).fork(2).uniform();
    const root = new Rng(5);
    root.uniform();
    root.normal(1, 2);
    expect(root.fork(2).uniform()).toBe(expected);
  });

  it('draws different values for different seeds', () => {
    expect(new Rng(1).uniform()).not.toBe(new Rng(2).uniform());
  });

  it('rejects a zero weight and a negative lambda', () => {
    const rng = new Rng(1);
    expect(() => rng.weightedIndex([0, 0])).toThrow(/positive/);
    expect(() => rng.poisson(-1)).toThrow(/non-negative/);
    expect(rng.poisson(0)).toBe(0);
  });

  it('never selects a zero weight', () => {
    const rng = new Rng(3);
    for (let index = 0; index < 40; index += 1) {
      expect(rng.weightedIndex([0, 1, 0])).toBe(1);
    }
  });

  it('returns inclusive integer bounds', () => {
    const rng = new Rng(9);
    for (let index = 0; index < 100; index += 1) {
      const draw = rng.uniformInt(2, 4);
      expect(draw).toBeGreaterThanOrEqual(2);
      expect(draw).toBeLessThanOrEqual(4);
      expect(Number.isInteger(draw)).toBe(true);
    }
  });
});
