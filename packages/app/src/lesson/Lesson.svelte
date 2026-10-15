<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DEFICIT_LESSON_SEED,
    DEFICIT_LESSON_TICKS,
    deficitLessonSliders,
  } from '../../../core/src/lesson/deficit.js';
  import Chart from '../chart/Chart.svelte';
  import { VARIANT_DASH, type ChartLine } from '../chart/view.js';
  import { requireSeries } from '../worker/series.js';
  import type { RunSuccess, SingleRunResult, WorkerMessage } from '../worker/protocol.js';
  import { lessonCopy, type LessonCopy } from './readout.js';

  const Y_MIN_FRACTION = 0.08;
  const chartOrigin = new Date();

  let demandChoice = $state<'off' | 'on'>('off');
  let priceChoice = $state<'off' | 'on'>('off');
  const addsDemand = $derived(demandChoice === 'on');
  const pricesFollowDemand = $derived(priceChoice === 'on');
  let ready = $state(false);
  let busy = $state(true);
  let status = $state('Running the balanced budget…');
  let error = $state('');
  let balanced = $state<SingleRunResult | null>(null);
  let deficit = $state<SingleRunResult | null>(null);

  let generation = 0;
  let worker: Worker | undefined;

  const copy = $derived<LessonCopy | null>(
    balanced === null || deficit === null
      ? null
      : lessonCopy({
          addsDemand,
          pricesFollowDemand,
          levels: {
            priceBaseline: last(balanced, 'priceLevel'),
            priceScenario: last(deficit, 'priceLevel'),
            demandBaseline: average(seriesOf(balanced, 'householdGoodsSpend')),
            demandScenario: average(seriesOf(deficit, 'householdGoodsSpend')),
            moneyBaseline: last(balanced, 'moneySupply'),
            moneyScenario: last(deficit, 'moneySupply'),
          },
        }),
  );

  const charts = $derived(
    balanced === null || deficit === null
      ? []
      : [
          chart(
            'prices',
            'Prices',
            'index',
            'CPI, the basket of posted firm prices. Solid is the balanced budget. Dashed is purchases at 35 percent of income and tax at 20 percent.',
            seriesOf(balanced, 'priceLevel'),
            seriesOf(deficit, 'priceLevel'),
            copy?.prices ?? '',
          ),
          chart(
            'demand',
            'Household goods',
            'model cents',
            'What households spend on goods. The score is the average month. The treasury still buys only leftover inventory, so its purchases move the other way when households spend more.',
            seriesOf(balanced, 'householdGoodsSpend'),
            seriesOf(deficit, 'householdGoodsSpend'),
            copy?.demand ?? '',
          ),
          chart(
            'money',
            'Money stock',
            'model cents',
            'Broad money. Bonds issued to cover a purchase order the tax does not pay create deposits, including cash the treasury later rebates.',
            seriesOf(balanced, 'moneySupply'),
            seriesOf(deficit, 'moneySupply'),
            copy?.money ?? '',
          ),
        ],
  );

  onMount(() => {
    worker = new Worker(new URL('../worker/worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      pending?.(event.data);
    };
    worker.onerror = () => {
      fail('The run failed.');
    };
    ready = true;
    return () => {
      generation += 1;
      ready = false;
      worker?.terminate();
    };
  });

  $effect(() => {
    if (!ready) {
      return;
    }
    const demand = demandChoice === 'on';
    const follow = priceChoice === 'on';
    const token = ++generation;
    void runPair(demand, follow, token);
  });

  let pending: ((message: WorkerMessage) => void) | undefined;

  async function runPair(demand: boolean, follow: boolean, token: number): Promise<void> {
    busy = true;
    error = '';
    try {
      status = 'Running the balanced budget…';
      const base = await request(
        deficitLessonSliders({ addsDemand: demand, pricesFollowDemand: follow, deficit: false }),
        token,
      );
      if (token !== generation) {
        return;
      }
      status = 'Running the deficit…';
      const variant = await request(
        deficitLessonSliders({ addsDemand: demand, pricesFollowDemand: follow, deficit: true }),
        token,
      );
      if (token !== generation) {
        return;
      }
      balanced = base;
      deficit = variant;
      busy = false;
      status = 'Compared with the balanced budget.';
    } catch (err) {
      if (token !== generation) {
        return;
      }
      fail(err instanceof Error ? err.message : 'The run failed.');
    }
  }

  function request(
    sliders: Record<string, number | string>,
    token: number,
  ): Promise<SingleRunResult> {
    return new Promise((resolve, reject) => {
      if (worker === undefined || token !== generation) {
        reject(new Error('The run was replaced.'));
        return;
      }
      pending = (message) => {
        if (token !== generation) {
          return;
        }
        if (message.kind === 'progress') {
          return;
        }
        pending = undefined;
        if (message.kind === 'error') {
          reject(new Error(message.message));
          return;
        }
        resolve(asSingle(message));
      };
      worker.postMessage({
        kind: 'run',
        seed: DEFICIT_LESSON_SEED,
        ticks: DEFICIT_LESSON_TICKS,
        sliders,
      });
    });
  }

  function fail(message: string): void {
    busy = false;
    error = message;
    status = 'The run failed.';
  }

  function asSingle(message: RunSuccess): SingleRunResult {
    if (message.kind !== 'run') {
      throw new Error('The lesson runs one seed.');
    }
    return message;
  }

  function seriesOf(result: SingleRunResult, id: string): number[] {
    return requireSeries(result.series, id);
  }

  function last(result: SingleRunResult, id: string): number {
    const values = seriesOf(result, id);
    return values[values.length - 1] ?? 0;
  }

  function average(values: readonly number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function chart(
    key: string,
    title: string,
    unit: string,
    description: string,
    base: number[],
    variant: number[],
    caption: string,
  ): {
    key: string;
    title: string;
    unit: string;
    description: string;
    ticks: number[];
    lines: ChartLine[];
    caption: string;
  } {
    const ticks = balanced?.ticks ?? [];
    return {
      key,
      title,
      unit,
      description,
      ticks,
      caption,
      lines: [
        { label: 'Balanced', values: base, color: '#1c1917' },
        { label: 'Deficit', values: variant, color: '#1d4ed8', dash: VARIANT_DASH },
      ],
    };
  }
</script>

<main aria-busy={busy}>
  <header class="bar">
    <div class="title-row">
      <h1>Deficit lesson</h1>
      <a class="source-link" href="?">Full model</a>
    </div>
    <p class="status">{status}</p>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  </header>

  <div class="workspace">
    <section class="editor" aria-label="Lesson">
      <h2>If the government spends more than it taxes, what happens?</h2>
      <p>
        This page compares two budgets that differ in one number. The balanced budget taxes 20 percent of income and
        buys 20 percent. The deficit taxes 20 percent and buys 35 percent. Solid lines are the balanced budget. Dashed
        lines are the deficit.         Prices and the money stock are scored on the last month. Household goods are scored on the
        average month, so one noisy month does not decide them.
      </p>
      <h3>Why the ordinary answer needs two switches</h3>
      <p>
        Spending above taxes usually means the treasury borrows, broad money rises, and more money chases the same
        goods, so prices rise. This model starts with the two links in that chain turned off, for reasons that are
        about the opening run, not about a claim that deficits cannot cause inflation.
      </p>
      <ul>
        <li>
          The purchase share is a split of one income. Households spend what the government does not, so the goods
          market is not asked to sell the same income twice. Raising the share moves who buys. It does not add a buyer.
          The treasury still only takes inventory households leave, and it hands back cash above one month of what it
          actually spent.
        </li>
        <li>
          Posted prices follow the inflation target. The price trend weight defaults to 1 so the first months do not
          jump with excess demand. Nothing in the price rule reads the money stock. Money changes prices when someone
          spends it and prices are allowed to follow that spending.
        </li>
      </ul>
      <p>
        Bonds can still be issued for the purchase order, so the money stock can rise while goods bought and prices
        stay on the balanced path. Turn the levers on one at a time and watch which of the three moves.
      </p>

      <fieldset>
        <legend>Extra spending adds demand</legend>
        <label>
          <input type="radio" name="demand" bind:group={demandChoice} value="off" />
          Off. The purchase share is taken from households.
        </label>
        <label>
          <input type="radio" name="demand" bind:group={demandChoice} value="on" />
          On. Spending above the tax is spent as well.
        </label>
      </fieldset>

      <fieldset>
        <legend>Prices follow goods demand</legend>
        <label>
          <input type="radio" name="prices" bind:group={priceChoice} value="off" />
          Off. Posted prices follow the 2 percent target.
        </label>
        <label>
          <input type="radio" name="prices" bind:group={priceChoice} value="on" />
          On. Posted prices follow how much buyers want relative to what firms can make.
        </label>
      </fieldset>

      <p class="note">
        The grant, the automatic stabilizer, and shocks are off, and the inflation anchor sits on the target, so those
        channels stay out of the comparison. The economy is 80 households and 48 months, small enough to rerun as you
        switch. The accounting is the same rule as the full model.
      </p>
    </section>

    <section class="results" aria-label="Comparison">
      {#if copy}
        <p class="score">{copy.score}</p>
      {/if}
      {#each charts as item (item.key)}
        <Chart
          chartKey={item.key}
          title={item.title}
          unit={item.unit}
          description={item.description}
          ticks={item.ticks}
          lines={item.lines}
          origin={chartOrigin}
          caption={item.caption}
          yMinFraction={Y_MIN_FRACTION}
        />
      {/each}
    </section>
  </div>
</main>

<style>
  main {
    display: flex;
    flex: 1;
    flex-direction: column;
    font-family: Georgia, serif;
    margin: 0 auto;
    max-width: 1400px;
    min-height: 0;
    overflow: hidden;
    padding: 0 1rem 1rem;
    width: 100%;
  }
  .bar {
    border-bottom: 1px solid #d6d3d1;
    flex-shrink: 0;
    padding: 1rem 0 0.85rem;
  }
  .title-row {
    align-items: baseline;
    display: flex;
    gap: 1.25rem;
    margin: 0 0 0.5rem;
  }
  h1 {
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0;
  }
  h2,
  h3 {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }
  h3 {
    font-size: 1rem;
    margin-top: 1.25rem;
  }
  .source-link {
    color: inherit;
  }
  .status,
  .error,
  p,
  li {
    line-height: 1.45;
  }
  .error {
    color: #9f1239;
  }
  .workspace {
    display: grid;
    flex: 1;
    gap: 1.5rem;
    grid-template-columns: minmax(17rem, 26rem) minmax(0, 1fr);
    min-height: 0;
    padding-top: 1rem;
  }
  .editor,
  .results {
    min-height: 0;
    overflow: auto;
  }
  fieldset {
    border: 1px solid #d6d3d1;
    border-radius: 0.5rem;
    display: grid;
    gap: 0.4rem;
    margin: 1rem 0 0;
    padding: 0.75rem 0.9rem 0.85rem;
  }
  legend {
    font-weight: 600;
    padding: 0 0.25rem;
  }
  label {
    align-items: flex-start;
    display: flex;
    gap: 0.5rem;
  }
  .note {
    color: #44403c;
    font-size: 0.95rem;
  }
  .score {
    font-size: 1.05rem;
    margin: 0 0 1rem;
  }
  @media (max-width: 800px) {
    .workspace {
      grid-template-columns: 1fr;
      overflow: auto;
    }
    main {
      overflow: auto;
    }
  }
</style>
