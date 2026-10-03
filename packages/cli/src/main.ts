import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  loadScenario,
  renderAssumptions,
  runSimulation,
  simulationToJson,
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

function runCommand(command: Exclude<Command, { kind: 'help' }>): void {
  if (command.kind === 'run') {
    const raw: unknown = JSON.parse(readFileSync(command.scenario, 'utf8'));
    const config = loadScenario(raw, { seed: command.seed });
    writeFileSync(command.out, simulationToJson(runSimulation(config)));
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
