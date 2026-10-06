<script lang="ts">
  import NameTip from '../tip/NameTip.svelte';
  import { MAX_SEEDS, MIN_SEEDS } from '../session/run.js';

  let {
    seed = $bindable(),
    ticks = $bindable(),
    seeds = $bindable(),
    busy,
    pinned,
    canPin,
    canPromote,
    onRun,
    onPin,
    onClear,
    onPromote,
  }: {
    seed: number;
    ticks: number;
    seeds: number;
    busy: boolean;
    pinned: boolean;
    canPin: boolean;
    canPromote: boolean;
    onRun: () => void;
    onPin: () => void;
    onClear: () => void;
    onPromote: () => void;
  } = $props();
</script>

<section class="controls">
  <label>Seed <input type="number" min="0" bind:value={seed} /></label>
  <label>Months <input type="number" min="12" max="1200" bind:value={ticks} /></label>
  <NameTip
    id="num-seeds"
    intro="How many consecutive seeds to run, starting at Seed. Charts show the median across those runs, which depends less on one random draw. With more than one seed and no baseline pinned, CPI also shows the 5th and 95th percentiles."
  >
    <label>
      Num seeds
      <input
        type="number"
        min={MIN_SEEDS}
        max={MAX_SEEDS}
        bind:value={seeds}
        disabled={busy}
        aria-describedby="help-num-seeds"
      />
    </label>
  </NameTip>
  <NameTip
    id="run"
    intro="Runs the simulation with the current seed, month count, seed count, regime, and sliders. One seed draws that path. More than one seed runs Seed through Seed plus the count minus one; charts show the median, and CPI also shows the 5th and 95th percentiles when no baseline is pinned."
  >
    <button type="button" aria-describedby="help-run" onclick={() => onRun()} disabled={busy}>
      Run
    </button>
  </NameTip>
  {#if pinned}
    <NameTip
      id="clear-baseline"
      intro="Drops the pinned baseline so charts follow the live run alone."
    >
      <button type="button" aria-describedby="help-clear-baseline" onclick={onClear} disabled={busy}>
        Clear baseline
      </button>
    </NameTip>
    {#if canPromote}
      <NameTip
        id="promote-baseline"
        intro="Replaces the pinned baseline with the current variant result and its settings."
      >
        <button
          type="button"
          aria-describedby="help-promote-baseline"
          onclick={onPromote}
          disabled={busy}
        >
          Use variant as baseline
        </button>
      </NameTip>
    {/if}
  {:else}
    <NameTip
      id="pin-baseline"
      intro="Freezes the current run as a baseline, including a multi-seed median. Later runs overlay on the same charts. Edit parameters for the variant only. Scale, scoring, population growth, and trust in banks stay at the baseline."
    >
      <button
        type="button"
        aria-describedby="help-pin-baseline"
        onclick={onPin}
        disabled={busy || !canPin}
      >
        Pin as baseline
      </button>
    </NameTip>
  {/if}
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
