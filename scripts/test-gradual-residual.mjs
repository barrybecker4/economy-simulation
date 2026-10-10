#!/usr/bin/env node
/**
 * Quick test to verify M bitcoin gradual transition bank residual is fixed.
 * Should show max residual of ~1e-8 (was 20.14 on seed 1 before fix).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// Build core first
console.log('Building core package...');
execFileSync('npx', ['tsc'], {
  cwd: join(REPO_ROOT, 'packages/core'),
  stdio: 'inherit',
});

// Import after build
const { loadScenario, runSimulation } = await import(
  join(REPO_ROOT, 'packages/core/dist/index.js')
);
const { World } = await import(join(REPO_ROOT, 'packages/core/dist/sim/world.js'));
const { bankBalanceIdentity } = await import(join(REPO_ROOT, 'packages/core/dist/sim/stocks.js'));

const MONETARY_PRESET = JSON.parse(
  readFileSync(join(REPO_ROOT, 'scenarios/presets/monetary.json'), 'utf8'),
).sliders;

console.log('\nTesting M bitcoin gradual transition bank residuals (seeds 1-5)...\n');

const results = [];

for (let seed = 1; seed <= 5; seed++) {
  const config = loadScenario({
    name: 'gradual-test',
    seed,
    ticks: 240,
    sliders: {
      ...MONETARY_PRESET,
      'regime.type': 'fiat',
      'transition.lengthMonths': 12,
      'transition.gradualWeight': 1,
      'transition.debtHaircut': 0.5,
      'transition.holderConcentration': 0.5,
      'scale.households': 60,
      'scale.firms': 6,
      'scale.banks': 1,
      'shock.frequency': 0,
    },
  });

  const world = new World(config, null);
  const economy = world.economy;
  const handlers = world.handlers();

  // Track max residual during run
  let maxResidual = 0;
  const onBookkeeping = handlers.bookkeeping;
  handlers.bookkeeping = (ctx) => {
    onBookkeeping(ctx);
    const residual = Math.abs(bankBalanceIdentity(economy));
    if (residual > maxResidual) {
      maxResidual = residual;
    }
  };

  runSimulation(config, handlers);

  results.push({ seed, maxResidual });
  console.log(`Seed ${seed}: max residual = ${maxResidual.toExponential(2)}`);
}

console.log('\n=== Summary ===');
const overallMax = Math.max(...results.map((r) => r.maxResidual));
console.log(`Overall max residual: ${overallMax.toExponential(2)}`);

if (overallMax < 1e-7) {
  console.log('✓ PASS: Bank identity holds within 1e-7');
  process.exit(0);
} else {
  console.log(`✗ FAIL: Bank identity residual ${overallMax.toExponential(2)} exceeds 1e-7`);
  process.exit(1);
}
