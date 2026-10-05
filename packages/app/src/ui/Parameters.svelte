<script lang="ts">
  import type { Slider } from '../../../core/src/config/registry.js';
  import NameTip from '../tip/NameTip.svelte';
  import { sliderStep } from '../session/sliders.js';

  let {
    parameters,
    value,
    onSlider,
  }: {
    parameters: readonly Slider[];
    value: (slider: Slider) => number | string;
    onSlider: (slider: Slider, raw: string) => void;
  } = $props();

  function rawValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }
</script>

<section class="parameters">
  <h2>Parameters</h2>
  <p class="hint">
    Hover a name to read what that parameter changes. The note also shows its unit, default, and whether the value
    is sourced, calibrated, or a guess.
  </p>
  {#each parameters as slider (slider.id)}
    <label>
      <NameTip {slider} wide />
      {#if slider.kind === 'number'}
        <input
          type="range"
          min={slider.min}
          max={slider.max}
          step={sliderStep(slider)}
          value={Number(value(slider))}
          aria-labelledby="label-{slider.id}"
          aria-describedby="help-{slider.id}"
          oninput={(event) => onSlider(slider, rawValue(event))}
        />
        <output>{value(slider)}</output>
      {:else}
        <select
          value={String(value(slider))}
          aria-labelledby="label-{slider.id}"
          aria-describedby="help-{slider.id}"
          onchange={(event) => onSlider(slider, rawValue(event))}
        >
          {#each slider.options as option (option)}
            <option value={option}>{option}</option>
          {/each}
        </select>
      {/if}
    </label>
  {/each}
</section>

<style>
  .parameters label {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
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
</style>
