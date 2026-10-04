import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  loadScenario,
  renderAssumptions,
  runHypotheses,
  runSweep,
  simulate,
  simulationToJson,
  type MetricId,
  type SimulationResult,
} from '@economy-simulation/core';
import { parseArgs, USAGE, type Command } from './args.js';

export function execute(argv: readonly string[]): number {
  const command = parseArgs(argv);
  if (command.kind === 'help') {
    console.log(USAGE);
    return command.exitCode;
  }
  runCommand(command);
  return 0;
}

function presetSliders(name: string): Record<string, number | string> {
  const file = path.resolve('scenarios/presets', `${name}.json`);
  if (!existsSync(file)) {
    return {};
  }
  const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (typeof raw !== 'object' || raw === null || !('sliders' in raw)) {
    return {};
  }
  const sliders = raw.sliders;
  if (typeof sliders !== 'object' || sliders === null) {
    return {};
  }
  const out: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(sliders)) {
    if (typeof value === 'number' || typeof value === 'string') {
      out[key] = value;
    }
  }
  return out;
}

function runCommand(command: Exclude<Command, { kind: 'help' }>): void {
  if (command.kind === 'run') {
    const raw: unknown = JSON.parse(readFileSync(command.scenario, 'utf8'));
    const config = loadScenario(raw, { seed: command.seed });
    writeFileSync(command.out, simulationToJson(simulate(config)));
    console.log(`wrote ${command.out}`);
    return;
  }
  if (command.kind === 'compare') {
    const raw: unknown = JSON.parse(readFileSync(command.scenario, 'utf8'));
    const left = simulate(
      loadScenario(raw, { seed: command.seed, sliders: { 'regime.type': command.left } }),
    );
    const right = simulate(
      loadScenario(raw, { seed: command.seed, sliders: { 'regime.type': command.right } }),
    );
    const report = {
      seed: command.seed,
      left: dashboard(command.left, left),
      right: dashboard(command.right, right),
    };
    writeFileSync(command.out, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`wrote ${command.out}`);
    return;
  }
  if (command.kind === 'sweep') {
    const jobs = [];
    for (let seed = 1; seed <= command.seeds; seed += 1) {
      for (const regime of command.regimes) {
        jobs.push({
          seed,
          ticks: command.ticks,
          regime,
          preset: command.preset,
          sliders: {
            ...presetSliders(command.preset),
            'scale.households': 40,
            'scale.firms': 4,
            'scale.banks': 1,
          },
        });
      }
    }
    const lines = runSweep(jobs).map((row) => JSON.stringify(row));
    writeFileSync(command.out, `${lines.join('\n')}\n`);
    console.log(`wrote ${command.out}`);
    return;
  }
  if (command.kind === 'hypotheses') {
    writeFileSync(command.out, `${JSON.stringify(runHypotheses(), null, 2)}\n`);
    console.log(`wrote ${command.out}`);
    return;
  }
  const rendered = renderAssumptions();
  if (command.kind === 'assumptions-write') {
    writeFileSync(command.path, rendered);
    console.log(`wrote ${command.path}`);
    return;
  }
  const current = readFileSync(command.path, 'utf8');
  if (current !== rendered) {
    throw new Error(
      `${command.path} is out of date. Run: pnpm sim assumptions --out ${command.path}`,
    );
  }
  console.log(`${command.path} matches the slider registry`);
}

function dashboard(regime: string, result: SimulationResult): Record<string, number | string> {
  return {
    regime,
    unit: result.unit,
    meanWellbeing: last(result, 'meanWellbeing'),
    medianWellbeing: last(result, 'medianWellbeing'),
    unemployment: last(result, 'unemployment'),
    inflation: last(result, 'inflation'),
    priceLevel: last(result, 'priceLevel'),
    meanRealConsumption: last(result, 'meanRealConsumption'),
  };
}

function last(result: SimulationResult, id: MetricId): number {
  const values = result.metrics.series[id];
  const value = values[values.length - 1];
  return value ?? 0;
}

function invokedDirectly(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (invokedDirectly()) {
  try {
    process.exit(execute(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
