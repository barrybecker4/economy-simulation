<script lang="ts">
  import NameTip from '../tip/NameTip.svelte';
  import type { RunKind } from '../worker/protocol.js';

  let {
    seed = $bindable(),
    ticks = $bindable(),
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
    busy: boolean;
    pinned: boolean;
    canPin: boolean;
    canPromote: boolean;
    onRun: (kind: RunKind) => void;
    onPin: () => void;
    onClear: () => void;
    onPromote: () => void;
  } = $props();
</script>

<section class="controls">
  <label>Seed <input type="number" min="0" bind:value={seed} /></label>
  <label>Months <input type="number" min="12" max="1200" bind:value={ticks} /></label>
  <NameTip id="run" intro="Runs one simulation with the current seed, month count, regime, and sliders.">
    <button type="button" aria-describedby="help-run" onclick={() => onRun('run')} disabled={busy}>Run</button>
  </NameTip>
  <NameTip
    id="band"
    intro="Same settings as Run, with five seeds: the chosen seed and the next four. Charts draw the median. The CPI chart also shows the 5th and 95th percentiles. Disabled while a baseline is pinned."
  >
    <button
      type="button"
      aria-describedby="help-band"
      onclick={() => onRun('band')}
      disabled={busy || pinned}
    >
      Five-seed band
    </button>
  </NameTip>
  {#if pinned}
    <NameTip
      id="clear-baseline"
      intro="Drops the pinned baseline so charts follow the live run alone. Five-seed band becomes available again."
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
      intro="Freezes the current single run as a baseline. Later runs overlay on the same charts. Edit parameters for the variant only. Scale, scoring, population growth, and trust in banks stay at the baseline."
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
