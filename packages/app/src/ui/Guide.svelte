<script lang="ts">
  import { onMount } from 'svelte';
  import { GUIDE_STEPS, GUIDE_STORAGE_KEY, guideOpenFromStorage } from '../session/guide.js';

  function readShouldOpen(): boolean {
    try {
      return guideOpenFromStorage(localStorage.getItem(GUIDE_STORAGE_KEY));
    } catch {
      return true;
    }
  }

  function writeClosed(): void {
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, 'closed');
    } catch {
      // Storage may be unavailable; keep the in-memory choice.
    }
  }

  let dialog: HTMLDialogElement | undefined = $state();

  onMount(() => {
    if (readShouldOpen()) {
      dialog?.showModal();
    }
  });

  function openGuide(): void {
    dialog?.showModal();
  }

  function onClose(): void {
    writeClosed();
  }
</script>

<section class="guide">
  <button type="button" class="toggle" onclick={openGuide}>
    How to use
  </button>
  <dialog bind:this={dialog} id="how-to-use" aria-labelledby="how-to-use-title" onclose={onClose}>
    <div class="panel">
      <h2 id="how-to-use-title">How to use</h2>
      <ol>
        {#each GUIDE_STEPS as step, index (index)}
          <li>{step}</li>
        {/each}
      </ol>
      <form method="dialog">
        <button type="submit">Close</button>
      </form>
    </div>
  </dialog>
</section>

<style>
  .guide {
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
    max-width: 32rem;
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
    margin: 0 0 0.65rem;
  }
  ol {
    margin: 0;
    padding: 0 0 0 1.25rem;
    color: #44403c;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  li + li {
    margin-top: 0.4rem;
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
