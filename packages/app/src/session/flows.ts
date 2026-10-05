import type { MetricId } from '../../../core/src/metrics/metrics.js';
import type { BandRunResult, RunSuccess } from '../worker/protocol.js';
import { assertSent, requireSeries } from '../worker/series.js';
import { moneyUnit } from '../chart/view.js';

export interface FlowEdge {
  from: string;
  to: string;
  label: string;
  amount: number;
  color: string;
}

export interface MonthFlows {
  monthIndex: number;
  unit: string;
  edges: FlowEdge[];
}

interface FlowSpec {
  id: MetricId;
  from: string;
  to: string;
  label: string;
  color: string;
}

const FLOW_SPECS: readonly FlowSpec[] = [
  {
    id: 'householdGoodsSpend',
    from: 'households',
    to: 'firms',
    label: 'Goods',
    color: '#1e3a8a',
  },
  {
    id: 'agentGoodsSpend',
    from: 'agents',
    to: 'firms',
    label: 'Goods',
    color: '#be123c',
  },
  {
    id: 'govGoodsSpend',
    from: 'government',
    to: 'firms',
    label: 'Purchases',
    color: '#0f766e',
  },
  {
    id: 'wageBill',
    from: 'firms',
    to: 'households',
    label: 'Wages',
    color: '#a16207',
  },
  {
    id: 'profitPaid',
    from: 'firms',
    to: 'households',
    label: 'Profits',
    color: '#7c3aed',
  },
  {
    id: 'taxRevenue',
    from: 'households',
    to: 'government',
    label: 'Tax',
    color: '#0369a1',
  },
  {
    id: 'agentTaxRevenue',
    from: 'agents',
    to: 'government',
    label: 'Tax',
    color: '#a21caf',
  },
  {
    id: 'ubiOutlay',
    from: 'government',
    to: 'households',
    label: 'Grant',
    color: '#047857',
  },
  {
    id: 'agentVolume',
    from: 'firms',
    to: 'agents',
    label: 'Compute',
    color: '#c2410c',
  },
  {
    id: 'agentSweep',
    from: 'agents',
    to: 'households',
    label: 'Sweep',
    color: '#4d7c0f',
  },
  {
    id: 'agentFees',
    from: 'agents',
    to: 'banks',
    label: 'Fees',
    color: '#9a3412',
  },
  {
    id: 'interestPaid',
    from: 'firms',
    to: 'banks',
    label: 'Interest',
    color: '#1d4ed8',
  },
  {
    id: 'loanRepaid',
    from: 'firms',
    to: 'banks',
    label: 'Repayment',
    color: '#57534e',
  },
  {
    id: 'newBorrowing',
    from: 'banks',
    to: 'firms',
    label: 'Loans',
    color: '#c2410c',
  },
];

for (const spec of FLOW_SPECS) {
  assertSent(spec.id);
}

export const FLOW_NODES = [
  { id: 'households', label: 'Households', x: 80, y: 80 },
  { id: 'firms', label: 'Firms', x: 320, y: 80 },
  { id: 'government', label: 'Government', x: 80, y: 220 },
  { id: 'banks', label: 'Banks', x: 320, y: 220 },
  { id: 'agents', label: 'AI agents', x: 200, y: 340 },
] as const;

export function monthFlows(result: RunSuccess, regime: string, monthIndex: number): MonthFlows {
  const index = clampIndex(monthIndex, result.ticks.length);
  const displayed = result.kind === 'compare' ? 'fiat' : regime;
  return {
    monthIndex: index,
    unit: moneyUnit(displayed),
    edges: FLOW_SPECS.map((spec) => ({
      from: spec.from,
      to: spec.to,
      label: spec.label,
      amount: valueAt(result, spec.id, index),
      color: spec.color,
    })),
  };
}

export function strokeWidth(amount: number, maxAmount: number): number {
  if (amount <= 0 || maxAmount <= 0) {
    return 0;
  }
  return Math.max(1.5, Math.min(14, (amount / maxAmount) * 14));
}

export function maxFlowAmount(edges: readonly FlowEdge[]): number {
  let max = 0;
  for (const edge of edges) {
    if (edge.amount > max) {
      max = edge.amount;
    }
  }
  return max;
}

function valueAt(result: RunSuccess, id: MetricId, index: number): number {
  const values = result.kind === 'band' ? bandMid(result, id) : requireSeries(result.series, id);
  const value = values[index];
  if (value === undefined || !Number.isFinite(value)) {
    throw new Error(`Missing ${id} at month ${index}`);
  }
  return value;
}

function bandMid(result: BandRunResult, id: string): number[] {
  const band = result.bands[id];
  if (band === undefined) {
    throw new Error(`Missing band ${id}`);
  }
  return band.mid;
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    throw new Error('Run has no ticks');
  }
  if (!Number.isFinite(index)) {
    return length - 1;
  }
  return Math.min(Math.max(0, Math.floor(index)), length - 1);
}
