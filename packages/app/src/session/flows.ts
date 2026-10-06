import { FLOW_EDGES } from '../dashboard/catalog.js';
import type { RunSuccess } from '../worker/protocol.js';
import { metricAt } from '../worker/series.js';
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
    edges: FLOW_EDGES.map((spec) => ({
      from: spec.from,
      to: spec.to,
      label: spec.label,
      amount: metricAt(result, spec.id, index),
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

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    throw new Error('Run has no ticks');
  }
  if (!Number.isFinite(index)) {
    return length - 1;
  }
  return Math.min(Math.max(0, Math.floor(index)), length - 1);
}
