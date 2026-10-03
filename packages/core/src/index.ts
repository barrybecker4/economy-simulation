/** Simulation core. Phase 1 is the engine; agents and markets come later. */
export const CORE_PACKAGE = '@economy-simulation/core' as const;

export { REGISTRY_VERSION, DEFAULT_TICKS, MAX_TICKS } from './config/limits.js';
export { loadScenario, resolveConfig } from './config/load.js';
export type { ResolvedConfig, ScenarioOverrides } from './config/load.js';
export { renderAssumptions } from './config/assumptions.js';
export { getSlider, listSliders, SLIDERS } from './config/registry.js';
export type {
  EnumSlider,
  NumberSlider,
  Slider,
  SliderGroup,
  SliderStatus,
} from './config/registry.js';
export { runSimulation } from './engine/engine.js';
export type {
  PhaseHandler,
  PhaseHandlers,
  SimulationResult,
  TickContext,
} from './engine/engine.js';
export { TICK_PHASES } from './engine/phases.js';
export type { TickPhase } from './engine/phases.js';
export { Ledger } from './ledger/ledger.js';
export type { AccountKind, AuditReport, EntrySide, PostingLine } from './ledger/ledger.js';
export { METRIC_IDS, MetricsRecorder, metricsToCsv } from './metrics/metrics.js';
export type { MetricId, MetricsTable } from './metrics/metrics.js';
export { canonicalJson, simulationToJson, toResultRecord } from './output/canonical.js';
export { Rng } from './rng/rng.js';
export type { MoneyUnit } from './money/amount.js';
