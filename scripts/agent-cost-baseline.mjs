#!/usr/bin/env node
/**
 * Capture Substantial + household-agents paths for before/after comparison.
 * Usage: node scripts/agent-cost-baseline.mjs <label> [output-dir]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const label = process.argv[2] ?? 'before';
const outputDir = process.argv[3] ?? join('/tmp/agent-cost-baselines', label);

const SEEDS = Array.from({ length: 10 }, (_, i) => i + 1);
const TICKS = 240;

const SUBSTANTIAL = {
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
  // Household agents on (registry defaults already do this; set explicitly)
  'ai.ownerShareCeiling': 0.95,
  'ai.agentsPerOwnerCeiling': 20,
  'ai.computeProductivity': 0.2,
  'agent.marketDepth': 0.25,
  'shock.frequency': 0,
};

mkdirSync(outputDir, { recursive: true });

const conditions = [];
for (const regime of ['fiat', 'bitcoin']) {
  conditions.push({
    id: `substantial|${regime}`,
    sliders: { ...SUBSTANTIAL, 'regime.type': regime },
  });
}

const spec = {
  name: `agent-cost-${label}`,
  ticks: TICKS,
  seeds: SEEDS,
  snapshotTicks: [0, 17, 18, 20, 21, 95, 96, 119, 239],
  seriesMetrics: [
    'realGdp',
    'inflation',
    'unemployment',
    'agentVolume',
    'priceLevel',
    'wageBill',
    'aiShareOfTransactions',
    'aiShareOfAgents',
  ],
  base: {
    sliders: {
      'scale.households': 400,
      'scale.firms': 20,
      'scale.banks': 2,
    },
  },
  conditions,
};

const specPath = join(outputDir, 'spec.json');
const outPath = join(outputDir, 'results.jsonl');
writeFileSync(specPath, JSON.stringify(spec, null, 2));

console.log(`Building core...`);
execFileSync('npx', ['tsc'], {
  cwd: join(REPO_ROOT, 'packages/core'),
  stdio: 'inherit',
});

console.log(
  `Running ${conditions.length} × ${SEEDS.length} = ${conditions.length * SEEDS.length} runs → ${outPath}`,
);
const runnerPath = join(__dirname, 'runner.mjs');
if (!existsSync(runnerPath)) {
  console.error('Missing runner.mjs');
  process.exit(1);
}
execFileSync('node', [runnerPath, specPath, outPath], {
  cwd: __dirname,
  stdio: 'inherit',
});

console.log(`Done. Results at ${outPath}`);
