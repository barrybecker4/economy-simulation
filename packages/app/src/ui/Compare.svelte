<script lang="ts">
  import type { CompareDiff } from '../session/compare.js';

  let {
    diffs,
    onReset,
  }: {
    diffs: readonly CompareDiff[];
    onReset: (id: string) => void;
  } = $props();
</script>

<section class="compare">
  <h2>Baseline comparison</h2>
  <p class="key">
    Solid lines are the baseline and dashed lines are the scenario. A legend value reads the baseline,
    then the scenario.
  </p>
  {#if diffs.length === 0}
    <p>Baseline and scenario share every slider.</p>
  {:else}
    <ul>
      {#each diffs as diff (diff.id)}
        <li>
          <span class="row">
            <span class="label">{diff.label}</span>
            <span class="values">{diff.baseline} → {diff.variant}</span>
          </span>
          <button type="button" onclick={() => onReset(diff.id)}>Reset</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .compare {
    margin: 1rem 0;
  }
  .compare h2 {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 0.4rem;
  }
  .compare p {
    color: #57534e;
    margin: 0;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: space-between;
    margin: 0 0 0.35rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
  }
  .label {
    font-weight: 600;
  }
  .values {
    font-variant-numeric: tabular-nums;
  }
  button {
    font: inherit;
    padding: 0.2rem 0.55rem;
  }
</style>
