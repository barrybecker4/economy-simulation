<script lang="ts">
  import NameTip from '../tip/NameTip.svelte';
  import { categoryTipItems, PRESET_CATEGORIES } from '../session/presets.js';
  import { getSlider } from '../../../core/src/config/registry.js';
  import type { RunKind } from '../worker/protocol.js';

  let {
    seed = $bindable(),
    ticks = $bindable(),
    regime = $bindable(),
    categories,
    busy,
    onRegime,
    onCategory,
    onRun,
  }: {
    seed: number;
    ticks: number;
    regime: string;
    categories: Readonly<Record<string, string | null>>;
    busy: boolean;
    onRegime: (value: string) => void;
    onCategory: (categoryId: string, optionId: string) => void;
    onRun: (kind: RunKind) => void;
  } = $props();

  const regimeSlider = getSlider('regime.type');

  function chooseRegime(event: Event): void {
    onRegime((event.target as HTMLSelectElement).value);
  }

  function chooseCategory(categoryId: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === '') {
      return;
    }
    onCategory(categoryId, value);
  }
</script>

<section class="controls">
  <label>Seed <input type="number" min="0" bind:value={seed} /></label>
  <label>Months <input type="number" min="12" max="1200" bind:value={ticks} /></label>
  {#if regimeSlider.kind === 'enum'}
    <label>
      <NameTip
        id="regime"
        label="Regime"
        kicker="Monetary regime"
        intro="Fiat, bitcoin, or hybrid. Central-bank presets apply only under fiat."
      />
      <select
        aria-labelledby="label-regime"
        aria-describedby="help-regime"
        value={regime}
        onchange={chooseRegime}
      >
        {#each regimeSlider.options as option (option)}
          <option value={option}>{option}</option>
        {/each}
      </select>
    </label>
  {/if}
  {#each PRESET_CATEGORIES as category (category.id)}
    <label>
      <NameTip
        id={`category-${category.id}`}
        label={category.name}
        kicker={category.name}
        intro={category.detail}
        items={categoryTipItems(category)}
      />
      <select
        aria-labelledby={`label-category-${category.id}`}
        aria-describedby={`help-category-${category.id}`}
        value={categories[category.id] ?? ''}
        disabled={category.fiatOnly === true && regime !== 'fiat'}
        onchange={(event) => chooseCategory(category.id, event)}
      >
        {#if categories[category.id] === null || categories[category.id] === undefined}
          <option value="">Custom</option>
        {/if}
        {#each category.options as option (option.id)}
          <option value={option.id}>{option.name}</option>
        {/each}
      </select>
    </label>
  {/each}
  <NameTip id="run" intro="Runs one simulation with the current seed, month count, regime, and sliders.">
    <button type="button" aria-describedby="help-run" onclick={() => onRun('run')} disabled={busy}>Run</button>
  </NameTip>
  <NameTip
    id="band"
    intro="Same settings as Run, with five seeds: the chosen seed and the next four. Charts draw the median. The CPI chart also shows the 5th and 95th percentiles."
  >
    <button type="button" aria-describedby="help-band" onclick={() => onRun('band')} disabled={busy}>
      Five-seed band
    </button>
  </NameTip>
  <NameTip
    id="compare"
    intro="Same seed and sliders as Run, twice: once as fiat and once as bitcoin. The first chart compares those two CPIs, fiat in cents and bitcoin in satoshis. The charts under it are the fiat run only."
  >
    <button type="button" aria-describedby="help-compare" onclick={() => onRun('compare')} disabled={busy}>
      Compare fiat and bitcoin
    </button>
  </NameTip>
</section>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }
  .controls label {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }
  button {
    font: inherit;
    padding: 0.4rem 0.8rem;
  }
</style>
