<script lang="ts">
  import { FLOW_NODES, maxFlowAmount, strokeWidth, type MonthFlows } from '../session/flows.js';
  import type { MonthCensus } from '../session/census.js';
  import { monthStart } from '../chart/time.js';

  let {
    ticks,
    monthIndex = $bindable(0),
    flows,
    census,
  }: {
    ticks: number[];
    monthIndex: number;
    flows: MonthFlows;
    census: MonthCensus;
  } = $props();

  const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ] as const;
  const opened = new Date();
  const last = $derived(Math.max(0, ticks.length - 1));
  const label = $derived(monthName(monthIndex));
  const peak = $derived(maxFlowAmount(flows.edges));
  const nodes = Object.fromEntries(FLOW_NODES.map((node) => [node.id, node]));

  function monthName(index: number): string {
    const date = monthStart(opened, ticks[index] ?? index);
    const name = MONTHS[date.getMonth()];
    return `${name ?? '?'} ${date.getFullYear()}`;
  }

  function formatMoney(amount: number): string {
    if (amount === 0) {
      return '0';
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `${(amount / 1_000).toFixed(1)}k`;
    }
    return amount.toFixed(amount % 1 === 0 ? 0 : 2);
  }

  function formatShare(share: number): string {
    return `${(share * 100).toFixed(1)}%`;
  }

  const activeEdges = $derived(flows.edges.filter((edge) => edge.amount > 0));

  /** Quadratic curve from the rim of the payer to the rim of the payee, with a bend so parallel flows stay apart. */
  function edgePath(fromId: string, toId: string, bend: number): string {
    const from = nodes[fromId];
    const to = nodes[toId];
    if (!from || !to) {
      return '';
    }
    const radius = 30;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const x1 = from.x + ux * radius;
    const y1 = from.y + uy * radius;
    const x2 = to.x - ux * radius;
    const y2 = to.y - uy * radius;
    const midX = (x1 + x2) / 2 - uy * bend;
    const midY = (y1 + y2) / 2 + ux * bend;
    return `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
  }

  function edgeBend(edge: (typeof activeEdges)[number]): number {
    const siblings = activeEdges.filter(
      (other) => other.from === edge.from && other.to === edge.to,
    );
    if (siblings.length <= 1) {
      return 24;
    }
    const rank = siblings.indexOf(edge);
    return 12 + (rank - (siblings.length - 1) / 2) * 28;
  }

  function nodeLabel(id: string): string {
    return FLOW_NODES.find((node) => node.id === id)?.label ?? id;
  }
</script>

<section class="month" aria-label="This month">
  <label class="scrubber">
    <span>Month {monthIndex + 1} of {ticks.length} ({label})</span>
    <input
      type="range"
      min="0"
      max={last}
      step="1"
      value={monthIndex}
      aria-valuetext="Month {monthIndex + 1}, {label}"
      oninput={(event) => {
        monthIndex = Number((event.currentTarget as HTMLInputElement).value);
      }}
    />
  </label>

  <div class="panel">
    <h3>Who paid whom ({flows.unit})</h3>
    <svg viewBox="0 0 400 400" role="img" aria-label="Directed payment flows for the selected month">
      <defs>
        {#each activeEdges as edge, index (edge.from + edge.to + edge.label)}
          <marker
            id="flow-arrow-{index}"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={edge.color} />
          </marker>
        {/each}
      </defs>
      {#each activeEdges as edge, index (edge.from + edge.to + edge.label)}
        <path
          d={edgePath(edge.from, edge.to, edgeBend(edge))}
          fill="none"
          stroke={edge.color}
          stroke-width={strokeWidth(edge.amount, peak)}
          stroke-linecap="round"
          opacity="0.9"
          marker-end="url(#flow-arrow-{index})"
        >
          <title
            >{nodeLabel(edge.from)} → {nodeLabel(edge.to)}: {edge.label}
            {formatMoney(edge.amount)}
            {flows.unit}</title
          >
        </path>
      {/each}
      {#each FLOW_NODES as node (node.id)}
        <circle cx={node.x} cy={node.y} r="28" fill="#fafaf9" stroke="#1c1917" stroke-width="1.5" />
        <text x={node.x} y={node.y + 4} text-anchor="middle" font-size="11">{node.label}</text>
      {/each}
    </svg>
    <ul class="legend">
      {#each flows.edges as edge (edge.from + edge.to + edge.label)}
        <li style:--swatch={edge.color}>
          {nodeLabel(edge.from)} → {nodeLabel(edge.to)} · {edge.label}: {formatMoney(edge.amount)}
          {flows.unit}
        </li>
      {/each}
    </ul>
  </div>

  <div class="panel">
    <h3>Wealth by fifth</h3>
    <div class="stack" role="img" aria-label="Household wealth quintile shares">
      {#each census.wealth as slice (slice.label)}
        <div
          class="slice"
          style:flex-grow={Math.max(slice.share, 0.001)}
          style:background={slice.color}
          title="{slice.label}: {formatShare(slice.share)}"
        ></div>
      {/each}
    </div>
    <ul class="legend">
      {#each census.wealth as slice (slice.label)}
        <li style:--swatch={slice.color}>{slice.label}: {formatShare(slice.share)}</li>
      {/each}
    </ul>
  </div>

  <div class="panel">
    <h3>Jobs</h3>
    <div class="stack" role="img" aria-label="Job mix shares">
      {#each census.jobs as slice (slice.label)}
        <div
          class="slice"
          style:flex-grow={Math.max(slice.share, 0.001)}
          style:background={slice.color}
          title="{slice.label}: {formatShare(slice.share)}"
        ></div>
      {/each}
    </div>
    <ul class="legend">
      {#each census.jobs as slice (slice.label)}
        <li style:--swatch={slice.color}>{slice.label}: {formatShare(slice.share)}</li>
      {/each}
    </ul>
  </div>

  <div class="panel">
    <h3>AI agent owners</h3>
    {#if census.owners.hasAgents}
      <p>
        {census.owners.agentCount} agents owned by {census.owners.ownerCount} households. Those
        owners hold {formatShare(census.owners.ownerWealthShare)} of household deposits. Agents hold
        {formatShare(census.owners.aiShareOfWealth)} of household-plus-agent deposits.
      </p>
    {:else}
      <p>No autonomous agents this month.</p>
    {/if}
  </div>
</section>

<style>
  .month {
    display: grid;
    gap: 1.25rem;
    margin: 1.5rem 0 2rem;
  }
  .scrubber {
    display: grid;
    gap: 0.4rem;
  }
  .scrubber input {
    width: 100%;
  }
  .panel {
    background: #fffdf8;
    border: 1px solid #e7e5e4;
    border-radius: 0.4rem;
    padding: 0.85rem 1rem 1rem;
  }
  h3 {
    font-size: 1.05rem;
    font-weight: 600;
    margin: 0 0 0.6rem;
  }
  svg {
    display: block;
    height: auto;
    max-width: 28rem;
    width: 100%;
  }
  .stack {
    border-radius: 0.25rem;
    display: flex;
    height: 1.5rem;
    overflow: hidden;
    width: 100%;
  }
  .slice {
    min-width: 0;
  }
  .legend {
    color: #44403c;
    display: grid;
    font-size: 0.9rem;
    gap: 0.2rem 1rem;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    list-style: none;
    margin: 0.75rem 0 0;
    padding: 0;
  }
  .legend li {
    align-items: center;
    display: flex;
    gap: 0.4rem;
  }
  .legend li::before {
    background: var(--swatch);
    border-radius: 0.15rem;
    content: '';
    height: 0.65rem;
    width: 0.65rem;
  }
  p {
    color: #44403c;
    line-height: 1.45;
    margin: 0;
  }
</style>
