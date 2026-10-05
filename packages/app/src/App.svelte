<script lang="ts">
  import { listSliders, type Slider } from '../../core/src/config/registry.js';
  import Chart from './Chart.svelte';
  import NameTip from './NameTip.svelte';
  import type { RunRequest, RunResponse } from './worker.ts';

  const sliders = listSliders();
  const parameters = [
    ...sliders.filter((slider) => slider.kind === 'enum'),
    ...sliders.filter((slider) => slider.kind === 'number'),
  ];
  const weights = [
    'welfare.weightInequality',
    'welfare.weightMedianWealth',
    'welfare.weightWellbeing',
    'welfare.weightStability',
  ];

  let seed = $state(1);
  let ticks = $state(120);
  let regime = $state('fiat');
  let chartRegime = $state('fiat');
  let requestedRegime = 'fiat';
  let overrides = $state<Record<string, number | string>>({});
  let status = $state('Set the parameters and run.');
  let result = $state<Extract<RunResponse, { kind: 'run' | 'band' | 'compare' }> | null>(null);
  let busy = $state(false);

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<RunResponse>) => {
    busy = false;
    if (event.data.kind === 'error') {
      result = null;
      status = `The run failed: ${event.data.message}`;
      console.error('[sim]', event.data.message);
      return;
    }
    chartRegime = requestedRegime;
    result = event.data;
    status =
      event.data.kind === 'band'
        ? 'Band ready.'
        : event.data.kind === 'compare'
          ? 'Comparison ready.'
          : 'Run ready.';
    writeUrl();
  };
  worker.onerror = (event) => {
    busy = false;
    result = null;
    const detail = event.message?.trim() || 'worker error';
    status = `The run failed: ${detail}`;
    console.error('[sim]', detail, event);
  };
  worker.onmessageerror = () => {
    busy = false;
    result = null;
    status = 'The run failed: could not read the worker reply.';
    console.error('[sim] worker message could not be deserialized');
  };

  function valueOf(slider: Slider): number | string {
    if (slider.id === 'regime.type') {
      return regime;
    }
    return overrides[slider.id] ?? slider.default;
  }

  function resolved(): Record<string, number | string> {
    const slidersOut: Record<string, number | string> = {};
    for (const slider of sliders) {
      slidersOut[slider.id] = valueOf(slider);
    }
    slidersOut['regime.type'] = regime;
    return slidersOut;
  }

  function moneyUnit(kind: string): string {
    return kind === 'fiat' ? 'cents' : 'satoshis';
  }

  function run(kind: 'run' | 'band' | 'compare'): void {
    requestedRegime = regime;
    busy = true;
    status =
      kind === 'band' ? 'Running five seeds…' : kind === 'compare' ? 'Comparing regimes…' : 'Running…';
    const request: RunRequest = {
      kind,
      seed,
      ticks,
      sliders: resolved(),
      seeds: [seed, seed + 1, seed + 2, seed + 3, seed + 4],
    };
    worker.postMessage(request);
  }

  function onSlider(slider: Slider, raw: string): void {
    if (slider.kind === 'enum') {
      if (slider.id === 'regime.type') {
        regime = raw;
      } else {
        overrides[slider.id] = raw;
      }
      return;
    }
    overrides[slider.id] = Number(raw);
  }

  const presetNotes = [
    {
      name: 'Neutral',
      detail:
        'Fiat, and every parameter at its default. The automatable share still rises from 10 percent to 90 percent. Government spending and the income tax are both 20 percent of the income base, so the treasury starts near balance. The bank capital ratio is 8 percent, and deflation sensitivity is 1.',
    },
    {
      name: 'No AI',
      detail:
        'Fiat. The initial and final automatable shares are both 30 percent, instead of 10 percent rising to 90 percent. Equal shares freeze the adoption curve: firms do not take up AI in production, and hiring and ownership stay on the path with no AI productivity effect. The midpoint year and the steepness do nothing while the shares are equal. Autonomous agents are unchanged, so their count still rises from zero to half the number of households over five years.',
    },
    {
      name: 'Fast adoption',
      detail:
        'Fiat. The adoption midpoint moves from year 15 to year 5, and steepness rises from 0.4 to 1.2 per year, so the climb from a 10 percent automatable share to 90 percent happens earlier and in a tighter window. The physical-task share falls from 30 percent to 10 percent. Extra capacity is the gain in the automatable share times one minus that share, so more of the same gain becomes output. Agents, spending, and the regime stay at their defaults.',
    },
    {
      name: 'Austrian-leaning',
      detail:
        'Switches the regime to bitcoin. Bitcoin does not grow the money stock with the economy, so the price trend is minus baseline productivity growth, and new loans cannot exceed unused savings. The bank capital ratio rises from 8 percent to 16 percent, which leaves less room to lend from the same equity. Government spending falls from 20 percent to 10 percent of the income base, while the income tax stays at 20 percent, so the treasury takes in more than it spends. Deflation sensitivity rises from 1 to 2. Under bitcoin, prices tend to fall, and that higher sensitivity cuts credit and housing demand more strongly until the penalty reaches its cap of 0.9. Wage rigidity, time preference, and trust in banks stay at their defaults.',
    },
    {
      name: 'Keynesian-leaning',
      detail:
        'Stays on fiat. Government spending rises from 20 percent to 35 percent of the income base. Household spending starts from what remains, so that share starts at 65 percent instead of 80 percent. The income tax stays at 20 percent, and the treasury issues bonds for the shortfall. The inflation weight rises from 1.5 to 2.5, and the output weight rises from 0.5 to 1.2. Those weights apply only under fiat: the policy rate reacts harder when inflation misses its target and when unemployment is away from 6 percent. The bank capital ratio stays at 8 percent.',
    },
  ];

  function applyPreset(name: string): void {
    overrides = {};
    regime = 'fiat';
    if (name === 'no-ai') {
      overrides = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3 };
    } else if (name === 'fast-adoption') {
      overrides = { 'ai.adoptionMidpointYear': 5, 'ai.adoptionSteepness': 1.2, 'ai.physicalTaskShare': 0.1 };
    } else if (name === 'austrian-leaning') {
      regime = 'bitcoin';
      overrides = { 'bank.capitalRatio': 0.16, 'government.spendingShareOfGDP': 0.1, 'deflation.sensitivity': 2 };
    } else if (name === 'keynesian-leaning') {
      overrides = {
        'government.spendingShareOfGDP': 0.35,
        'centralBank.inflationWeight': 2.5,
        'centralBank.outputWeight': 1.2,
      };
    }
  }

  const changed = $derived(
    sliders.filter((slider) => String(valueOf(slider)) !== String(slider.default)),
  );

  const compositeOn = $derived(
    weights.some((id) => {
      const slider = sliders.find((item) => item.id === id);
      return slider !== undefined && Number(valueOf(slider)) !== 0;
    }),
  );

  const composite = $derived.by(() => {
    if (!result || result.kind !== 'run' || !compositeOn) {
      return null;
    }
    const lastOf = (id: string) => {
      const series = result?.series[id];
      return series?.[series.length - 1] ?? 0;
    };
    const inequality = Number(valueOf(sliders.find((item) => item.id === weights[0])!));
    const wealth = Number(valueOf(sliders.find((item) => item.id === weights[1])!));
    const wellbeing = Number(valueOf(sliders.find((item) => item.id === weights[2])!));
    const stability = Number(valueOf(sliders.find((item) => item.id === weights[3])!));
    return (
      inequality * (1 - lastOf('giniWealth')) +
      wealth * lastOf('medianRealWealth') +
      wellbeing * lastOf('meanWellbeing') +
      stability * (1 - lastOf('unemployment'))
    );
  });

  function writeUrl(): void {
    const params = new URLSearchParams();
    params.set('seed', String(seed));
    params.set('ticks', String(ticks));
    params.set('regime', regime);
    for (const [id, value] of Object.entries(overrides)) {
      params.set(id, String(value));
    }
    history.replaceState(null, '', `?${params.toString()}`);
  }

  function readUrl(): void {
    const params = new URLSearchParams(location.search);
    const seedText = params.get('seed');
    const ticksText = params.get('ticks');
    const urlSeed = seedText === null ? Number.NaN : Number(seedText);
    const urlTicks = ticksText === null ? Number.NaN : Number(ticksText);
    if (Number.isInteger(urlSeed) && urlSeed >= 0) {
      seed = urlSeed;
    }
    if (Number.isInteger(urlTicks) && urlTicks > 0) {
      ticks = urlTicks;
    }
    const urlRegime = params.get('regime');
    if (urlRegime === 'fiat' || urlRegime === 'bitcoin' || urlRegime === 'hybrid') {
      regime = urlRegime;
    }
    const next: Record<string, number | string> = {};
    for (const slider of sliders) {
      const raw = params.get(slider.id);
      if (raw === null || slider.id === 'regime.type') {
        continue;
      }
      next[slider.id] = slider.kind === 'number' ? Number(raw) : raw;
    }
    overrides = next;
  }

  readUrl();

  function line(id: string, label: string, color: string): { label: string; values: number[]; color: string } | null {
    if (!result) {
      return null;
    }
    if (result.kind === 'band' && result.bands?.[id]) {
      return { label, values: result.bands[id].mid, color };
    }
    const values = result.series[id];
    return values ? { label, values, color } : null;
  }
