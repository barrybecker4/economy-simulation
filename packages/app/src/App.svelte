<script lang="ts">
  import { getSlider, listSliders, type Slider } from '../../core/src/config/registry.js';
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
    alignComparisonFrame,
    compareDiffs,
    comparisonFrame,
  } from './session/compare.js';
  import { monthCensus } from './session/census.js';
  import { monthFlows } from './session/flows.js';
  import { applyCategory, matchingCategories } from './session/presets.js';
  import { defaultPage, pageSearch, parsePageState } from './session/query.js';
  import { activityLabel, readyLabel, runRequest } from './session/run.js';
  import {
    changedSliders,
    parameterSliders,
    resolvedSliders,
    sliderValue,
    writeSlider,
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

  interface Pin {
    result: RunSuccess;
    regime: string;
    overrides: Record<string, number | string>;
    seed: number;
    ticks: number;
  }

  const FRAME_STATUS =
    'Baseline pinned. Edit parameters and run a variant. Scale, scoring, population growth, and trust in banks stay at the baseline.';

  const sliders = listSliders();
  const parameters = parameterSliders(sliders);
  const initial = parsePageState(location.search, defaultPage());

  let seed = $state(initial.seed);
  let ticks = $state(initial.ticks);
  let regime = $state(initial.regime);
  let chartRegime = $state(initial.regime);
  let overrides = $state(initial.overrides);
  let requestedRegime = initial.regime;
  let pendingOverrides: Record<string, number | string> = { ...initial.overrides };
  let resultOverrides = $state<Record<string, number | string>>({ ...initial.overrides });
  let status = $state('Set the parameters and run.');
  let result = $state<RunSuccess | null>(null);
  let pin = $state<Pin | null>(null);
  let busy = $state(false);
  let progressCompleted = $state(0);
  let progressTotal = $state(0);
  let monthIndex = $state(0);

  const progressPercent = $derived(percentComplete(progressCompleted, progressTotal));
  const changed = $derived(changedSliders(sliders, regime, overrides));
  const weights = $derived(compositeWeights(regime, overrides));
  const composite = $derived(shownComposite(result, weights));
  const note = $derived(compositeNote(compositeEnabled(weights), composite));
  const overlayBaseline = $derived(pairedBaseline(pin, result));
  const views = $derived(
    result === null ? [] : chartViews(result, chartRegime, overlayBaseline),
  );
  const outcomeViews = $derived(views.filter((view) => view.group !== 'This month'));
  const monthViews = $derived(views.filter((view) => view.group === 'This month'));
  const categories = $derived(matchingCategories(overrides));
  const resolved = $derived(resolvedSliders(sliders, regime, overrides));
  const householdCount = $derived(numericOverride('scale.households', 1000));
  const ownership = $derived(numericOverride('ai.ownershipConcentration', 0.5));
  const flows = $derived(result === null ? null : monthFlows(result, chartRegime, monthIndex));
  const baselineFlows = $derived(
    overlayBaseline === null
      ? null
      : monthFlows(overlayBaseline.result, overlayBaseline.regime, monthIndex),
  );
  const census = $derived(
    result === null ? null : monthCensus(result, monthIndex, householdCount, ownership),
  );
  const diffs = $derived(
    pin === null
      ? []
      : compareDiffs(
          sliders,
          { regime: pin.regime, overrides: pin.overrides },
          { regime, overrides },
        ),
  );
  const canPin = $derived(result?.kind === 'run');
  const canPromote = $derived(
    pin !== null && result !== null && result !== pin.result && result.kind === 'run',
  );
  const pinned = $derived(pin !== null);

  const worker = new Worker(new URL('./worker/worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = onWorkerMessage;
  worker.onerror = (event) => {
    fail(presentable(event.message));
  };
  worker.onmessageerror = () => {
    fail('could not read the worker reply.');
  };

  $effect(() => {
    if (pin === null) {
      return;
    }
    if (seed !== pin.seed || ticks !== pin.ticks) {
      pin = null;
    }
  });

  function numericOverride(id: string, fallback: number): number {
    const value = resolved[id];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  function pairedBaseline(
    current: Pin | null,
    currentResult: RunSuccess | null,
  ): { result: RunSuccess; regime: string } | null {
    if (
      current === null ||
      currentResult === null ||
      currentResult === current.result ||
      currentResult.kind !== 'run' ||
      current.result.kind !== 'run'
    ) {
      return null;
    }
    return { result: current.result, regime: current.regime };
  }

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
    chartRegime = requestedRegime;
    resultOverrides = { ...pendingOverrides };
    result = message;
    monthIndex = Math.max(0, message.ticks.length - 1);
    status = readyLabel(message.kind);
    const search = pageSearch({ seed, ticks, regime, overrides });
    history.replaceState(null, '', `?${search}`);
  }

  function fail(message: string): void {
    busy = false;
    result = null;
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

  function snapToPin(current: Pin): void {
    const aligned = alignComparisonFrame(
      sliders,
      { regime, overrides },
      { regime: current.regime, overrides: current.overrides },
    );
    regime = aligned.regime;
    overrides = aligned.overrides;
  }

  function run(kind: RunKind): void {
    if (pin !== null && kind !== 'run') {
      return;
    }
    if (pin !== null) {
      snapToPin(pin);
    }
    let request;
    try {
      request = runRequest(kind, seed, ticks, resolvedSliders(sliders, regime, overrides));
    } catch (err) {
      fail(formatWorkerError(err));
      return;
    }
    requestedRegime = regime;
    pendingOverrides = { ...overrides };
    progressCompleted = 0;
    progressTotal = tickBudget(request);
    busy = true;
    status = activityLabel(kind);
    worker.postMessage(request);
  }

  function pinBaseline(): void {
    if (result === null || result.kind !== 'run') {
      return;
    }
    const next: Pin = {
      result,
      regime: chartRegime,
      overrides: { ...resultOverrides },
      seed,
      ticks,
    };
    pin = next;
    snapToPin(next);
    status = FRAME_STATUS;
  }

  function clearBaseline(): void {
    pin = null;
    status = result === null ? 'Set the parameters and run.' : readyLabel(result.kind);
  }

  function promoteBaseline(): void {
    if (result === null || result.kind !== 'run') {
      return;
    }
    const next: Pin = {
      result,
      regime: chartRegime,
      overrides: { ...resultOverrides },
      seed,
      ticks,
    };
    pin = next;
    snapToPin(next);
    status = 'Variant is now the baseline. Scale, scoring, population growth, and trust in banks stay at the baseline.';
  }

  function resetDiff(id: string): void {
    if (pin === null) {
      return;
    }
    const slider = getSlider(id);
    const baselineValue = sliderValue(slider, pin.regime, pin.overrides);
    const next = writeSlider(slider, String(baselineValue), regime, overrides);
    regime = next.regime;
    overrides = next.overrides;
  }

  function applyCategoryChoice(categoryId: string, optionId: string): void {
    const next = applyCategory(categoryId, optionId, regime, overrides);
    regime = next.regime;
    overrides = next.overrides;
  }

  function onRegime(value: string): void {
    regime = value;
  }

  function onSlider(slider: Slider, raw: string): void {
    if (pin !== null && comparisonFrame(slider.id)) {
      return;
    }
    const next = writeSlider(slider, raw, regime, overrides);
    regime = next.regime;
    overrides = next.overrides;
  }

  function valueOf(slider: Slider): number | string {
    return sliderValue(slider, regime, overrides);
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
    bind:seed
    bind:ticks
    {busy}
    {pinned}
    {canPin}
    {canPromote}
    onRun={run}
    onPin={pinBaseline}
    onClear={clearBaseline}
    onPromote={promoteBaseline}
  />
  <Ledger sliders={changed} {note} value={valueOf} />

  {#if pin}
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
      <Month bind:monthIndex ticks={result.ticks} {flows} {baselineFlows} {census} />
    {/if}
  {/if}

  <Parameters
    {parameters}
    {regime}
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
