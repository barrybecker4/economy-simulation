<script lang="ts">
  import { listSliders, type Slider } from '../../core/src/config/registry.js';
  import Chart from './chart/Chart.svelte';
  import { chartViews } from './chart/view.js';
  import {
    compositeEnabled,
    compositeIndex,
    compositeNote,
    compositeWeights,
    levelsFrom,
  } from './session/composite.js';
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
    setSeed,
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
    sliderValue,
  } from './session/sliders.js';
  import Compare from './ui/Compare.svelte';
  import Controls from './ui/Controls.svelte';
  import Ledger from './ui/Ledger.svelte';
  import Month from './ui/Month.svelte';
  import Parameters from './ui/Parameters.svelte';
  import { tickBudget } from './worker/budget.js';
  import {
    formatWorkerError,
    percentComplete,
    type RunKind,
    type RunSuccess,
    type WorkerMessage,
  } from './worker/protocol.js';

  const sliders = listSliders();
  const parameters = parameterSliders(sliders);
  const initial = parsePageState(location.search, defaultPage());

  let session = $state(openComparisonSession(initial));
  let status = $state(IDLE_STATUS);
  let busy = $state(false);
  let progressCompleted = $state(0);
  let progressTotal = $state(0);
  let monthIndex = $state(0);

  const result = $derived(session.result);
  const bundle = $derived(comparisonBundle(session));
  const progressPercent = $derived(percentComplete(progressCompleted, progressTotal));
  const changed = $derived(changedSliders(sliders, session.regime, session.overrides));
  const weights = $derived(compositeWeights(session.regime, session.overrides));
  const composite = $derived(shownComposite(result, weights));
  const note = $derived(compositeNote(compositeEnabled(weights), composite));
  const views = $derived(
    bundle.variant === null
      ? []
      : chartViews(bundle.variant.result, bundle.variant.regime, bundle.baseline),
  );
  const outcomeViews = $derived(views.filter((view) => view.group !== 'This month'));
  const monthViews = $derived(views.filter((view) => view.group === 'This month'));
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
      : monthCensus(
          bundle.variant.result,
          monthIndex,
          bundle.variant.households,
          bundle.variant.ownership,
        ),
  );
  const baselineCensus = $derived(
    bundle.baseline === null
      ? null
      : monthCensus(
          bundle.baseline.result,
          monthIndex,
          bundle.baseline.households,
          bundle.baseline.ownership,
        ),
  );
  const diffs = $derived(comparisonDiffs(session, sliders));
  const canPin = $derived(canPinBaseline(session));
  const canPromote = $derived(canPromoteBaseline(session));
  const pinned = $derived(isPinned(session));

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

  function shownComposite(
    current: RunSuccess | null,
    currentWeights: ReturnType<typeof compositeWeights>,
  ): number | null {
    if (current?.kind !== 'run' || !compositeEnabled(currentWeights)) {
      return null;
    }
    return compositeIndex(currentWeights, levelsFrom(current.series));
  }

  function showResult(message: RunSuccess): void {
    busy = false;
    session = noteResult(session, message);
    monthIndex = Math.max(0, message.ticks.length - 1);
    status = readyLabel(message.kind);
    const search = pageSearch({
      seed: session.seed,
      ticks: session.ticks,
      regime: session.regime,
      overrides: session.overrides,
    });
    history.replaceState(null, '', `?${search}`);
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

  function run(kind: RunKind): void {
    const prepared = prepareRun(session, sliders, kind);
    if (prepared.blocked) {
      return;
    }
    session = prepared.session;
    let request;
    try {
      request = runRequest(
        kind,
        session.seed,
        session.ticks,
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
    status = activityLabel(kind);
    worker.postMessage(request);
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
    return sliderValue(slider, session.regime, session.overrides);
  }

  function showGroup(index: number, group: string, list: typeof views): boolean {
    if (index === 0) {
      return true;
    }
    return list[index - 1]?.group !== group;
  }
</script>

<main aria-busy={busy}>
  <header>
    <h1>Economy simulation</h1>
    <p>{status}</p>
    {#if busy}
      <div class="progress">
        <progress max={progressTotal} value={progressCompleted} aria-label="Simulation progress"></progress>
        <span>{progressPercent}%</span>
      </div>
    {/if}
  </header>

  <Controls
    bind:seed={() => session.seed, (seed) => (session = setSeed(session, seed))}
    bind:ticks={() => session.ticks, (ticks) => (session = setTicks(session, ticks))}
    {busy}
    {pinned}
    {canPin}
    {canPromote}
    onRun={run}
    onPin={commitPin}
    onClear={commitClear}
    onPromote={commitPromote}
  />
  <Ledger sliders={changed} {note} value={valueOf} />

  {#if pinned}
    <Compare {diffs} onReset={resetDiff} />
  {/if}

  {#if result}
    {#each outcomeViews as chart, index (chart.key)}
      {#if showGroup(index, chart.group, outcomeViews)}
        <h2 class="group">{chart.group}</h2>
      {/if}
      {#if chart.note}
        <p class="hint">{chart.note}</p>
      {/if}
      <Chart
        title={chart.title}
        unit={chart.unit}
        description={chart.description}
        ticks={result.ticks}
        lines={chart.lines}
      />
    {/each}

    {#if flows && census}
      <h2 class="group">This month</h2>
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
  {/if}

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
</main>

<style>
  :global(body) {
    background: #f7f4ef;
    color: #1c1917;
    margin: 0;
  }
  main {
    font-family: Georgia, serif;
    margin: 0 auto;
    max-width: 960px;
    padding: 1rem;
  }
  .group {
    font-size: 1.35rem;
    font-weight: 600;
    margin: 1.75rem 0 0.6rem;
  }
  .hint {
    color: #57534e;
    font-size: 0.95rem;
    line-height: 1.45;
    margin: 0 0 0.4rem;
  }
  .progress {
    align-items: center;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: 1fr auto;
    margin: 0.25rem 0 0;
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
</style>
