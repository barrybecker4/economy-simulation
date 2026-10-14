<script lang="ts">
  import type { Lesson, LessonControlOption } from '../session/lessons.js';

  let {
    lesson,
    choiceId,
    guessId,
    onChoice,
    onGuess,
  }: {
    lesson: Lesson;
    choiceId: string | null;
    guessId: string | null;
    onChoice: (id: string) => void;
    onGuess: (id: string) => void;
  } = $props();

  function selectChoice(event: Event): void {
    onChoice((event.target as HTMLSelectElement).value);
  }

  function selectGuess(event: Event): void {
    onGuess((event.target as HTMLInputElement).value);
  }

  function optionPlain(option: LessonControlOption): string {
    return option.plain ?? option.label;
  }
</script>

<section class="lesson" aria-label="Classroom lesson">
  <h2>Lab</h2>
  <p class="question">{lesson.question}</p>

  <div class="cannot">
    <h3>This lab cannot show</h3>
    <ul>
      {#each lesson.cannotShow as line (line)}
        <li>{line}</li>
      {/each}
    </ul>
  </div>

  {#if lesson.control.kind !== 'none'}
    <label class="lever">
      Your lever
      <select value={choiceId ?? ''} onchange={selectChoice}>
        {#each lesson.control.options as option (option.id)}
          <option value={option.id}>{option.label}</option>
        {/each}
      </select>
    </label>
    {#if choiceId !== null}
      {@const selected = lesson.control.options.find((option) => option.id === choiceId)}
      {#if selected}
        <p class="plain">{optionPlain(selected)}</p>
      {/if}
    {/if}
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
          onchange={selectGuess}
        />
        {choice.label}
      </label>
    {/each}
  </fieldset>
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
  .lever {
    display: grid;
    gap: 0.35rem;
    font-size: 0.95rem;
    margin: 0 0 0.35rem;
  }
  .lever select {
    font: inherit;
    max-width: 100%;
    padding: 0.35rem 0.45rem;
  }
  .plain {
    color: #44403c;
    font-size: 0.92rem;
    line-height: 1.4;
    margin: 0 0 0.85rem;
  }
  .guess {
    border: 0;
    margin: 0;
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
</style>
