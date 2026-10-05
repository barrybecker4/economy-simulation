import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { canonicalJson, toResultRecord } from '../output/canonical.js';
import { runSimulation, type PhaseHandlers } from './engine.js';
import { TICK_PHASES } from './phases.js';

describe('runSimulation', () => {
  it('runs phases in the fixed order', () => {
    const seen: string[] = [];
    const config = loadScenario({ name: 'order', seed: 1, ticks: 1 });
    runSimulation(config, {
      shocks: () => seen.push('shocks'),
      populationMix: () => seen.push('populationMix'),
      laborMarket: () => seen.push('laborMarket'),
      production: () => seen.push('production'),
      goodsAndAssets: () => seen.push('goodsAndAssets'),
      contractChoice: () => seen.push('contractChoice'),
      credit: () => seen.push('credit'),
      government: () => seen.push('government'),
      centralBank: () => seen.push('centralBank'),
      bookkeeping: () => seen.push('bookkeeping'),
      welfare: () => seen.push('welfare'),
    });
    expect(seen).toEqual([...TICK_PHASES]);
  });

  it('hashes identical output for the same seed and scenario', () => {
    const config = loadScenario({ name: 'hash', seed: 3, ticks: 4 });
    const left = hashRun(config.seed);
    const right = hashRun(config.seed);
    expect(left).toBe(right);
    expect(hashRun(4)).not.toBe(left);
  });

  it('records a seeded draw without changing the other seed', () => {
    const handlers: PhaseHandlers = {
      shocks(ctx) {
        ctx.metrics.set('priceLevel', ctx.rng.fork(1).uniform());
      },
    };
    const first = runSimulation(loadScenario({ name: 'draw', seed: 11, ticks: 2 }), handlers);
    const second = runSimulation(loadScenario({ name: 'draw', seed: 11, ticks: 2 }), handlers);
    expect(first.metrics.series.priceLevel).toEqual(second.metrics.series.priceLevel);
    expect(first.metrics.series.priceLevel[0]).not.toBe(
      runSimulation(loadScenario({ name: 'draw', seed: 12, ticks: 1 }), handlers).metrics.series
        .priceLevel[0],
    );
    expect(first.metrics.series.auditOk).toEqual([1, 1]);
  });

  it('reports each completed tick without changing the recorded metrics', () => {
    const seen: Array<[number, number]> = [];
    const config = loadScenario({ name: 'progress', seed: 1, ticks: 3 });
    const withProgress = runSimulation(config, {}, (completed, total) => {
      seen.push([completed, total]);
    });
    const plain = runSimulation(config, {});
    expect(seen).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
    expect(withProgress.metrics).toEqual(plain.metrics);
    expect(withProgress.audit).toEqual(plain.audit);
  });

  it('audits a fractional satoshi posting made during bookkeeping', () => {
    const result = runSimulation(
      loadScenario({
        name: 'sats',
        seed: 1,
        ticks: 1,
        sliders: { 'regime.type': 'bitcoin' },
      }),
      {
        bookkeeping(ctx) {
          ctx.ledger.open('issuer', 'liability');
          ctx.ledger.open('holder', 'asset');
          ctx.ledger.issue('issuer', 'holder', 1e-12);
        },
      },
    );
    expect(result.unit).toBe('satoshi');
    expect(result.audit.ok).toBe(true);
    expect(result.metrics.series.auditOk).toEqual([1]);
  });
});

function hashRun(seed: number): string {
  const result = runSimulation(loadScenario({ name: 'hash', seed, ticks: 4 }), {
    shocks(ctx) {
      ctx.metrics.set('priceLevel', ctx.rng.fork('probe').uniform());
    },
  });
  return createHash('sha256')
    .update(canonicalJson(toResultRecord(result)))
    .digest('hex');
}
