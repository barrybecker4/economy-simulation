<script lang="ts">
  import { listSliders, type Slider } from '../../core/src/config/registry.js';
  import Chart from './Chart.svelte';
  import NameTip from './NameTip.svelte';
  import type { RunRequest, RunResponse } from './worker.ts';

  const sliders = listSliders();
  const regimeSlider = sliders.find((slider) => slider.id === 'regime.type');
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
  let status = $state('Set the sliders and run.');
  let result = $state<RunResponse | null>(null);
  let busy = $state(false);

  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<RunResponse>) => {
    chartRegime = requestedRegime;
    result = event.data;
    busy = false;
    status =
      event.data.kind === 'band'
        ? 'Band ready.'
        : event.data.kind === 'compare'
          ? 'Comparison ready.'
          : 'Run ready.';
    writeUrl();
  };
  worker.onerror = () => {
    busy = false;
    status = 'The run failed.';
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
      {#if regimeSlider}
        <NameTip slider={regimeSlider} label="Regime" described={false} />
      {/if}
      <select bind:value={regime} aria-describedby="help-regime.type">
        <option value="fiat">Fiat</option>
        <option value="bitcoin">Bitcoin</option>
        <option value="hybrid">Hybrid</option>
      </select>
    </label>
    <label>
      Preset
      <select onchange={(event) => applyPreset((event.target as HTMLSelectElement).value)}>
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

  <section class="sliders">
    <h2>Sliders</h2>
    <p class="hint">Hover a name to read what that slider changes. The note also shows its unit, default, and whether the value is sourced, calibrated, or a guess.</p>
    {#each sliders as slider (slider.id)}
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
  .sliders label {
    position: relative;
  }
  .controls,
  .sliders label {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }
  .sliders label {
    border-bottom: 1px solid #ddd;
    padding: 0.4rem 0;
  }
  .hint {
    color: #57534e;
    font-size: 0.95rem;
    line-height: 1.45;
    margin: 0 0 0.4rem;
  }
  .sliders input[type='range'] {
    flex: 1 1 12rem;
  }
  button {
    font: inherit;
    padding: 0.4rem 0.8rem;
  }
</style>
