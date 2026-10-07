<script lang="ts">
  import { listSliders, type Slider } from '../../core/src/config/registry.js';
  import Chart from './chart/Chart.svelte';
  import { chartViews, type ChartView } from './chart/view.js';
  import {
    canPinBaseline,
    canPromoteBaseline,
    clearBaseline,
    comparisonBundle,
    comparisonDiffs,
    editCategory,
    editRegime,
    editSlider,
    IDLE_STATUS,
    isPinned,
    noteFailure,
    notePosted,
    noteResult,
    openComparisonSession,
    pinBaseline,
    prepareRun,
    promoteBaseline,
    resetDiffToBaseline,
    resetToDefaults,
    setSeed,
    setSeeds,
    setTicks,
  } from './session/compare.js';
  import { monthCensus } from './session/census.js';
  import { monthFlows } from './session/flows.js';
  import { matchingCategories } from './session/presets.js';
  import { defaultPage, pageSearch, parsePageState } from './session/query.js';
  import { activityLabel, readyLabel, runRequest } from './session/run.js';
  import {
    changedSliders,
    parameterSliders,
    resolvedSliders,
    presentedSliderValue,
  } from './session/sliders.js';
  import { nextStep, runIsPrimary } from './session/guide.js';
  import Compare from './ui/Compare.svelte';
  import Controls from './ui/Controls.svelte';
  import Guide from './ui/Guide.svelte';
  import Ledger from './ui/Ledger.svelte';
  import Month from './ui/Month.svelte';
  import Parameters from './ui/Parameters.svelte';
  import { tickBudget } from './worker/budget.js';
  import {
    formatWorkerError,
    percentComplete,
    type RunSuccess,
    type WorkerMessage,
  } from './worker/protocol.js';

  const FIRST_CHART_GROUP = 'Welfare';
  const sliders = listSliders();
  const parameters = parameterSliders(sliders);
  const initial = parsePageState(location.search, defaultPage());

  let session = $state(openComparisonSession(initial));
  let status = $state(IDLE_STATUS);
  let busy = $state(false);
  let progressCompleted = $state(0);
  let progressTotal = $state(0);
  let monthIndex = $state(0);
  let resultsEl: HTMLElement | undefined = $state();
  let openChartGroups = $state<Record<string, boolean>>({ [FIRST_CHART_GROUP]: true });

  const result = $derived(session.result);
  const bundle = $derived(comparisonBundle(session));
  const progressPercent = $derived(percentComplete(progressCompleted, progressTotal));
  const changed = $derived(changedSliders(sliders, session.regime, session.overrides));
  const views = $derived(
    bundle.variant === null
      ? []
      : chartViews(
          bundle.variant.result,
          bundle.variant.regime,
          bundle.baseline === null
            ? null
            : {
                result: bundle.baseline.result,
                regime: bundle.baseline.regime,
                transitionLength: bundle.baseline.transitionLength,
              },
          bundle.variant.transitionLength,
        ),
  );
  const outcomeViews = $derived(views.filter((view) => view.group !== 'This month'));
  const monthViews = $derived(views.filter((view) => view.group === 'This month'));
  const outcomeGroups = $derived(groupedChartViews(outcomeViews));
  const categories = $derived(matchingCategories(session.overrides));
  const flows = $derived(
    bundle.variant === null
      ? null
      : monthFlows(bundle.variant.result, bundle.variant.regime, monthIndex),
  );
  const baselineFlows = $derived(
    bundle.baseline === null
      ? null
      : monthFlows(bundle.baseline.result, bundle.baseline.regime, monthIndex),
  );
  const census = $derived(
    bundle.variant === null
      ? null
      : monthCensus(bundle.variant.result, monthIndex, bundle.variant),
  );
  const baselineCensus = $derived(
    bundle.baseline === null
      ? null
      : monthCensus(bundle.baseline.result, monthIndex, bundle.baseline),
  );
  const diffs = $derived(comparisonDiffs(session, sliders));
  const canPin = $derived(canPinBaseline(session));
  const canPromote = $derived(canPromoteBaseline(session));
  const pinned = $derived(isPinned(session));
  const hint = $derived(nextStep(session));
  const primaryRun = $derived(runIsPrimary(session));

  const worker = new Worker(new URL('./worker/worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = onWorkerMessage;
  worker.onerror = (event) => {
    fail(presentable(event.message));
  };
  worker.onmessageerror = () => {
    fail('could not read the worker reply.');
  };

  function onWorkerMessage(event: MessageEvent<WorkerMessage>): void {
    const message = event.data;
    if (message.kind === 'progress') {
      progressCompleted = message.completed;
      progressTotal = message.total;
      return;
    }
    if (message.kind === 'error') {
      fail(message.message);
      return;
    }
    showResult(message);
  }

  function showResult(message: RunSuccess): void {
    busy = false;
    session = noteResult(session, message);
    monthIndex = Math.max(0, message.ticks.length - 1);
    status = readyLabel();
    const search = pageSearch({
      seed: session.seed,
      ticks: session.ticks,
      seeds: session.seeds,
      regime: session.regime,
      overrides: session.overrides,
    });
    history.replaceState(null, '', `?${search}`);
    queueMicrotask(() => {
      if (resultsEl === undefined) {
        return;
      }
      resultsEl.scrollTop = 0;
      resultsEl.scrollIntoView({ block: 'nearest' });
    });
  }

  function fail(message: string): void {
    busy = false;
    session = noteFailure(session);
    status = `The run failed: ${message}`;
    console.error('[sim]', message);
  }

  function presentable(message: string): string {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      return 'worker error';
    }
    return trimmed;
  }

  function applyUpdate(update: { session: typeof session; status?: string }): void {
    session = update.session;
    if (update.status !== undefined) {
      status = update.status;
    }
  }

  function run(): void {
    if (busy) {
      return;
    }
    const prepared = prepareRun(session, sliders);
    if (prepared.blocked) {
      return;
    }
    session = prepared.session;
    let request;
    try {
      request = runRequest(
        session.seed,
        session.ticks,
        session.seeds,
        resolvedSliders(sliders, session.regime, session.overrides),
      );
    } catch (err) {
      fail(formatWorkerError(err));
      return;
    }
    session = notePosted(session);
    progressCompleted = 0;
    progressTotal = tickBudget(request);
    busy = true;
    status = activityLabel(session.seeds);
    worker.postMessage(request);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey)) {
      return;
    }
    event.preventDefault();
    run();
  }

  function commitPin(): void {
    applyUpdate(pinBaseline(session, sliders));
  }

  function commitClear(): void {
    applyUpdate(clearBaseline(session));
  }

  function commitPromote(): void {
    applyUpdate(promoteBaseline(session, sliders));
  }

  function commitReset(): void {
    applyUpdate(resetToDefaults());
    monthIndex = 0;
    history.replaceState(null, '', `?${pageSearch(defaultPage())}`);
  }

  function resetDiff(id: string): void {
    session = resetDiffToBaseline(session, id);
  }

  function applyCategoryChoice(categoryId: string, optionId: string): void {
    session = editCategory(session, categoryId, optionId);
  }

  function onRegime(value: string): void {
    session = editRegime(session, value);
  }

  function onSlider(slider: Slider, raw: string): void {
    session = editSlider(session, slider, raw);
  }

  function valueOf(slider: Slider): number | string {
    return presentedSliderValue(slider, session.regime, session.overrides);
  }

  function isChartGroupOpen(group: string): boolean {
    return openChartGroups[group] === true;
  }

  function onChartGroupToggle(group: string, event: Event): void {
    const next = (event.currentTarget as HTMLDetailsElement).open;
    if (openChartGroups[group] === next) {
      return;
    }
    openChartGroups = { ...openChartGroups, [group]: next };
  }

  function groupedChartViews(list: readonly ChartView[]): { group: string; charts: ChartView[] }[] {
    const groups: { group: string; charts: ChartView[] }[] = [];
    for (const chart of list) {
      const last = groups[groups.length - 1];
      if (last !== undefined && last.group === chart.group) {
        last.charts.push(chart);
      } else {
        groups.push({ group: chart.group, charts: [chart] });
      }
    }
    return groups;
  }
