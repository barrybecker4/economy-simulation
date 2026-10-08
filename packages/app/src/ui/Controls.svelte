<script lang="ts">
  import NameTip from '../tip/NameTip.svelte';
  import { MAX_SEEDS, MIN_SEEDS } from '../session/run.js';

  let {
    seed = $bindable(),
    ticks = $bindable(),
    seeds = $bindable(),
    busy,
    runPrimary,
    pinned,
    canPin,
    canPromote,
    onRun,
    onPin,
    onClear,
    onPromote,
    onReset,
  }: {
    seed: number;
    ticks: number;
    seeds: number;
    busy: boolean;
    runPrimary: boolean;
    pinned: boolean;
    canPin: boolean;
    canPromote: boolean;
    onRun: () => void;
    onPin: () => void;
    onClear: () => void;
    onPromote: () => void;
    onReset: () => void;
  } = $props();
</script>

<section class="controls">
  <div class="primary">
    <NameTip id="seed" intro="Which random path the simulation draws. The same seed with the same settings repeats the same path.">
      <label>
        Seed
        <input type="number" min="0" bind:value={seed} aria-describedby="help-seed" />
      </label>
    </NameTip>
    <NameTip
      id="months"
      intro="How many months to simulate, from 12 to 1200. Charts and the month inspector cover that span."
    >
      <label>
        Months
        <input type="number" min="12" max="1200" bind:value={ticks} aria-describedby="help-months" />
      </label>
    </NameTip>
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
      intro="Runs the simulation with the current seed, month count, seed count, regime, and sliders. One seed draws that path. More than one seed runs Seed through Seed plus the count minus one; charts show the median, and CPI also shows the 5th and 95th percentiles when no baseline is pinned. Press Control or Command and Enter to run from anywhere."
    >
      <button
        type="button"
        class:primary={runPrimary}
        aria-describedby="help-run"
        onclick={() => onRun()}
        disabled={busy}
      >
        Run
      </button>
    </NameTip>
  </div>
  <div class="secondary">
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
          intro="Replaces the pinned baseline with the current scenario result and its settings."
        >
          <button
            type="button"
            aria-describedby="help-promote-baseline"
            onclick={onPromote}
            disabled={busy}
          >
            Use scenario as baseline
          </button>
        </NameTip>
      {/if}
    {:else}
      <NameTip
        id="pin-baseline"
        intro="Freezes the current run as a baseline, including a multi-seed median. Later runs overlay on the same charts. Edit parameters for the scenario only. Scale and population growth stay at the baseline."
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
    <NameTip
      id="reset-defaults"
      intro="Restores seed, months, seed count, regime, and every slider to their defaults, drops a pinned baseline, and clears the current charts."
    >
      <button
        type="button"
        aria-describedby="help-reset-defaults"
        onclick={onReset}
        disabled={busy}
      >
        Reset to defaults
      </button>
    </NameTip>
  </div>
</section>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }
  .primary,
  .secondary {
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
  button.primary {
    background: #1c1917;
    border: 1px solid #1c1917;
    color: #f7f4ef;
  }
  button.primary:disabled {
    opacity: 0.55;
  }
  .secondary button {
    background: transparent;
    border: 1px solid #a8a29e;
    color: inherit;
  }
</style>
