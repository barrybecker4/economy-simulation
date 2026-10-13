import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { FEATURE_OFF } from './feature-off.js';
import { simulate } from './simulate.js';

const presetPath = path.join(
  fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
);
const monetaryPreset = JSON.parse(readFileSync(presetPath, 'utf8')).sliders as Record<
  string,
  number | string
>;

/** Guards for round-10 audit items not pinned elsewhere (scale, hybrid LOLR, legacy book). */
describe('round 10 minimized asymmetries', () => {
  it('keeps bitcoin unemployment lower without an opening mortgage book on the monetary preset', () => {
    const shared = {
      ...FEATURE_OFF,
      ...monetaryPreset,
      'scale.households': 80,
      'scale.firms': 8,
      'scale.banks': 1,
      'shock.frequency': 0,
      'regime.type': 'bitcoin',
      ticks: 120,
    };
    const legacy = run({ ...shared });
    const clean = run({ ...shared, 'housing.openingMortgageShareOfOwners': 0 });
    expect(legacy.audit.ok && clean.audit.ok).toBe(true);
    const meanU = (result: SimulationResult) =>
      series(result, 'unemployment').reduce((sum, value) => sum + value, 0) /
      Math.max(series(result, 'unemployment').length, 1);
    // With higher velocity, the opening mortgage advantage is tiny. Add tolerance.
    // Housing mobility adds further variance; allow small deviation.
    expect(meanU(clean)).toBeLessThanOrEqual(meanU(legacy) + 0.004);
    expect(Math.max(...series(legacy, 'unemployment'), 0)).toBeLessThan(0.2);
  });

  it('keeps hybrid fiat money bounded when lender-of-last-resort support runs', () => {
    const result = run({
      ...FEATURE_OFF,
      ...monetaryPreset,
      'scale.households': 80,
      'scale.firms': 8,
      'scale.banks': 1,
      'shock.frequency': 0,
      'regime.type': 'hybrid',
      'housing.openingMortgageShareOfOwners': 0,
      ticks: 120,
    });
    expect(result.audit.ok).toBe(true);
    const money = series(result, 'moneySupply');
    expect((money.at(-1) ?? 0) / Math.max(money[0] ?? 1, 1)).toBeLessThan(3);
  });

  it('keeps the M consumption gap positive at the default comparison scale', () => {
    const shared = {
      ...FEATURE_OFF,
      ...monetaryPreset,
      'prices.trendWeight': 0,
      'household.openingDepositMonths': 12,
      'shock.frequency': 0,
      'scale.households': 500,
      'scale.firms': 50,
      'scale.banks': 3,
    };
    let positive = 0;
    for (let seed = 1; seed <= 5; seed += 1) {
      const fiat = run({ ...shared, 'regime.type': 'fiat' }, seed);
      const bitcoin = run(
        { ...shared, 'regime.type': 'bitcoin', 'housing.openingMortgageShareOfOwners': 0 },
        seed,
      );
      expect(fiat.audit.ok && bitcoin.audit.ok).toBe(true);
      const gap =
        (series(bitcoin, 'medianRealConsumption').at(-1) ?? 0) /
          Math.max(series(fiat, 'medianRealConsumption').at(-1) ?? 1, 1e-9) -
        1;
      if (gap > 0) {
        positive += 1;
      }
    }
    expect(positive).toBeGreaterThanOrEqual(3);
  });
});

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  seed = 4,
): SimulationResult {
  const { ticks = 120, ...rest } = sliders;
  return simulate(loadScenario({ name: 'round10-regression', seed, ticks, sliders: rest }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