</script>

<svelte:window onkeydown={onKeydown} />

<main aria-busy={busy}>
  <header class="bar">
    <div class="title-row">
      <h1>Economy simulation</h1>
      <Guide />
    </div>
    <Controls
      bind:seed={() => session.seed, (seed) => (session = setSeed(session, seed))}
      bind:ticks={() => session.ticks, (ticks) => (session = setTicks(session, ticks))}
      bind:seeds={() => session.seeds, (seeds) => (session = setSeeds(session, seeds))}
      {busy}
      runPrimary={primaryRun}
      {pinned}
      {canPin}
      {canPromote}
      onRun={run}
      onPin={commitPin}
      onClear={commitClear}
      onPromote={commitPromote}
      onReset={commitReset}
    />
    <p class="status">{status}</p>
    {#if busy}
      <div class="progress">
        <progress max={progressTotal} value={progressCompleted} aria-label="Simulation progress"></progress>
        <span>{progressPercent}%</span>
      </div>
    {/if}
    <p class="next" aria-live="polite">{hint}</p>
  </header>

  <div class="workspace">
    <aside class="editor">
      <Parameters
        {parameters}
        regime={session.regime}
        {categories}
        {pinned}
        value={valueOf}
        onRegime={onRegime}
        onCategory={applyCategoryChoice}
        onSlider={onSlider}
      />
      <Ledger sliders={changed} value={valueOf} />
    </aside>

    <section class="results" bind:this={resultsEl} aria-label="Results">
      {#if pinned}
        <Compare {diffs} onReset={resetDiff} />
      {/if}

      {#if result}
        {#each outcomeGroups as block (block.group)}
          <details
            class="chart-group"
            open={isChartGroupOpen(block.group)}
            ontoggle={(event) => onChartGroupToggle(block.group, event)}
          >
            <summary>{block.group}</summary>
            {#if isChartGroupOpen(block.group)}
              {#each block.charts as chart (chart.key)}
                {#if chart.note}
                  <p class="hint">{chart.note}</p>
                {/if}
                <Chart
                  title={chart.title}
                  unit={chart.unit}
                  description={chart.description}
                  ticks={result.ticks}
                  lines={chart.lines}
                  marks={chart.marks}
                  caption={chart.caption ?? ''}
                />
              {/each}
            {/if}
          </details>
        {/each}

        {#if flows && census}
          <details
            class="chart-group"
            open={isChartGroupOpen('This month')}
            ontoggle={(event) => onChartGroupToggle('This month', event)}
          >
            <summary>This month</summary>
            {#if isChartGroupOpen('This month')}
              {#each monthViews as chart (chart.key)}
                {#if chart.note}
                  <p class="hint">{chart.note}</p>
                {/if}
                <Chart
                  title={chart.title}
                  unit={chart.unit}
                  description={chart.description}
                  ticks={result.ticks}
                  lines={chart.lines}
                  marks={chart.marks}
                  caption={chart.caption ?? ''}
                />
              {/each}
              <Month
                bind:monthIndex
                ticks={result.ticks}
                {flows}
                {baselineFlows}
                {census}
                {baselineCensus}
              />
            {/if}
          </details>
        {/if}
      {:else}
        <p class="empty">Press Run to see charts of prices, jobs, and welfare.</p>
      {/if}
    </section>
  </div>
</main>

<style>
  :global(html),
  :global(body) {
    height: 100%;
  }
  :global(body) {
    background: #f7f4ef;
    color: #1c1917;
    margin: 0;
  }
  main {
    display: flex;
    flex-direction: column;
    font-family: Georgia, serif;
    height: 100%;
    margin: 0 auto;
    max-width: 1400px;
    min-height: 100vh;
    padding: 0 1rem 1rem;
  }
  .bar {
    background: #f7f4ef;
    border-bottom: 1px solid #d6d3d1;
    flex-shrink: 0;
    padding: 1rem 0 0.85rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .title-row {
    align-items: baseline;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    margin: 0 0 0.75rem;
  }
  h1 {
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0;
  }
  .status {
    margin: 0.55rem 0 0;
  }
  .next {
    color: #44403c;
    font-size: 0.95rem;
    line-height: 1.45;
    margin: 0.45rem 0 0;
  }
  .progress {
    align-items: center;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr auto;
    margin: 0.35rem 0 0;
  }
  .progress progress {
    accent-color: #1c1917;
    height: 0.75rem;
    width: 100%;
  }
  .progress span {
    font-variant-numeric: tabular-nums;
    min-width: 3.5ch;
    text-align: right;
  }
  .workspace {
    display: grid;
    flex: 1;
    gap: 1.5rem;
    grid-template-columns: minmax(17rem, 24rem) minmax(0, 1fr);
    min-height: 0;
    padding-top: 1rem;
  }
  .editor,
  .results {
    min-height: 0;
    overflow: auto;
  }
  .results {
    scroll-margin-top: 1rem;
  }
  .empty {
    color: #57534e;
    margin: 0.25rem 0 0;
  }
  .chart-group {
    border-bottom: 1px solid #ddd;
    margin: 0 0 0.35rem;
    padding: 0 0 0.35rem;
  }
  .chart-group summary {
    cursor: pointer;
    font-size: 1.2rem;
    font-weight: 600;
    list-style: none;
    padding: 0.55rem 0;
  }
  .chart-group summary::-webkit-details-marker {
    display: none;
  }
  .chart-group summary::before {
    color: #78716c;
    content: '▸';
    display: inline-block;
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 0.85rem;
    margin-right: 0.4rem;
    width: 0.9rem;
  }
  .chart-group[open] summary::before {
    content: '▾';
  }
  .hint {
    color: #57534e;
    font-size: 0.95rem;
    line-height: 1.45;
    margin: 0 0 0.4rem;
  }
  @media (max-width: 899px) {
    main {
      height: auto;
    }
    .workspace {
      display: block;
      overflow: visible;
    }
    .editor,
    .results {
      overflow: visible;
    }
    .results {
      margin-top: 1.5rem;
      scroll-margin-top: 6rem;
    }
  }
</style>
