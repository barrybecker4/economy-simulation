<script lang="ts">
  import type { Lesson, LessonControlOption, LessonLeverContext } from '../session/lessons.js';

  let {
    lesson,
    choiceId,
    guessId,
    busy = false,
    deficitAssumptions = null,
    onChoice,
    onGuess,
    onDeficitAssumption,
  }: {
    lesson: Lesson;
    choiceId: string | null;
    guessId: string | null;
    busy?: boolean;
    deficitAssumptions?: LessonLeverContext | null;
    onChoice: (id: string) => void;
    onGuess: (id: string) => void;
    onDeficitAssumption?: (kind: 'demand' | 'prices', on: boolean) => void;
  } = $props();

  const leverLocked = $derived(guessId === null || busy);
  const onBaseline = $derived(
    choiceId === null || choiceId === lesson.control.baselineId,
  );
  const scenarioOptions = $derived(
    lesson.control.options.filter((option) => option.id !== lesson.control.baselineId),
  );
  const selected = $derived(
    lesson.control.options.find((option) => option.id === choiceId) ?? null,
  );
  const demandChoice = $derived(deficitAssumptions?.addsDemand === true ? 'on' : 'off');
  const priceChoice = $derived(deficitAssumptions?.pricesFollowDemand === true ? 'on' : 'off');
  const leverPrompt = $derived(lesson.control.leverPrompt ?? 'Try a change');

  function selectChoice(event: Event): void {
    onChoice((event.target as HTMLSelectElement).value);
  }

  function selectGuess(event: Event): void {
    onGuess((event.target as HTMLInputElement).value);
  }

  function optionPlain(option: LessonControlOption): string {
    return option.plain ?? option.label;
  }

  function selectDemand(event: Event): void {
    onDeficitAssumption?.('demand', (event.target as HTMLInputElement).value === 'on');
  }

  function selectPrices(event: Event): void {
    onDeficitAssumption?.('prices', (event.target as HTMLInputElement).value === 'on');
  }
</script>

