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
  import { matchingPreset, presetById } from './session/presets.js';
  import { defaultPage, pageSearch, parsePageState } from './session/query.js';
  import { activityLabel, readyLabel, runRequest } from './session/run.js';
  import {
    changedSliders,
    parameterSliders,
    resolvedSliders,
    sliderValue,
    writeSlider,
  } from './session/sliders.js';
  import Controls from './ui/Controls.svelte';
  import Ledger from './ui/Ledger.svelte';
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

  let seed = $state(initial.seed);
  let ticks = $state(initial.ticks);
  let regime = $state(initial.regime);
  let chartRegime = $state(initial.regime);
  let overrides = $state(initial.overrides);
  let requestedRegime = initial.regime;
  let status = $state('Set the parameters and run.');
  let result = $state<RunSuccess | null>(null);
  let busy = $state(false);
  let progressCompleted = $state(0);
  let progressTotal = $state(0);

  const progressPercent = $derived(percentComplete(progressCompleted, progressTotal));
  const changed = $derived(changedSliders(sliders, regime, overrides));
  const weights = $derived(compositeWeights(regime, overrides));
  const composite = $derived(shownComposite(result, weights));
  const note = $derived(compositeNote(compositeEnabled(weights), composite));
  const views = $derived(result === null ? [] : chartViews(result, chartRegime));
  const preset = $derived(matchingPreset(regime, overrides));

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
    chartRegime = requestedRegime;
    result = message;
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

  function run(kind: RunKind): void {
    let request;
    try {
      request = runRequest(kind, seed, ticks, resolvedSliders(sliders, regime, overrides));
    } catch (err) {
      fail(formatWorkerError(err));
      return;
    }
    requestedRegime = regime;
    progressCompleted = 0;
    progressTotal = tickBudget(request);
    busy = true;
    status = activityLabel(kind);
    worker.postMessage(request);
  }

  function applyPreset(id: string): void {
    const chosen = presetById(id);
    regime = chosen.regime;
    overrides = { ...chosen.overrides };
  }

  function onSlider(slider: Slider, raw: string): void {
    const next = writeSlider(slider, raw, regime, overrides);
    regime = next.regime;
    overrides = next.overrides;
  }

  function valueOf(slider: Slider): number | string {
    return sliderValue(slider, regime, overrides);
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

  <Controls bind:seed bind:ticks {preset} {busy} onPreset={applyPreset} onRun={run} />
  <Ledger sliders={changed} {note} value={valueOf} />

  {#if result}
    {#each views as chart (chart.key)}
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
  {/if}

  <Parameters {parameters} value={valueOf} onSlider={onSlider} />
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
