<script lang="ts">
  import type { Slider, SliderGroup } from '../../../core/src/config/registry.js';
  import { comparisonFrame } from '../session/compare.js';
  import NameTip from '../tip/NameTip.svelte';
  import { GROUP_ORDER, groupLabel } from '../tip/labels.js';
  import {
    categoryForGroup,
    categoryTipItems,
    SCENARIO_WORLDS,
    worldTipItems,
    type PresetCategory,
  } from '../session/presets.js';
  import { sliderStep } from '../session/sliders.js';
  import { controlRange, storePresented } from '../tip/labels.js';

  let {
    parameters,
    regime,
    world,
    categories,
    pinned,
    value,
    onWorld,
    onRegime,
    onCategory,
    onSlider,
  }: {
    parameters: readonly Slider[];
    regime: string;
    world: string | null;
    categories: Readonly<Record<string, string | null>>;
    pinned: boolean;
    value: (slider: Slider) => number | string;
    onWorld: (worldId: string) => void;
    onRegime: (value: string) => void;
    onCategory: (categoryId: string, optionId: string) => void;
    onSlider: (slider: Slider, raw: string) => void;
  } = $props();

  const groups = $derived(groupedParameters(parameters));
  let openGroups = $state<Record<string, boolean>>({});

  const FRAME_HINT = 'Held at the baseline for this comparison.';

  function rawValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  function groupNote(group: SliderGroup): string | null {
    if (pinned && group === 'scale') {
      return FRAME_HINT;
    }
    if (group === 'centralBank') {
      return 'Bitcoin and hybrid ignore these sliders.';
    }
    return null;
  }

  function rowFrozen(slider: Slider): boolean {
    return pinned && comparisonFrame(slider.id);
  }

  function rowHint(slider: Slider): string | null {
    if (!rowFrozen(slider)) {
      return null;
    }
    if (slider.group === 'scale') {
      return null;
    }
    return FRAME_HINT;
  }

  function chooseWorld(event: Event): void {
    const next = (event.target as HTMLSelectElement).value;
    if (next === '') {
      return;
    }
    onWorld(next);
  }

  function chooseCategory(categoryId: string, event: Event): void {
    const next = (event.target as HTMLSelectElement).value;
    if (next === '') {
      return;
    }
    onCategory(categoryId, next);
  }

  function chooseRegime(event: Event): void {
    onRegime((event.target as HTMLSelectElement).value);
  }

  function isOpen(group: SliderGroup): boolean {
    return openGroups[group] === true;
  }

  function toggleGroup(group: SliderGroup): void {
    openGroups = { ...openGroups, [group]: !isOpen(group) };
  }

  function groupedParameters(
    list: readonly Slider[],
  ): { group: SliderGroup; sliders: Slider[]; category: PresetCategory | undefined }[] {
    const byGroup = new Map<SliderGroup, Slider[]>();
    for (const slider of list) {
      const bucket = byGroup.get(slider.group);
      if (bucket === undefined) {
        byGroup.set(slider.group, [slider]);
      } else {
        bucket.push(slider);
      }
    }
    return GROUP_ORDER.flatMap((group) => {
      const sliders = byGroup.get(group);
      if (sliders === undefined || sliders.length === 0) {
        return [];
      }
      return [{ group, sliders, category: categoryForGroup(group) }];
    });
  }
</script>

<section class="parameters">
  <h2>Parameters</h2>
  <div class="world">
    <label class="preset">
      <NameTip
        id="scenario-world"
        label="Scenario"
        kicker="Scenario world"
        intro="One named composition of the regime and every category preset. Changing a group afterward returns this control to Custom."
        items={worldTipItems()}
      />
      <select
        aria-labelledby="label-scenario-world"
        aria-describedby="help-scenario-world"
        value={world ?? ''}
        onchange={chooseWorld}
      >
        {#if world === null}
          <option value="">Custom</option>
        {/if}
        {#each SCENARIO_WORLDS as option (option.id)}
          <option value={option.id}>{option.name}</option>
        {/each}
      </select>
    </label>
  </div>
  {#each groups as block (block.group)}
    <div class="block">
      <div class="header">
        <button
          type="button"
          class="toggle"
          aria-expanded={isOpen(block.group)}
          aria-controls={`group-${block.group}`}
          onclick={() => toggleGroup(block.group)}
        >
          <span class="marker" aria-hidden="true">{isOpen(block.group) ? '▾' : '▸'}</span>
          <span class="title">{groupLabel(block.group)}</span>
        </button>
        {#if block.group === 'regime'}
          {@const regimeSlider = block.sliders.find((slider) => slider.id === 'regime.type')}
          {#if regimeSlider !== undefined && regimeSlider.kind === 'enum'}
            <label class="preset">
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
        {:else if block.category}
          {@const category = block.category}
          <label class="preset">
            <NameTip
              id={`category-${category.id}`}
              label="Preset"
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
        {/if}
      </div>
      {#if isOpen(block.group)}
        <div class="body" id={`group-${block.group}`}>
          {#if groupNote(block.group)}
            <p class="hint">{groupNote(block.group)}</p>
          {/if}
          {#each block.sliders as slider (slider.id)}
            {#if slider.id !== 'regime.type'}
              {@const frozen = rowFrozen(slider)}
              {@const hint = rowHint(slider)}
              <label class:frozen>
                <NameTip {slider} wide />
                {#if slider.kind === 'number'}
                  {@const range = controlRange(slider)}
                  <input
                    type="range"
                    min={range?.min}
                    max={range?.max}
                    step={sliderStep(slider)}
                    value={Number(value(slider))}
                    disabled={frozen}
                    aria-labelledby="label-{slider.id}"
                    aria-describedby="help-{slider.id}"
                    oninput={(event) => onSlider(slider, storePresented(slider, rawValue(event)))}
                  />
                  <output>{value(slider)}</output>
                {:else}
                  <select
                    value={String(value(slider))}
                    disabled={frozen}
                    aria-labelledby="label-{slider.id}"
                    aria-describedby="help-{slider.id}"
                    onchange={(event) => onSlider(slider, rawValue(event))}
                  >
                    {#each slider.options as option (option)}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                {/if}
                {#if hint}
                  <span class="row-hint">{hint}</span>
                {/if}
              </label>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</section>

<style>
  .block {
    border-bottom: 1px solid #ddd;
    padding: 0.35rem 0;
  }
  .header {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.35rem 0;
  }
  .toggle {
    align-items: center;
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    display: inline-flex;
    font: inherit;
    gap: 0.35rem;
    padding: 0;
    text-align: left;
  }
  .marker {
    display: inline-block;
    width: 1ch;
  }
  .title {
    font-size: 1.05rem;
    font-weight: 600;
    min-width: 10rem;
  }
  .world {
    border-bottom: 1px solid #eee;
    margin: 0 0 0.75rem;
    padding: 0 0 0.75rem;
  }
  .preset {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0;
  }
  .body label {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    border-bottom: 1px solid #eee;
    padding: 0.4rem 0;
  }
  .body label.frozen {
    opacity: 0.55;
  }
  .row-hint {
    color: #57534e;
    flex: 1 1 100%;
    font-size: 0.9rem;
    line-height: 1.4;
    margin: 0;
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
