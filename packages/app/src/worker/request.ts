import type { MetricsTable } from '../../../core/src/metrics/metrics.js';
import { loadScenario } from '../../../core/src/config/load.js';
import { simulate } from '../../../core/src/sim/simulate.js';
import { tickBudget } from './budget.js';
import type { PercentileBand, RunRequest, RunSuccess } from './protocol.js';
import { meanAbsolute, seriesBand } from './quantile.js';
import { CHART_METRICS, finiteMetric, requireSeries } from './series.js';

interface ChartRun {
  ticks: number[];
  series: Record<string, number[]>;
}

export function handleRequest(
  request: RunRequest,
  onTick?: (completed: number, total: number) => void,
): RunSuccess {
  const clock = new RunClock(request.ticks, tickBudget(request), onTick);
  if (request.kind === 'band') {
    return bandOf(request.seeds.map((seed) => clock.run(seed, request.sliders)));
  }
  return { kind: 'run', ...clock.run(request.seed, request.sliders) };
}

class RunClock {
  private offset = 0;

  constructor(
    private readonly ticks: number,
    private readonly total: number,
    private readonly onTick: ((completed: number, total: number) => void) | undefined,
  ) {}

  run(seed: number, sliders: Record<string, number | string>): ChartRun {
    const result = runOnce(seed, this.ticks, sliders, this.listener());
    this.offset += this.ticks;
    return result;
  }

  private listener(): ((completed: number) => void) | undefined {
    if (this.onTick === undefined) {
      return undefined;
    }
    return (completed) => {
      this.report(completed);
    };
  }

  private report(completed: number): void {
    if (this.onTick === undefined) {
      return;
    }
    this.onTick(this.offset + completed, this.total);
  }
}

function runOnce(
  seed: number,
  ticks: number,
  sliders: Record<string, number | string>,
  report: ((completed: number) => void) | undefined,
): ChartRun {
  const config = loadScenario({ name: 'browser', seed, ticks, sliders });
  const result =
    report === undefined ? simulate(config, null) : simulate(config, null, reportTick(report));
  return { ticks: result.metrics.ticks, series: chartSeries(result.metrics.series) };
}

function reportTick(
  report: (completed: number) => void,
): (completed: number, total: number) => void {
  return (completed) => {
    report(completed);
  };
}

function chartSeries(table: MetricsTable['series']): Record<string, number[]> {
  const series: Record<string, number[]> = {};
  for (const id of CHART_METRICS) {
    const values = table[id];
    if (values === undefined) {
      throw new Error(`Missing metric ${id}`);
    }
    series[id] = finiteMetric(values, id);
  }
  return series;
}

/** Impulses whose median across seeds is usually zero because shocks do not line up. */
const SHOCK_IMPULSES = new Set(['demandImpulse', 'creditImpulse', 'productivityImpulse']);

function bandOf(runs: readonly ChartRun[]): RunSuccess {
  const first = runs[0];
  if (first === undefined) {
    throw new Error('A band needs at least one run');
  }
  const bands: Record<string, PercentileBand> = {};
  for (const id of CHART_METRICS) {
    const samples = runs.map((run) => requireSeries(run.series, id));
    const band = seriesBand(samples);
    if (SHOCK_IMPULSES.has(id)) {
      band.mid = meanAbsolute(samples);
    }
    bands[id] = band;
  }
  return { kind: 'band', ticks: first.ticks, series: {}, bands };
}