<section class="lesson" aria-label="Classroom lesson">
  <h2>Lab</h2>
  <p class="question">{lesson.question}</p>

  <ol class="steps">
    {#if lesson.control.kind === 'none'}
      <li>The baseline already ran. Charts are on the right.</li>
      <li>Pick a guess below.</li>
      <li>Read the snapshot to see if you were right.</li>
    {:else if lesson.id === 'deficit'}
      <li>
        The balanced budget already ran (solid lines). Dashed lines appear when you try deficit
        spending.
      </li>
      <li>Pick a guess, then try deficit spending.</li>
      <li>
        Use the two switches to change assumptions. Each switch re-runs the comparison.
      </li>
    {:else}
      <li>The baseline already ran (solid lines). Read the charts first.</li>
      <li>Pick a guess below.</li>
      <li>Try a change. Dashed lines are your scenario; the snapshot scores your guess.</li>
    {/if}
  </ol>

  <div class="cannot">
    <h3>This lab cannot show</h3>
    <ul>
      {#each lesson.cannotShow as line (line)}
        <li>{line}</li>
      {/each}
    </ul>
  </div>

  {#if lesson.id === 'deficit' && deficitAssumptions !== null}
    <fieldset class="assumption">
      <legend>Extra spending adds demand</legend>
      <label>
        <input
          type="radio"
          name="deficit-demand"
          value="off"
          checked={demandChoice === 'off'}
          disabled={busy}
          onchange={selectDemand}
        />
        Off. The purchase share is taken from households.
      </label>
      <label>
        <input
          type="radio"
          name="deficit-demand"
          value="on"
          checked={demandChoice === 'on'}
          disabled={busy}
          onchange={selectDemand}
        />
        On. Spending above the tax is spent as well.
      </label>
    </fieldset>

    <fieldset class="assumption">
      <legend>Prices follow goods demand</legend>
      <label>
        <input
          type="radio"
          name="deficit-prices"
          value="off"
          checked={priceChoice === 'off'}
          disabled={busy}
          onchange={selectPrices}
        />
        Off. Posted prices follow the 2 percent target.
      </label>
      <label>
        <input
          type="radio"
          name="deficit-prices"
          value="on"
          checked={priceChoice === 'on'}
          disabled={busy}
          onchange={selectPrices}
        />
        On. Posted prices follow how much buyers want relative to capacity.
      </label>
    </fieldset>
  {/if}

  <fieldset class="guess">
    <legend>{lesson.prediction.prompt}</legend>
    {#each lesson.prediction.choices as choice (choice.id)}
      <label>
        <input
          type="radio"
          name={`guess-${lesson.id}`}
          value={choice.id}
          checked={guessId === choice.id}
          disabled={busy}
          onchange={selectGuess}
        />
        {choice.label}
      </label>
    {/each}
  </fieldset>

  {#if lesson.control.kind !== 'none'}
    <div class="lever">
      {#if guessId === null}
        <p class="plain">Pick a guess first. Then you can try a change.</p>
      {:else if scenarioOptions.length === 1 && scenarioOptions[0]}
        {@const only = scenarioOptions[0]}
        {#if onBaseline}
          <button type="button" disabled={leverLocked} onclick={() => onChoice(only.id)}>
            Try: {only.label}
          </button>
          <p class="plain">{optionPlain(only)}</p>
        {:else}
          <p class="status">Showing: {selected?.label ?? only.label}</p>
          {#if selected}
            <p class="plain">{optionPlain(selected)}</p>
          {/if}
          <button
            type="button"
            class="secondary"
            disabled={busy}
            onclick={() => onChoice(lesson.control.baselineId)}
          >
            Back to baseline
          </button>
        {/if}
      {:else}
        <label>
          {leverPrompt}
          <select value={onBaseline ? '' : (choiceId ?? '')} disabled={leverLocked} onchange={selectChoice}>
            <option value="" disabled>Choose…</option>
            {#each scenarioOptions as option (option.id)}
              <option value={option.id}>{option.label}</option>
            {/each}
          </select>
        </label>
        {#if !onBaseline && selected}
          <p class="plain">{optionPlain(selected)}</p>
          <button
            type="button"
            class="secondary"
            disabled={busy}
            onclick={() => onChoice(lesson.control.baselineId)}
          >
            Back to baseline
          </button>
        {:else}
          <p class="plain">The charts already show the baseline. Pick a different setting to compare.</p>
        {/if}
      {/if}
    </div>
  {/if}
</section>

<style>
  .lesson {
    border: 1px solid #d6d3d1;
    border-radius: 0.5rem;
    margin: 0 0 1rem;
    padding: 0.9rem 1rem 1rem;
  }
  h2 {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 0.4rem;
  }
  h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 0.35rem;
  }
  .question {
    font-size: 1.05rem;
    line-height: 1.45;
    margin: 0 0 0.75rem;
  }
  .steps {
    color: #44403c;
    font-size: 0.92rem;
    line-height: 1.45;
    margin: 0 0 0.85rem;
    padding: 0 0 0 1.2rem;
  }
  .steps li + li {
    margin-top: 0.25rem;
  }
  .cannot {
    background: #f5f5f4;
    border-radius: 0.35rem;
    color: #44403c;
    font-size: 0.9rem;
    line-height: 1.45;
    margin: 0 0 0.85rem;
    padding: 0.55rem 0.7rem;
  }
  .cannot ul {
    margin: 0;
    padding: 0 0 0 1.1rem;
  }
  .cannot li + li {
    margin-top: 0.25rem;
  }
  .assumption {
    border: 1px solid #d6d3d1;
    border-radius: 0.5rem;
    display: grid;
    gap: 0.4rem;
    margin: 0 0 0.85rem;
    padding: 0.75rem 0.9rem 0.85rem;
  }
  .assumption legend {
    font-weight: 600;
    padding: 0 0.25rem;
  }
  .assumption label {
    align-items: flex-start;
    display: flex;
    gap: 0.5rem;
    line-height: 1.4;
  }
  .guess {
    border: 0;
    margin: 0 0 0.85rem;
    padding: 0;
  }
  .guess legend {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 0 0 0.4rem;
    padding: 0;
  }
  .guess label {
    display: flex;
    gap: 0.45rem;
    line-height: 1.4;
    margin: 0 0 0.35rem;
  }
  .lever {
    display: grid;
    gap: 0.45rem;
    font-size: 0.95rem;
  }
  .lever label {
    display: grid;
    gap: 0.35rem;
  }
  .lever select {
    font: inherit;
    max-width: 100%;
    padding: 0.35rem 0.45rem;
  }
  .lever select:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
  .lever button {
    font: inherit;
    justify-self: start;
    padding: 0.45rem 0.8rem;
    background: #1c1917;
    border: 1px solid #1c1917;
    color: #f7f4ef;
  }
  .lever button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .lever button.secondary {
    background: transparent;
    border-color: #a8a29e;
    color: inherit;
  }
  .status {
    font-weight: 600;
    margin: 0;
  }
  .plain {
    color: #44403c;
    font-size: 0.92rem;
    line-height: 1.4;
    margin: 0;
  }
</style>
