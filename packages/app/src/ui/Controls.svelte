<script lang="ts">
  import NameTip from '../tip/NameTip.svelte';
  import { PRESETS } from '../session/presets.js';
  import type { RunKind } from '../worker/protocol.js';

  let {
    seed = $bindable(),
    ticks = $bindable(),
    preset,
    busy,
    onPreset,
    onRun,
  }: {
    seed: number;
    ticks: number;
    preset: string | null;
    busy: boolean;
    onPreset: (id: string) => void;
    onRun: (kind: RunKind) => void;
  } = $props();

  function choosePreset(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === '') {
      return;
    }
    onPreset(value);
  }
</script>

<section class="controls">
  <label>Seed <input type="number" min="0" bind:value={seed} /></label>
  <label>Months <input type="number" min="12" max="1200" bind:value={ticks} /></label>
  <label>
    <NameTip
      id="preset"
      label="Preset"
      kicker="Preset"
      intro="Choosing a preset clears every parameter change and leaves Seed and Months as they are. It then sets only the values below. Anything not named returns to its default."
      items={PRESETS}
    />
    <select aria-labelledby="label-preset" aria-describedby="help-preset" value={preset ?? ''} onchange={choosePreset}>
      {#if preset === null}
        <option value="">Custom</option>
      {/if}
      {#each PRESETS as item (item.id)}
        <option value={item.id}>{item.name}</option>
      {/each}
    </select>
  </label>
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
