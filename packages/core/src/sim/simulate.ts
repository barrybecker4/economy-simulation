import type { ResolvedConfig } from '../config/load.js';
import { runSimulation, type SimulationResult } from '../engine/engine.js';
import { clearWageHistory } from './job-stayer-wage-cuts.js';
import { World } from './world.js';

export interface ForcedShock {
  tick: number;
  kind: 'credit' | 'demand' | 'productivity';
  size: number;
}

export function simulate(
  config: ResolvedConfig,
  shock: ForcedShock | null = null,
  onTick?: (completed: number, total: number) => void,
): SimulationResult {
  // Clear wage history from any previous run
  clearWageHistory();
  const world = new World(config, shock);
  return runSimulation(config, world.handlers(), onTick);
}
