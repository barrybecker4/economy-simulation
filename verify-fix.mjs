#!/usr/bin/env node
/**
 * Quick verification of fix across different scenarios.
 * Tests: default (Modest AI), Substantial AI, no AI, bitcoin
 */

import { loadScenario } from './packages/core/dist/config/load.js';
import { simulate } from './packages/core/dist/sim/simulate.js';

const small = {
  households: 4000,
  firms: 200,
  banks: 4,
  ticks: 240,
};

function maxOutputDrop(result) {
  const gdp = result.metrics.series.realGdp.filter((v) => v !== null);
  let maxDrop = 0;
  let maxDropMonth = -1;
  for (let i = 1; i < gdp.length; i++) {
    const prev = gdp[i - 1];
    const curr = gdp[i];
    if (prev > 0) {
      const drop = (prev - curr) / prev;
      if (drop > maxDrop) {
        maxDrop = drop;
        maxDropMonth = i;
      }
    }
  }
  return { maxDrop, maxDropMonth };
}

function runSeeds(name, sliders, seeds) {
  console.log(`\nTesting ${name}...`);
  const results = [];
  for (const seed of seeds) {
    const result = simulate(
      loadScenario({
        name: `verification-${name}`,
        seed,
        ...small,
        sliders,
      }),
    );
    const { maxDrop, maxDropMonth } = maxOutputDrop(result);
    results.push({ seed, maxDrop, maxDropMonth });
    console.log(`  Seed ${seed}: ${(maxDrop * 100).toFixed(2)}% at month ${maxDropMonth}`);
  }
  
  const avgDrop = results.reduce((sum, r) => sum + r.maxDrop, 0) / results.length;
  const maxOfAll = Math.max(...results.map((r) => r.maxDrop));
  console.log(`  Average: ${(avgDrop * 100).toFixed(2)}%, Max: ${(maxOfAll * 100).toFixed(2)}%`);
  
  return { results, avgDrop, maxOfAll };
}

const TESTS = [
  {
    name: 'no-AI-fiat',
    sliders: {
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
    },
  },
  {
    name: 'Modest-fiat',
    sliders: {}, // Default is Modest
  },
  {
    name: 'Substantial-fiat',
    sliders: {
      'ai.bullishness': 1,
      'ai.automatableShareStart': 0.1,
      'ai.automatableShareEnd': 0.9,
      'ai.adoptionMidpointYear': 5,
      'ai.adoptionSteepness': 0.4,
      'ai.physicalTaskShare': 0.3,
      'ai.roboticsStartYear': 8,
      'ai.roboticsRampYears': 12,
      'agent.energyStepMonth': 96,
      'agent.energyStepSize': 0.5,
    },
  },
  {
    name: 'Substantial-bitcoin',
    sliders: {
      'regime.type': 'bitcoin',
      'ai.bullishness': 1,
      'ai.automatableShareStart': 0.1,
      'ai.automatableShareEnd': 0.9,
      'ai.adoptionMidpointYear': 5,
      'ai.adoptionSteepness': 0.4,
      'ai.physicalTaskShare': 0.3,
      'ai.roboticsStartYear': 8,
      'ai.roboticsRampYears': 12,
      'agent.energyStepMonth': 96,
      'agent.energyStepSize': 0.5,
    },
  },
];

console.log('=== VERIFICATION SUITE ===');
console.log('Testing fix across scenarios with seeds 1-10');
console.log('Target: max drop < 15% for all seeds\n');

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const allResults = {};

for (const test of TESTS) {
  allResults[test.name] = runSeeds(test.name, test.sliders, SEEDS);
}

console.log('\n=== SUMMARY ===');
console.log('Scenario                  | Avg Drop | Max Drop | Pass (<15%)');
console.log('--------------------------|----------|----------|------------');
for (const test of TESTS) {
  const { avgDrop, maxOfAll } = allResults[test.name];
  const pass = maxOfAll < 0.15 ? '✓' : '✗';
  console.log(
    `${test.name.padEnd(25)} | ${(avgDrop * 100).toFixed(2).padStart(7)}% | ${(maxOfAll * 100).toFixed(2).padStart(7)}% | ${pass}`,
  );
}

const allPass = Object.values(allResults).every((r) => r.maxOfAll < 0.15);
console.log(`\n${allPass ? '✓' : '✗'} ${allPass ? 'All scenarios pass!' : 'Some scenarios failed'}`);
