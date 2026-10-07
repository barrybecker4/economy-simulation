<script lang="ts">
  import { FLOW_NODES, maxFlowAmount, strokeWidth, type FlowEdge, type MonthFlows } from '../session/flows.js';
  import type { MonthCensus } from '../session/census.js';
  import { monthStart } from '../chart/time.js';

  interface ShareSlice {
    label: string;
    share: number;
    color: string;
  }

  let {
    ticks,
    monthIndex = $bindable(0),
    flows,
    baselineFlows = null,
    census,
    baselineCensus = null,
  }: {
    ticks: number[];
    monthIndex: number;
    flows: MonthFlows;
    baselineFlows?: MonthFlows | null;
    census: MonthCensus;
    baselineCensus?: MonthCensus | null;
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
  const paired = $derived(baselineFlows !== null);
  const nodes = Object.fromEntries(FLOW_NODES.map((node) => [node.id, node]));

  const variantPeak = $derived(maxFlowAmount(flows.edges));
  const baselinePeak = $derived(
    baselineFlows === null ? 0 : maxFlowAmount(baselineFlows.edges),
  );
  const sharedPeak = $derived(
    paired && baselineFlows !== null && baselineFlows.unit === flows.unit
      ? Math.max(variantPeak, baselinePeak)
      : null,
  );
  const variantScale = $derived(sharedPeak ?? variantPeak);
  const baselineScale = $derived(sharedPeak ?? baselinePeak);
  const variantEdges = $derived(activeEdges(flows.edges));
  const baselineEdges = $derived(
    baselineFlows === null ? [] : activeEdges(baselineFlows.edges),
  );

  let tipText = $state('');
  let tipX = $state(0);
  let tipY = $state(0);
  let tipOpen = $state(false);

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

  function shareCaption(title: string, slices: readonly ShareSlice[]): string {
    const parts = slices.map((slice) => `${slice.label} ${formatShare(slice.share)}`);
    return `${title}. ${parts.join(', ')}.`;
  }

  function activeEdges(edges: readonly FlowEdge[]): FlowEdge[] {
    return edges.filter((edge) => edge.amount > 0);
  }

  function edgeCaption(edge: FlowEdge, unit: string): string {
    return `${nodeLabel(edge.from)} → ${nodeLabel(edge.to)} · ${edge.label}: ${formatMoney(edge.amount)} ${unit}`;
  }

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

  function edgeBend(edge: FlowEdge, siblings: readonly FlowEdge[]): number {
    const group = siblings.filter((other) => other.from === edge.from && other.to === edge.to);
    if (group.length <= 1) {
      return 24;
    }
    const rank = group.indexOf(edge);
    return 12 + (rank - (group.length - 1) / 2) * 28;
  }

  function nodeLabel(id: string): string {
    return FLOW_NODES.find((node) => node.id === id)?.label ?? id;
  }

  function showTip(text: string, clientX: number, clientY: number): void {
    tipText = text;
    tipX = clientX;
    tipY = clientY;
    tipOpen = true;
  }

  function moveTip(clientX: number, clientY: number): void {
    tipX = clientX;
    tipY = clientY;
  }

  function hideTip(): void {
    tipOpen = false;
  }

  function onEdgePointerEnter(event: PointerEvent, text: string): void {
    showTip(text, event.clientX, event.clientY);
  }

  function onEdgePointerMove(event: PointerEvent): void {
    if (!tipOpen) {
      return;
    }
    moveTip(event.clientX, event.clientY);
  }

  function onEdgeFocus(event: FocusEvent, text: string): void {
    const target = event.currentTarget;
    if (!(target instanceof Element)) {
      return;
    }
    const box = target.getBoundingClientRect();
    showTip(text, box.left + box.width / 2, box.top);
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
    <h3>Who paid whom{#if !paired} ({flows.unit}){/if}</h3>
    <div class="graphs" class:paired>
      {#if baselineFlows}
        <div class="graph">
          <h4>Baseline ({baselineFlows.unit})</h4>
          <svg
            viewBox="0 0 400 400"
            role="img"
            aria-label="Baseline directed payment flows for the selected month"
          >
            <defs>
              {#each baselineEdges as edge, index (edge.from + edge.to + edge.label)}
                <marker
                  id="flow-arrow-baseline-{index}"
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
            {#each baselineEdges as edge, index (edge.from + edge.to + edge.label)}
              {@const caption = edgeCaption(edge, baselineFlows.unit)}
              {@const path = edgePath(edge.from, edge.to, edgeBend(edge, baselineEdges))}
              {@const width = strokeWidth(edge.amount, baselineScale)}
              <g
                role="button"
                tabindex="0"
                aria-label={caption}
                onpointerenter={(event) => onEdgePointerEnter(event, caption)}
                onpointermove={onEdgePointerMove}
                onpointerleave={hideTip}
                onfocus={(event) => onEdgeFocus(event, caption)}
                onblur={hideTip}
              >
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  stroke-width={Math.max(width + 10, 14)}
                  stroke-linecap="round"
                />
                <path
                  d={path}
                  fill="none"
                  stroke={edge.color}
                  stroke-width={width}
                  stroke-linecap="round"
                  opacity="0.9"
                  marker-end="url(#flow-arrow-baseline-{index})"
                  pointer-events="none"
                />
              </g>
            {/each}
            {#each FLOW_NODES as node (node.id)}
              <circle
                cx={node.x}
                cy={node.y}
                r="28"
                fill="#fafaf9"
                stroke="#1c1917"
                stroke-width="1.5"
              />
              <text x={node.x} y={node.y + 4} text-anchor="middle" font-size="11">{node.label}</text>
            {/each}
          </svg>
        </div>
      {/if}
      <div class="graph">
        {#if paired}
          <h4>Scenario ({flows.unit})</h4>
        {/if}
        <svg
          viewBox="0 0 400 400"
          role="img"
          aria-label="{paired ? 'Scenario ' : ''}Directed payment flows for the selected month"
        >
          <defs>
            {#each variantEdges as edge, index (edge.from + edge.to + edge.label)}
              <marker
                id="flow-arrow-variant-{index}"
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
          {#each variantEdges as edge, index (edge.from + edge.to + edge.label)}
            {@const caption = edgeCaption(edge, flows.unit)}
            {@const path = edgePath(edge.from, edge.to, edgeBend(edge, variantEdges))}
            {@const width = strokeWidth(edge.amount, variantScale)}
            <g
              role="button"
              tabindex="0"
              aria-label={caption}
              onpointerenter={(event) => onEdgePointerEnter(event, caption)}
              onpointermove={onEdgePointerMove}
              onpointerleave={hideTip}
              onfocus={(event) => onEdgeFocus(event, caption)}
              onblur={hideTip}
            >
              <path
                d={path}
                fill="none"
                stroke="transparent"
                stroke-width={Math.max(width + 10, 14)}
                stroke-linecap="round"
              />
              <path
                d={path}
                fill="none"
                stroke={edge.color}
                stroke-width={width}
                stroke-linecap="round"
                opacity="0.9"
                marker-end="url(#flow-arrow-variant-{index})"
                pointer-events="none"
              />
            </g>
          {/each}
          {#each FLOW_NODES as node (node.id)}
            <circle
              cx={node.x}
              cy={node.y}
              r="28"
              fill="#fafaf9"
              stroke="#1c1917"
              stroke-width="1.5"
            />
            <text x={node.x} y={node.y + 4} text-anchor="middle" font-size="11">{node.label}</text>
          {/each}
        </svg>
      </div>
    </div>
  </div>

  <div class="panel">
    <h3>Wealth by fifth</h3>
    {#if baselineCensus}
      {@render comparedShares(
        baselineCensus.wealth,
        census.wealth,
        'household wealth quintile shares',
      )}
    {:else}
      {@render shareStack(census.wealth, 'Household wealth quintile shares')}
      {@render shareLegend(census.wealth)}
    {/if}
  </div>

  <div class="panel">
    <h3>Jobs</h3>
    {#if baselineCensus}
      {@render comparedShares(baselineCensus.jobs, census.jobs, 'job mix shares')}
    {:else}
      {@render shareStack(census.jobs, 'Job mix shares')}
      {@render shareLegend(census.jobs)}
    {/if}
  </div>

  {#snippet shareStack(slices: ShareSlice[], caption: string)}
    <div class="stack" role="img" aria-label={caption}>
      {#each slices as slice (slice.label)}
        <div
          class="slice"
          style:flex-grow={Math.max(slice.share, 0.001)}
          style:background={slice.color}
          title="{slice.label}: {formatShare(slice.share)}"
        ></div>
      {/each}
    </div>
  {/snippet}

  {#snippet shareLegend(slices: ShareSlice[])}
    <ul class="legend">
      {#each slices as slice (slice.label)}
        <li style:--swatch={slice.color}>{slice.label}: {formatShare(slice.share)}</li>
      {/each}
    </ul>
  {/snippet}

  {#snippet comparedShares(baseline: ShareSlice[], variant: ShareSlice[], noun: string)}
    <div class="compare-lines">
      <div class="line">
        <span class="line-label">Baseline</span>
        {@render shareStack(baseline, shareCaption(`Baseline ${noun}`, baseline))}
      </div>
      <div class="line">
        <span class="line-label">Scenario</span>
        {@render shareStack(variant, shareCaption(`Scenario ${noun}`, variant))}
      </div>
    </div>
    <ul class="legend paired">
      {#each baseline as slice, index (slice.label)}
        <li style:--swatch={slice.color}>
          {slice.label}: {formatShare(slice.share)} → {formatShare(variant[index]?.share ?? 0)}
        </li>
      {/each}
    </ul>
  {/snippet}

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

{#if tipOpen}
  <div class="edge-tip" style:left="{tipX}px" style:top="{tipY}px" role="tooltip">
    {tipText}
  </div>
{/if}

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
  h4 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 0.45rem;
  }
  .graphs {
    display: grid;
    gap: 1rem;
  }
  .graphs.paired {
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  }
  .graph {
    min-width: 0;
  }
  svg {
    display: block;
    height: auto;
    max-width: 28rem;
    width: 100%;
  }
  .graphs.paired svg {
    max-width: none;
  }
  g[tabindex] {
    cursor: help;
    outline: none;
  }
  g[tabindex]:focus-visible {
    filter: drop-shadow(0 0 2px #1c1917);
  }
  .compare-lines {
    display: grid;
    gap: 0.4rem;
  }
  .line {
    align-items: center;
    display: grid;
    gap: 0.55rem;
    grid-template-columns: 4.75rem minmax(0, 1fr);
  }
  .line-label {
    color: #44403c;
    font-size: 0.85rem;
    font-weight: 600;
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
  .legend.paired {
    grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
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
  .edge-tip {
    background: #1c1917;
    border-radius: 0.35rem;
    color: #fafaf9;
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 0.82rem;
    left: 0;
    line-height: 1.35;
    max-width: min(22rem, calc(100vw - 1.5rem));
    padding: 0.4rem 0.55rem;
    pointer-events: none;
    position: fixed;
    top: 0;
    transform: translate(12px, 12px);
    z-index: 50;
  }
</style>
