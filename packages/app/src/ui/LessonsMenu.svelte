<script lang="ts">
  import { LESSONS } from '../session/lessons.js';

  let dialog: HTMLDialogElement | undefined = $state();

  function openMenu(): void {
    dialog?.showModal();
  }

  function titleFor(id: string): string {
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
</script>

<section class="lessons-menu">
  <button type="button" class="toggle" onclick={openMenu}>Lessons</button>
  <dialog bind:this={dialog} id="classroom-lessons" aria-labelledby="classroom-lessons-title">
    <div class="panel">
      <h2 id="classroom-lessons-title">Classroom labs</h2>
      <p class="intro">
        Each lab locks the controls to one question. The research app stays available when you leave a
        lab.
      </p>
      <ul>
        {#each LESSONS as lesson (lesson.id)}
          <li>
            <a href={`?lesson=${lesson.id}`}>
              <span class="name">{titleFor(lesson.id)}</span>
              <span class="question">{lesson.question}</span>
            </a>
          </li>
        {/each}
      </ul>
      <form method="dialog">
        <button type="submit">Close</button>
      </form>
    </div>
  </dialog>
</section>

<style>
  .lessons-menu {
    margin: 0;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-size: 1rem;
  }
  .toggle:hover,
  .toggle:focus-visible {
    text-decoration: underline;
  }
  dialog {
    border: 1px solid #d6d3d1;
    border-radius: 0.5rem;
    max-width: 28rem;
    padding: 0;
    background: #f7f4ef;
    color: inherit;
  }
  dialog::backdrop {
    background: rgb(28 25 23 / 0.4);
  }
  .panel {
    padding: 1.1rem 1.25rem 1.25rem;
  }
  h2 {
    font-size: 1.2rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }
  .intro {
    color: #44403c;
    font-size: 0.95rem;
    line-height: 1.45;
    margin: 0 0 0.75rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li + li {
    border-top: 1px solid #e7e5e4;
  }
  a {
    color: inherit;
    display: grid;
    gap: 0.15rem;
    padding: 0.55rem 0;
    text-decoration: none;
  }
  a:hover .name,
  a:focus-visible .name {
    text-decoration: underline;
  }
  .name {
    font-weight: 600;
  }
  .question {
    color: #44403c;
    font-size: 0.92rem;
    line-height: 1.4;
  }
  form {
    margin: 1rem 0 0;
    display: flex;
    justify-content: flex-end;
  }
  form button {
    font: inherit;
    padding: 0.4rem 0.8rem;
  }
</style>
