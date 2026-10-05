import type { ResolvedConfig } from '../config/load.js';
import { runSimulation, type SimulationResult } from '../engine/engine.js';
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
  const world = new World(config, shock);
  return runSimulation(config, world.handlers(), onTick);
}
