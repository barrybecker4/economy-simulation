import type { MetricId } from '../../../core/src/metrics/metrics.js';

/** Series the worker copies out of a run. Charts and the composite index read only these. */
export const CHART_METRICS = [
  'meanWellbeing',
  'medianWellbeing',
  'priceLevel',
  'priceFood',
  'priceHousing',
  'priceEnergy',
  'priceApparel',
  'priceTransportation',
  'priceMedical',
  'priceEducation',
  'priceRecreation',
  'priceElectronics',
  'unemployment',
  'naturalUnemployment',
  'interestRate',
  'creditToGdp',
  'ubiOutlay',
  'tasksAutomated',
  'aiShareOfAgents',
  'aiShareOfOutput',
  'giniWealth',
  'medianRealWealth',
] as const satisfies readonly MetricId[];

const SENT = new Set<string>(CHART_METRICS);

export function assertSent(id: string): void {
  if (!SENT.has(id)) {
    throw new Error(`Series ${id} is not included in the worker response`);
  }
}

export function requireSeries(series: Record<string, number[]>, id: string): number[] {
  const values = series[id];
  if (values === undefined) {
    throw new Error(`Missing series ${id}`);
  }
  return values;
}

export function finiteMetric(values: readonly (number | null)[], id: string): number[] {
  return values.map((value, index) => finiteAt(value, id, index));
}

function finiteAt(value: number | null, id: string, index: number): number {
  if (value === null || !Number.isFinite(value)) {
    throw new Error(`Metric ${id} is missing at index ${index}`);
  }
  return value;
}
