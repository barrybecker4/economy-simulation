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
 * - Commit 84d2086 (Oct 12): ~4.2 failures at 500/50/3 scale with 30-month deposits
 * - PR #18 (velocity calibration): Changed openingDepositMonths from 30 to 6.5
 * - Current: ~2.2 failures at 500/50/3, 0 failures at 4000/200/4
 * 
 * Key finding: Failure rates are scale-dependent.
 * - Production scale (4000/200/4): High diversification → 0% failures
 * - Test scale (500/50/3): Concentration risk → elevated failures
 * 
 * Acceptance criteria (from issue #11):
 * - With shocks OFF: ≤ 0.5% failures per bank-year
 * - With shocks ON: ≤ 4% failures per bank-year  
 * 
 * Production scale meets both criteria. Test scale meets crisis criterion only.
 */
describe('Regression: bank failure rates (issue #11)', () => {
  // These tests run 10 full simulations each, which takes time
  const LONG_TEST_TIMEOUT = 120_000; // 2 minutes per test

  it('Production scale (4000/200/4) meets all acceptance criteria', { timeout: LONG_TEST_TIMEOUT }, () => {
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
    
    console.log(`Production scale (4000/200/4) M bitcoin shocks off:`);
    console.log(`  Median: ${median} failures (${(perBankYear * 100).toFixed(3)}% per bank-year)`);
    console.log(`  Distribution: [${results.join(', ')}]`);
    
    // Acceptance: ≤ 0.5% per bank-year
    expect(perBankYear).toBeLessThanOrEqual(0.005);
  });

  it('Production scale with shocks stays under 4% per bank-year', { timeout: LONG_TEST_TIMEOUT }, () => {
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
    
    console.log(`Production scale (4000/200/4) M bitcoin shocks on:`);
    console.log(`  Median: ${median} failures (${(perBankYear * 100).toFixed(3)}% per bank-year)`);
    console.log(`  Distribution: [${results.join(', ')}]`);
    
    // Acceptance: ≤ 4% per bank-year  
    expect(perBankYear).toBeLessThanOrEqual(0.04);
  });

  it('Test scale (500/50/3) tracks against crisis benchmarks', { timeout: LONG_TEST_TIMEOUT }, () => {
    const results: number[] = [];
    
    for (let seed = 0; seed < 10; seed++) {
      const result = run({
        ...monetaryPreset,
        'regime.type': 'bitcoin',
        'shock.frequency': 0.1,
        'scale.households': 500,
        'scale.firms': 50,
        'scale.banks': 3,
        ticks: 240,
      }, seed);
      
      expect(result.audit.ok).toBe(true);
      const failures = series(result, 'bankFailures').at(-1) ?? 0;
      results.push(failures);
    }
    
    const sorted = [...results].sort((a, b) => a - b);
    const median = sorted[5] ?? 0;
    const perBankYear = median / 3 / 20;
    
    console.log(`Test scale (500/50/3) M bitcoin shocks on:`);
    console.log(`  Median: ${median} failures (${(perBankYear * 100).toFixed(2)}% per bank-year)`);
    console.log(`  Distribution: [${results.join(', ')}]`);
    console.log(`  Real-world: 0.06% normal, 2-4% crisis, 6-22% depression`);
    
    // At smaller scale, expect crisis-appropriate rates (not normal-year rates)
    // This reflects real concentration risk in smaller banking systems
    expect(perBankYear).toBeLessThanOrEqual(0.04); // ≤4% crisis threshold
  });
});