</script>

<main>
  <header>
    <h1>Economy simulation</h1>
    <p>{status}</p>
  </header>

  <section class="controls">
    <label>Seed <input type="number" min="0" bind:value={seed} /></label>
    <label>Months <input type="number" min="12" max="1200" bind:value={ticks} /></label>
    <label>
      <NameTip
        id="preset"
        label="Preset"
        kicker="Preset"
        intro="Choosing a preset clears every parameter change and leaves Seed and Months as they are. It then sets only the values below. Anything not named returns to its default."
        items={presetNotes}
      />
      <select
        aria-labelledby="label-preset"
        aria-describedby="help-preset"
        onchange={(event) => applyPreset((event.target as HTMLSelectElement).value)}
      >
        <option value="neutral">Neutral</option>
        <option value="no-ai">No AI</option>
        <option value="fast-adoption">Fast adoption</option>
        <option value="austrian-leaning">Austrian-leaning</option>
        <option value="keynesian-leaning">Keynesian-leaning</option>
      </select>
    </label>
    <button type="button" onclick={() => run('run')} disabled={busy}>Run</button>
    <button type="button" onclick={() => run('band')} disabled={busy}>Five-seed band</button>
    <button type="button" onclick={() => run('compare')} disabled={busy}>Compare fiat and bitcoin</button>
  </section>

  <section class="ledger">
    <h2>Assumption ledger</h2>
    {#if changed.length === 0}
      <p>Every slider is at its default.</p>
    {:else}
      <ul>
        {#each changed as slider (slider.id)}
          <li>
            {slider.label}: {valueOf(slider)}
            {#if slider.status === 'guess'}
              <strong>guess</strong>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    <p>
      {#if composite === null}
        Composite index is off. Move a welfare weight to turn it on. Those weights are assumptions.
      {:else}
        Composite index: {composite.toFixed(3)}. The weights are assumptions.
      {/if}
    </p>
  </section>

  {#if result}
    {@const wellbeing = line('meanWellbeing', 'Mean well-being', '#0b6')}
    {@const median = line('medianWellbeing', 'Median well-being', '#064')}
    {@const cpi = line('priceLevel', 'CPI', '#1e3a8a')}
    {@const food = line('priceFood', 'Food and bev', '#9a3412')}
    {@const housing = line('priceHousing', 'Housing', '#a16207')}
    {@const energy = line('priceEnergy', 'Energy', '#c2410c')}
    {@const apparel = line('priceApparel', 'Apparel', '#7e22ce')}
    {@const transport = line('priceTransportation', 'Transportation', '#0f766e')}
    {@const medical = line('priceMedical', 'Medical', '#be123c')}
    {@const education = line('priceEducation', 'Education', '#0369a1')}
    {@const recreation = line('priceRecreation', 'Recreation', '#4d7c0f')}
    {@const electronics = line('priceElectronics', 'Electronics', '#db2777')}
    {@const unemployment = line('unemployment', 'Unemployment', '#b45309')}
    {@const interest = line('interestRate', 'Policy rate', '#1d4ed8')}
    {@const credit = line('creditToGdp', 'Credit to GDP', '#7c3aed')}
    {@const tasks = line('tasksAutomated', 'Tasks automated', '#0f766e')}
    {@const agents = line('aiShareOfAgents', 'AI agents', '#a21caf')}
    {@const aiOutput = line('aiShareOfOutput', 'AI share of output', '#c2410c')}
    {#if wellbeing && median}
      <Chart
        title="Well-being"
        unit="log points"
        description="Mean and median human well-being. The level is the natural log of real consumption, floored at 0.01, plus a housing-security term. AI agents are not included. A five-seed band draws the median."
        ticks={result.ticks}
        lines={[wellbeing, median]}
      />
    {/if}
    {#if cpi && food && housing && energy && apparel && transport && medical && education && recreation && electronics}
      <Chart
        title="Prices"
        unit={result.kind === 'compare' ? 'cents' : moneyUnit(chartRegime)}
        description="CPI is the expenditure-weighted basket. Food and beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics can move apart from it. A five-seed band draws each median."
        ticks={result.ticks}
        lines={[cpi, food, housing, energy, apparel, transport, medical, education, recreation, electronics]}
      />
    {/if}
    {#if unemployment && interest}
      <Chart
        title="Labor and interest"
        unit="share"
        description="Unemployment is the share of households without a job. The policy rate is the annual interest rate: under fiat it follows inflation and unemployment, and under bitcoin or hybrid it moves with the gap between loans and savings. A five-seed band draws each median."
        ticks={result.ticks}
        lines={[unemployment, interest]}
      />
    {/if}
    {#if credit}
      <Chart
        title="Credit to GDP"
        unit="share"
        description="Private credit relative to annualized nominal GDP: firm and household loans divided by twelve times this month's nominal output. Government bonds are not in this ratio. A five-seed band draws the median."
        ticks={result.ticks}
        lines={[credit]}
      />
    {/if}
    {#if tasks && agents && aiOutput}
      <Chart
        title="AI"
        unit="share"
        description="Tasks automated is the share of tasks software can do. AI agents is autonomous agents divided by households plus agents. AI share of output is the fraction of capacity from the AI multiplier. With equal start and end automatable shares that share stays at zero. A five-seed band draws each median."
        ticks={result.ticks}
        lines={[tasks, agents, aiOutput]}
      />
    {/if}
    {#if result.kind === 'compare' && result.series['priceLevel'] && result.series['priceLevelBitcoin']}
      <Chart
        title="Same seed, two regimes"
        description="CPI for this seed under fiat, in cents, and under bitcoin, in satoshis. Every other slider stays as set."
        ticks={result.ticks}
        lines={[
          { label: 'Fiat CPI (cents)', values: result.series['priceLevel'], color: '#246' },
          {
            label: 'Bitcoin CPI (satoshis)',
            values: result.series['priceLevelBitcoin'],
            color: '#a60',
          },
        ]}
      />
    {/if}
    {#if result.kind === 'band' && result.bands?.priceLevel}
      <Chart
        title="CPI band"
        unit={moneyUnit(chartRegime)}
        description="Median CPI across five seeds, with the 5th and 95th percentiles."
        ticks={result.ticks}
        lines={[
          { label: '5th', values: result.bands.priceLevel.low, color: '#99b' },
          { label: 'Median', values: result.bands.priceLevel.mid, color: '#246' },
          { label: '95th', values: result.bands.priceLevel.high, color: '#99b' },
        ]}
      />
    {/if}
  {/if}

  <section class="parameters">
    <h2>Parameters</h2>
    <p class="hint">Hover a name to read what that parameter changes. The note also shows its unit, default, and whether the value is sourced, calibrated, or a guess.</p>
    {#each parameters as slider (slider.id)}
      <label>
        <NameTip {slider} wide />
        {#if slider.kind === 'number'}
          <input
            type="range"
            min={slider.min}
            max={slider.max}
            step={(slider.max - slider.min) / 100}
            value={Number(valueOf(slider))}
            aria-labelledby="label-{slider.id}"
            aria-describedby="help-{slider.id}"
            oninput={(event) => onSlider(slider, (event.target as HTMLInputElement).value)}
          />
          <output>{valueOf(slider)}</output>
        {:else}
          <select
            value={String(valueOf(slider))}
            aria-labelledby="label-{slider.id}"
            aria-describedby="help-{slider.id}"
            onchange={(event) => onSlider(slider, (event.target as HTMLSelectElement).value)}
          >
            {#each slider.options as option (option)}
              <option value={option}>{option}</option>
            {/each}
          </select>
        {/if}
      </label>
    {/each}
  </section>
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
  .controls label,
  .parameters label {
    position: relative;
  }
  .controls,
  .parameters label {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }
  .parameters label {
    border-bottom: 1px solid #ddd;
    padding: 0.4rem 0;
  }
  .hint {
    color: #57534e;
    font-size: 0.95rem;
    line-height: 1.45;
    margin: 0 0 0.4rem;
  }
  .parameters input[type='range'] {
    flex: 1 1 12rem;
  }
  button {
    font: inherit;
    padding: 0.4rem 0.8rem;
  }
</style>
