import type { ResolvedConfig } from '../config/load.js';
import { Ledger, type AuditReport } from '../ledger/ledger.js';
import { MetricsRecorder, type MetricsTable } from '../metrics/metrics.js';
import type { MoneyUnit } from '../money/amount.js';
import { Rng } from '../rng/rng.js';
import { TICK_PHASES, type TickPhase } from './phases.js';
import { unitForRegime } from './unit.js';

export interface TickContext {
  readonly tick: number;
  readonly config: ResolvedConfig;
  readonly rng: Rng;
  readonly ledger: Ledger;
  readonly metrics: MetricsRecorder;
  audit: AuditReport | null;
}

export type PhaseHandler = (ctx: TickContext) => void;
export type PhaseHandlers = Partial<Record<TickPhase, PhaseHandler>>;

export interface SimulationResult {
  config: ResolvedConfig;
  unit: MoneyUnit;
  metrics: MetricsTable;
  audit: AuditReport;
}

/**
 * Runs empty phases unless the caller supplies handlers.
 * Phase 1 does not implement agents, markets, or regime rules.
 * `onTick` runs after each committed tick. It does not change the result unless it throws.
 */
export function runSimulation(
  config: ResolvedConfig,
  handlers: PhaseHandlers = {},
  onTick?: (completed: number, total: number) => void,
): SimulationResult {
  const regime = config.sliders['regime.type'];
  if (typeof regime !== 'string') {
    throw new Error('regime.type must be a string');
  }
  const transition = config.sliders['transition.lengthMonths'];
  const unit = typeof transition === 'number' && transition > 0 ? 'satoshi' : unitForRegime(regime);
  const rng = new Rng(config.seed);
  const ledger = new Ledger(unit);
  const metrics = new MetricsRecorder();
  let audit = ledger.audit();

  for (let tick = 0; tick < config.ticks; tick += 1) {
    const ctx: TickContext = {
      tick,
      config,
      rng,
      ledger,
      metrics,
      audit: null,
    };
    for (const phase of TICK_PHASES) {
      handlers[phase]?.(ctx);
      if (phase === 'bookkeeping') {
        ctx.audit = ledger.audit();
      }
    }
    audit = ledger.audit();
    metrics.set('auditOk', audit.ok ? 1 : 0);
    metrics.commitTick(tick);
    onTick?.(tick + 1, config.ticks);
  }

  return {
    config,
    unit,
    metrics: metrics.snapshot(),
    audit,
  };
}
