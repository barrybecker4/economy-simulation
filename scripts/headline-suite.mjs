#!/usr/bin/env node
/**
 * Headline suite: 20-seed paired bitcoin-vs-fiat comparison across structures and presets.
 * Runs S0, S1, S2, S3, S3 hoarding 3, M, M hoarding 3, and D configs.
 * Reports median real consumption, unemployment, and real GDP for each.
 *
 * Usage: node scripts/headline-suite.mjs [output-dir]
 *
 * Config: 500 households, 50 firms, 3 banks, 240 months, AI off
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// Configuration
const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const TICKS = 240;
const SCALE = {
  'scale.households': 500,
  'scale.firms': 50,
  'scale.banks': 3,
  'ai.automatableShareStart': 0.3,
  'ai.automatableShareEnd': 0.3,
  'shock.frequency': 0,
};

// Structure definitions (v7 naming convention)
const STRUCTURES = {
  S0: { 'prices.trendWeight': 1, 'production.demandWeight': 0, 'labor.firmLevelHiring': 'off' },
  S1: { 'prices.trendWeight': 0, 'production.demandWeight': 0, 'labor.firmLevelHiring': 'off' },
  S2: { 'prices.trendWeight': 1, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' },
  S3: { 'prices.trendWeight': 0, 'production.demandWeight': 1, 'labor.firmLevelHiring': 'on' },
  D: {}, // Pure v7 defaults
};

// Load monetary preset
const MONETARY_PRESET = JSON.parse(
  readFileSync(join(REPO_ROOT, 'scenarios/presets/monetary.json'), 'utf8'),
).sliders;

// Build run configurations
function makeConditions() {
  const conditions = [];

  // S0-S3 and D structures with both regimes
  for (const [struct, sliders] of Object.entries(STRUCTURES)) {
    for (const regime of ['fiat', 'bitcoin']) {
      conditions.push({
        id: `${struct}|${regime}`,
        sliders: { ...sliders, 'regime.type': regime, 'household.realReturnSensitivity': 0 },
      });

      // Add hoarding 3 variant for S3
      if (struct === 'S3') {
        conditions.push({
          id: `${struct}|${regime}|hoard3`,
          sliders: { ...sliders, 'regime.type': regime, 'household.realReturnSensitivity': 3 },
        });
      }
    }
  }

  // M preset with both regimes
  for (const regime of ['fiat', 'bitcoin']) {
    conditions.push({
      id: `M|${regime}`,
      sliders: { ...MONETARY_PRESET, 'regime.type': regime, 'household.realReturnSensitivity': 0 },
    });

    // M with hoarding 3
    conditions.push({
      id: `M|${regime}|hoard3`,
      sliders: { ...MONETARY_PRESET, 'regime.type': regime, 'household.realReturnSensitivity': 3 },
    });
  }

  return conditions;
}

// Run the simulation suite
function runSuite(outputDir) {
  mkdirSync(outputDir, { recursive: true });

  const spec = {
    name: 'headline',
    ticks: TICKS,
    seeds: SEEDS,
    snapshotTicks: [0, 239],
    seriesMetrics: ['unemployment', 'medianRealConsumption', 'realGdp'],
    base: { sliders: SCALE },
    conditions: makeConditions(),
  };

  const specPath = join(outputDir, 'headline-spec.json');
  const outPath = join(outputDir, 'headline-results.jsonl');

  writeFileSync(specPath, JSON.stringify(spec, null, 2));

  console.log(
    `Running headline suite: ${spec.conditions.length} conditions × ${SEEDS.length} seeds = ${spec.conditions.length * SEEDS.length} runs`,
  );
  console.log(`Output: ${outPath}`);

  // Build the core package first
  console.log('\nBuilding core package...');
  try {
    execFileSync('pnpm', ['--filter', '@economy-simulation/core', 'build'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
  } catch {
    console.error('\nFailed to build core package');
    process.exit(1);
  }

  // Run the simulations
  console.log('\nRunning simulations...');
  const runnerPath = join(__dirname, 'runner.mjs');
  if (!existsSync(runnerPath)) {
    console.error(`\nRunner script not found at ${runnerPath}`);
    console.error('Please copy runner.mjs from the analysis scripts to the scripts/ directory.');
    process.exit(1);
  }

  execFileSync('node', [runnerPath, specPath, outPath], {
    cwd: __dirname,
    stdio: 'inherit',
  });

  // Analyze results
  console.log('\nAnalyzing results...');
  analyzeResults(outPath);
}

// Analyze and report results
function analyzeResults(resultsPath) {
  const lines = readFileSync(resultsPath, 'utf8').trim().split('\n');
  const data = {};

  for (const line of lines) {
    const row = JSON.parse(line);
    if (row.error) {
      console.error(`ERROR ${row.cond} seed ${row.seed}: ${row.error}`);
      continue;
    }

    if (!data[row.cond]) {
      data[row.cond] = { seeds: [], consumption: [], unemployment: [], gdp: [] };
    }

    const series = row.series;

    // Month 239 values (end of run)
    const c239 = series.medianRealConsumption[239];
    const g239 = series.realGdp[239];

    // Year 2-20 averages for unemployment
    const u = series.unemployment.slice(12, 239);

    data[row.cond].seeds.push(row.seed);
    data[row.cond].unemployment.push(u.reduce((a, b) => a + b, 0) / u.length);
    data[row.cond].consumption.push(c239);
    data[row.cond].gdp.push(g239);
  }

  // Calculate medians and report
  console.log('\n=== HEADLINE SUITE RESULTS ===\n');
  console.log(
    'Config                          | Real Consumption (m239) | Unemployment (y2-20) % | Real GDP (m239)',
  );
  console.log(
    '--------------------------------|-------------------------|------------------------|----------------',
  );

  const configOrder = [
    'S0|fiat',
    'S0|bitcoin',
    'S1|fiat',
    'S1|bitcoin',
    'S2|fiat',
    'S2|bitcoin',
    'S3|fiat',
    'S3|bitcoin',
    'S3|fiat|hoard3',
    'S3|bitcoin|hoard3',
    'M|fiat',
    'M|bitcoin',
    'M|fiat|hoard3',
    'M|bitcoin|hoard3',
    'D|fiat',
    'D|bitcoin',
  ];

  for (const cond of configOrder) {
    if (!data[cond]) continue;

    const d = data[cond];
    const median = (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };

    const medianCons = median(d.consumption);
    const medianU = median(d.unemployment) * 100;
    const medianGdp = median(d.gdp);

    console.log(
      `${cond.padEnd(31)} | ${medianCons.toFixed(3).padStart(23)} | ${medianU.toFixed(2).padStart(22)} | ${medianGdp.toFixed(1).padStart(15)}`,
    );
  }

  console.log('\n=== Bitcoin vs Fiat Gaps (month 239 consumption) ===\n');
  console.log('Config         | ΔConsumption % (m239) | ΔUnemployment pp (y2-20) | ΔGDP % (m239)');
  console.log('---------------|----------------------|--------------------------|---------------');

  const pairs = [
    ['S0', 'S0|fiat', 'S0|bitcoin'],
    ['S1', 'S1|fiat', 'S1|bitcoin'],
    ['S2', 'S2|fiat', 'S2|bitcoin'],
    ['S3', 'S3|fiat', 'S3|bitcoin'],
    ['S3 hoard3', 'S3|fiat|hoard3', 'S3|bitcoin|hoard3'],
    ['M', 'M|fiat', 'M|bitcoin'],
    ['M hoard3', 'M|fiat|hoard3', 'M|bitcoin|hoard3'],
    ['D', 'D|fiat', 'D|bitcoin'],
  ];

  for (const [label, fiatCond, btcCond] of pairs) {
    if (!data[fiatCond] || !data[btcCond]) continue;

    const median = (arr) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };

    const fiatMedians = {
      c: median(data[fiatCond].consumption),
      u: median(data[fiatCond].unemployment),
      g: median(data[fiatCond].gdp),
    };

    const btcMedians = {
      c: median(data[btcCond].consumption),
      u: median(data[btcCond].unemployment),
      g: median(data[btcCond].gdp),
    };

    const gaps = {
      c: ((btcMedians.c / fiatMedians.c - 1) * 100).toFixed(1),
      u: ((btcMedians.u - fiatMedians.u) * 100).toFixed(2),
      g: ((btcMedians.g / fiatMedians.g - 1) * 100).toFixed(1),
    };

    console.log(
      `${label.padEnd(14)} | ${gaps.c.padStart(20)} | ${gaps.u.padStart(24)} | ${gaps.g.padStart(13)}`,
    );
  }
}

// Main
const outputDir = process.argv[2] || '/tmp/headline-results';
runSuite(outputDir);
