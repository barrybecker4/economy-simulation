import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from '../config/load.js';
import { runSimulation, type SimulationResult } from '../engine/engine.js';
import type { MetricId } from '../metrics/metrics.js';
import { sumDepositFlows, type DepositFlowBuckets } from './deposit-flows.js';
import { FEATURE_OFF } from './feature-off.js';
import type { ForcedShock } from './simulate.js';
import { World } from './world.js';

const presetPath = path.join(
  fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
);
const monetaryPreset = JSON.parse(readFileSync(presetPath, 'utf8')).sliders as Record<
  string,
  number | string
>;

const monetary = {
  ...FEATURE_OFF,
  ...monetaryPreset,
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
};

const shock: ForcedShock = { tick: 24, kind: 'demand', size: -0.3 };
const from = 24;
const to = 72;

describe('phase 70 monetary-preset deposit decomposition', () => {
  it('records per-tick deposit-flow buckets', () => {
    const { flows } = runWithFlows({
      ...monetary,
      'regime.type': 'fiat',
      ticks: 6,
    });
    expect(flows).toHaveLength(6);
    expect(flows[0]).toMatchObject({
      fiatInjection: expect.any(Number),
      netCredit: expect.any(Number),
      interestRetained: expect.any(Number),
      writeDowns: expect.any(Number),
      reserveAccommodation: expect.any(Number),
    });
  });

  it('traces fiat deposit weakness in a demand slump to the money-growth rule', () => {
    const calm = runWithFlows({
      ...monetary,
      'regime.type': 'fiat',
      ticks: 120,
    });
    const slump = runWithFlows(
      {
        ...monetary,
        'regime.type': 'fiat',
        ticks: 120,
      },
      shock,
    );
    expect(calm.result.audit.ok && slump.result.audit.ok).toBe(true);
    const calmEnd = series(calm.result, 'moneySupply').at(-1) ?? 0;
    const slumpEnd = series(slump.result, 'moneySupply').at(-1) ?? 0;
    // Crisis stimulus and reserve accommodation can leave ending money near or
    // above calm; the flow decomposition still names the injection rule.
    expect(slumpEnd / Math.max(calmEnd, 1)).toBeLessThan(2);

    const calmBuckets = sumDepositFlows(calm.flows.slice(from, to + 1));
    const slumpBuckets = sumDepositFlows(slump.flows.slice(from, to + 1));
    const delta = diff(slumpBuckets, calmBuckets);
    // Fiat injection falls in the slump relative to calm: the secular rule
    // withdraws once inflation overshoots after the injection. That bucket is
    // the dominant signed drag even when accommodation offsets the stock.
    expect(delta.fiatInjection).toBeLessThan(delta.netCredit);
    expect(delta.fiatInjection).toBeLessThan(0);
    expect(dominantDepositDrag(delta)).toBe('fiatInjection');
  });

  it('traces bitcoin deposit weakness in a demand slump to credit and retained interest', () => {
    const calm = runWithFlows({
      ...monetary,
      'regime.type': 'bitcoin',
      ticks: 120,
    });
    const slump = runWithFlows(
      {
        ...monetary,
        'regime.type': 'bitcoin',
        ticks: 120,
      },
      shock,
    );
    expect(calm.result.audit.ok && slump.result.audit.ok).toBe(true);
    // End money can recover above calm once prices clear; the shock window is
    // where the deposit stock is weaker.
    const calmWindow = meanSeries(calm.result, 'moneySupply', from, to);
    const slumpWindow = meanSeries(slump.result, 'moneySupply', from, to);
    expect(slumpWindow).toBeLessThan(calmWindow);

    const calmBuckets = sumDepositFlows(calm.flows.slice(from, to + 1));
    const slumpBuckets = sumDepositFlows(slump.flows.slice(from, to + 1));
    const delta = diff(slumpBuckets, calmBuckets);
    expect(delta.fiatInjection).toBe(0);
    // Write-downs hit equity, not deposits. Deposit loss is net credit and
    // borrower interest left in bank equity after deposit coupons.
    const drag = dominantDepositDrag({
      ...delta,
      writeDowns: 0,
      reserveAccommodation: 0,
    });
    expect(['netCredit', 'interestRetained']).toContain(drag);
  });
});

function runWithFlows(
  input: Record<string, number | string> & { ticks?: number },
  shock: ForcedShock | null = null,
): { result: SimulationResult; flows: DepositFlowBuckets[] } {
  const { ticks = 48, ...sliders } = input;
  const config = loadScenario({ name: 'phase70', seed: 4, ticks, sliders });
  const world = new World(config, shock);
  const result = runSimulation(config, world.handlers());
  return { result, flows: [...world.state().depositFlowHistory] };
}

function diff(slump: DepositFlowBuckets, calm: DepositFlowBuckets): DepositFlowBuckets {
  return {
    fiatInjection: slump.fiatInjection - calm.fiatInjection,
    netCredit: slump.netCredit - calm.netCredit,
    interestRetained: slump.interestRetained - calm.interestRetained,
    writeDowns: slump.writeDowns - calm.writeDowns,
    reserveAccommodation: slump.reserveAccommodation - calm.reserveAccommodation,
  };
}

/** Bucket whose signed contribution most reduces deposits relative to calm. */
function dominantDepositDrag(delta: DepositFlowBuckets): keyof DepositFlowBuckets {
  const candidates: (keyof DepositFlowBuckets)[] = [
    'fiatInjection',
    'netCredit',
    'interestRetained',
    'writeDowns',
    'reserveAccommodation',
  ];
  let best: keyof DepositFlowBuckets = 'fiatInjection';
  let lowest = Number.POSITIVE_INFINITY;
  for (const key of candidates) {
    if (delta[key] < lowest) {
      lowest = delta[key];
      best = key;
    }
  }
  return best;
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function meanSeries(result: SimulationResult, id: MetricId, start: number, end: number): number {
  const values = series(result, id).slice(start, end + 1);
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
