#!/usr/bin/env node
import { runSimulation } from './packages/core/src/engine/engine.js';
import { loadScenario } from './packages/core/src/config/load.js';
import { seedRng } from './packages/core/src/rng/rng.js';

// Test crisis metrics with seeds
async function testCrisisMetrics() {
  console.log('Testing crisis-response metrics...\n');
  
  const presets = ['monetary', 'bitcoin-dividend'];
  const regimes = { 'monetary': 'fiat', 'bitcoin-dividend': 'bitcoin' };
  
  for (const presetName of presets) {
    console.log(`\n=== Preset: ${presetName} (${regimes[presetName]}) ===`);
    
    const results = {
      fiscalDeficit: [],
      cbBalanceSheet: []
    };
    
    for (let seed = 1; seed <= 10; seed++) {
      const config = loadScenario({
        scenario: `scenarios/presets/${presetName}.json`,
        seed,
        overrides: {},
      });
      
      const rng = seedRng(seed);
      const result = runSimulation(config, {
        onTick: () => {},
        recordAudit: () => {},
      });
      
      // Find peak deficit and balance sheet changes
      const fiscalSeries = result.metrics.series.fiscalBalancePctGdp || [];
      const cbSeries = result.metrics.series.cbBalanceSheetPctGdp || [];
      
      // Find minimum (most negative = largest deficit)
      const minFiscal = Math.min(...fiscalSeries.filter(v => v !== null && isFinite(v)));
      // Find max change in CB balance sheet (peak - opening)
      const cbOpening = cbSeries[0] || 0;
      const maxCb = Math.max(...cbSeries.filter(v => v !== null && isFinite(v)));
      const cbChange = maxCb - cbOpening;
      
      results.fiscalDeficit.push(minFiscal);
      results.cbBalanceSheet.push(cbChange);
    }
    
    // Calculate mean and range
    const avgDeficit = results.fiscalDeficit.reduce((a, b) => a + b, 0) / results.fiscalDeficit.length;
    const minDeficit = Math.min(...results.fiscalDeficit);
    const maxDeficit = Math.max(...results.fiscalDeficit);
    
    const avgCB = results.cbBalanceSheet.reduce((a, b) => a + b, 0) / results.cbBalanceSheet.length;
    const minCB = Math.min(...results.cbBalanceSheet);
    const maxCB = Math.max(...results.cbBalanceSheet);
    
    console.log(`Peak deficit % of GDP:`);
    console.log(`  Mean: ${avgDeficit.toFixed(2)}%`);
    console.log(`  Range: [${minDeficit.toFixed(2)}%, ${maxDeficit.toFixed(2)}%]`);
    
    console.log(`CB balance sheet change (pp of GDP):`);
    console.log(`  Mean: ${avgCB.toFixed(2)} pp`);
    console.log(`  Range: [${minCB.toFixed(2)}, ${maxCB.toFixed(2)}] pp`);
  }
  
  console.log('\nTest complete!');
}

testCrisisMetrics().catch(console.error);
