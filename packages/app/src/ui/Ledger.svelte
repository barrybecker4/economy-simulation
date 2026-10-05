<script lang="ts">
  import type { Slider } from '../../../core/src/config/registry.js';

  let {
    sliders,
    note,
    value,
  }: {
    sliders: readonly Slider[];
    note: string;
    value: (slider: Slider) => number | string;
  } = $props();
</script>

<section class="ledger">
  <h2>Assumption ledger</h2>
  {#if sliders.length === 0}
    <p>Every slider is at its default.</p>
  {:else}
    <ul>
      {#each sliders as slider (slider.id)}
        <li>
          {slider.label}: {value(slider)}
          {#if slider.status === 'guess'}
            <strong>guess</strong>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
  <p>{note}</p>
</section>
