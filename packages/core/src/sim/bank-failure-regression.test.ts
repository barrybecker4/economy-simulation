import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from '../config/load.js';
import { simulate } from './simulate.js';
import type { SimulationResult } from '../engine/engine.js';
import type { MetricId } from '../metrics/metrics.js';

const presetPath = path.join(
  fileURLToPath(new URL('../../../../scenarios/presets/monetary.json', import.meta.url)),
);
const monetaryPreset = JSON.parse(readFileSync(presetPath, 'utf8')).sliders as Record<
  string,
  number | string
>;

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function run(
  sliders: Record<string, number | string> & { ticks?: number },
  seed: number,
): SimulationResult {
  const { ticks = 240, ...rest } = sliders;
  return simulate(
    loadScenario({ name: 'bank-failure-regression', seed, ticks, sliders: rest }),
    null,
  );
}

/**
 * Regression test for issue #11: bank failures under M bitcoin
 * 
 * Historical context:
 * - Pre-Phase-52: Banks could fail repeatedly in a "bail-in loop" where the same
 *   bank would go negative, get bailed in, then fail again next month.
 * - Phase 52 fix: bailIn() now checks if bank equity is already at the target 
 *   and leaves it alone if so, preventing repeated bail-ins.
 * 
 * Acceptance criteria (from issue #11):
 * - With shocks OFF: ≤ 0.5% failures per bank-year
 * - With shocks ON: ≤ 4% failures per bank-year  
 * 
 * For 4 banks over 20 years (240 months):
 * - Shocks off: ≤ 0.4 total failures
 * - Shocks on: ≤ 3.2 total failures
 */
describe('Regression: bank failure rates (issue #11)', () => {
  it('M bitcoin with shocks off stays under 0.5% per bank-year (median of 10 seeds)', () => {
    const results: number[] = [];
    
    for (let seed = 0; seed < 10; seed++) {
      const result = run({
        ...monetaryPreset,
        'regime.type': 'bitcoin',
        'shock.frequency': 0,
        ticks: 240,
      }, seed);
      
      expect(result.audit.ok).toBe(true);
      const failures = series(result, 'bankFailures').at(-1) ?? 0;
      results.push(failures);
    }
    
    const sorted = [...results].sort((a, b) => a - b);
    const median = sorted[5] ?? 0; // 10 seeds, so index 5 is median
    const perBankYear = median / 4 / 20; // 4 banks, 20 years
    
    console.log(`M bitcoin shocks off: median ${median} failures (${(perBankYear * 100).toFixed(3)}% per bank-year)`);
    console.log(`  Distribution: [${results.join(', ')}]`);
    
    // Acceptance: ≤ 0.5% per bank-year
    expect(perBankYear).toBeLessThanOrEqual(0.005);
  });

  it('M bitcoin with shocks on stays under 4% per bank-year (median of 10 seeds)', () => {
    const results: number[] = [];
    
    for (let seed = 0; seed < 10; seed++) {
      const result = run({
        ...monetaryPreset,
        'regime.type': 'bitcoin',
        'shock.frequency': 0.1, // default shock frequency
        ticks: 240,
      }, seed);
      
      expect(result.audit.ok).toBe(true);
      const failures = series(result, 'bankFailures').at(-1) ?? 0;
      results.push(failures);
    }
    
    const sorted = [...results].sort((a, b) => a - b);
    const median = sorted[5] ?? 0;
    const perBankYear = median / 4 / 20;
    
    console.log(`M bitcoin shocks on: median ${median} failures (${(perBankYear * 100).toFixed(3)}% per bank-year)`);
    console.log(`  Distribution: [${results.join(', ')}]`);
    
    // Acceptance: ≤ 4% per bank-year  
    expect(perBankYear).toBeLessThanOrEqual(0.04);
  });

  it('S0 bitcoin with shocks off stays under 0.5% per bank-year', () => {
    const results: number[] = [];
    
    for (let seed = 0; seed < 10; seed++) {
      const result = run({
        'regime.type': 'bitcoin',
        'shock.frequency': 0,
        ticks: 240,
      }, seed);
      
      expect(result.audit.ok).toBe(true);
      const failures = series(result, 'bankFailures').at(-1) ?? 0;
      results.push(failures);
    }
    
    const sorted = [...results].sort((a, b) => a - b);
    const median = sorted[5] ?? 0;
    const perBankYear = median / 4 / 20;
    
    console.log(`S0 bitcoin shocks off: median ${median} failures (${(perBankYear * 100).toFixed(3)}% per bank-year)`);
    console.log(`  Distribution: [${results.join(', ')}]`);
    
    expect(perBankYear).toBeLessThanOrEqual(0.005);
  });
});
