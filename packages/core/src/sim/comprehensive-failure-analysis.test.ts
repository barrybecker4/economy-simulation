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
    loadScenario({ name: 'comprehensive-bank-failure-analysis', seed, ticks, sliders: rest }),
    null,
  );
}

/**
 * Comprehensive analysis of bank failures across scales and configurations
 */
describe('Comprehensive bank failure analysis', () => {
  it('Default scale (4000/200/4) vs Issue scale (500/50/3)', { timeout: 300_000 }, () => {
    const scenarios = [
      { label: '4000/200/4 (default)', hh: 4000, firms: 200, banks: 4 },
      { label: '500/50/3 (issue)', hh: 500, firms: 50, banks: 3 },
    ];
    
    for (const scenario of scenarios) {
      const results: number[] = [];
      
      for (let seed = 0; seed < 10; seed++) {
        const result = run({
          ...monetaryPreset,
          'regime.type': 'bitcoin',
          'shock.frequency': 0,
          'scale.households': scenario.hh,
          'scale.firms': scenario.firms,
          'scale.banks': scenario.banks,
          ticks: 240,
        }, seed);
        
        expect(result.audit.ok).toBe(true);
        const failures = series(result, 'bankFailures').at(-1) ?? 0;
        results.push(failures);
      }
      
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      const sorted = [...results].sort((a, b) => a - b);
      const median = sorted[5] ?? 0;
      const perBankYear = (mean / scenario.banks / 20) * 100;
      
      console.log(`\n${scenario.label} (current 6.5mo, M bitcoin, shocks off):`);
      console.log(`  Distribution: [${results.join(', ')}]`);
      console.log(`  Mean: ${mean.toFixed(1)}, Median: ${median}`);
      console.log(`  Per bank-year: ${perBankYear.toFixed(2)}%`);
      console.log(`  ${perBankYear <= 0.5 ? '✅ MEETS' : '❌ EXCEEDS'} acceptance (≤0.5%)`);
    }
  });

  it('Shocks ON to test crisis stress (500/50/3)', { timeout: 120_000 }, () => {
    const results: number[] = [];
    
    for (let seed = 0; seed < 10; seed++) {
      const result = run({
        ...monetaryPreset,
        'regime.type': 'bitcoin',
        'shock.frequency': 0.1, // default
        'scale.households': 500,
        'scale.firms': 50,
        'scale.banks': 3,
        ticks: 240,
      }, seed);
      
      expect(result.audit.ok).toBe(true);
      const failures = series(result, 'bankFailures').at(-1) ?? 0;
      results.push(failures);
    }
    
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const sorted = [...results].sort((a, b) => a - b);
    const median = sorted[5] ?? 0;
    const perBankYear = (mean / 3 / 20) * 100;
    
    console.log(`\n500/50/3 (current 6.5mo, M bitcoin, shocks ON):`);
    console.log(`  Distribution: [${results.join(', ')}]`);
    console.log(`  Mean: ${mean.toFixed(1)}, Median: ${median}`);
    console.log(`  Per bank-year: ${perBankYear.toFixed(2)}%`);
    console.log(`  ${perBankYear <= 4.0 ? '✅ MEETS' : '❌ EXCEEDS'} acceptance (≤4%)`);
    console.log(`  Real-world crisis range: 2-4% (normal crises), 6-22% (1930-33)`);
  });

  it('Can we induce stress? Thinner capital (2%) with shocks', { timeout: 120_000 }, () => {
    const results: number[] = [];
    
    for (let seed = 0; seed < 10; seed++) {
      const result = run({
        ...monetaryPreset,
        'regime.type': 'bitcoin',
        'bank.capitalRatio': 0.02, // vs 0.04 default
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
    
    const mean = results.reduce((a, b) => a + b, 0) / results.length;
    const perBankYear = (mean / 3 / 20) * 100;
    
    console.log(`\n500/50/3 (2% capital, shocks ON):`);
    console.log(`  Distribution: [${results.join(', ')}]`);
    console.log(`  Mean: ${mean.toFixed(1)}`);
    console.log(`  Per bank-year: ${perBankYear.toFixed(2)}%`);
  });
});
