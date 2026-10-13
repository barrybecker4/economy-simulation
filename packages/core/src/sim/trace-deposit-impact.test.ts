import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import { simulate } from './simulate.js';
import type { SimulationResult } from '../engine/engine.js';

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
    loadScenario({ name: 'trace-deposit-months-impact', seed, ticks, sliders: rest }),
    null,
  );
}

/**
 * Investigation: What changed between 84d2086 and current master?
 * 
 * PR #18 (velocity calibration) changed household.openingDepositMonths from 30 to 6.5
 * in both the default slider and the monetary preset. This is the likely cause.
 * 
 * With 30 months: Banks have large deposits relative to opening capital,
 * can lend more, and face more stress from loan losses.
 * 
 * With 6.5 months: Much less initial credit in the system, less lending capacity,
 * less stress on banks.
 */
describe('Trace deposit months impact on bank failures', () => {
  it('Current (6.5 months) vs old (30 months) with exact issue scale', { timeout: 240_000 }, () => {
    const configs = [
      { label: 'Current (6.5mo)', months: 6.5 },
      { label: 'Old (30mo)', months: 30 },
    ];
    
    for (const config of configs) {
      const results: number[] = [];
      
      for (let seed = 0; seed < 10; seed++) {
        const result = run({
          ...monetaryPreset,
          'regime.type': 'bitcoin',
          'shock.frequency': 0,
          'scale.households': 500,
          'scale.firms': 50,
          'scale.banks': 3,
          'household.openingDepositMonths': config.months,
          ticks: 240,
        }, seed);
        
        expect(result.audit.ok).toBe(true);
        const failures = series(result, 'bankFailures').at(-1) ?? 0;
        results.push(failures);
      }
      
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const sorted = [...results].sort((a, b) => a - b);
      const median = sorted[5] ?? 0;
      
      console.log(`\n${config.label} (500/50/3 scale, M bitcoin, shocks off):`);
      console.log(`  Distribution: [${results.join(', ')}]`);
      console.log(`  Mean: ${mean.toFixed(1)}, Median: ${median}`);
      console.log(`  Range: [${Math.min(...results)}, ${Math.max(...results)}]`);
      console.log(`  Per bank-year: ${((mean / 3 / 20) * 100).toFixed(2)}%`);
      
      if (config.months === 30) {
        // Issue reported 6.1-6.5 failures
        console.log(`  (Issue #11 reported 6.1-6.5 failures on this config)`);
      }
    }
  });
});
