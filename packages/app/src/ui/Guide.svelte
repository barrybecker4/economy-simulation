<script lang="ts">
  import { GUIDE_STEPS, GUIDE_STORAGE_KEY, guideOpenFromStorage } from '../session/guide.js';

  function readStored(): boolean {
    try {
      return guideOpenFromStorage(localStorage.getItem(GUIDE_STORAGE_KEY));
    } catch {
      return true;
    }
  }

  function writeStored(open: boolean): void {
    try {
      localStorage.setItem(GUIDE_STORAGE_KEY, open ? 'open' : 'closed');
    } catch {
      // Storage may be unavailable; keep the in-memory choice.
    }
  }

  let open = $state(readStored());

  function toggle(): void {
    open = !open;
    writeStored(open);
  }
</script>

<section class="guide">
  <button
    type="button"
    class="toggle"
    aria-expanded={open}
    aria-controls="how-to-use"
    onclick={toggle}
  >
    <span class="marker" aria-hidden="true">{open ? '▾' : '▸'}</span>
    How to use
  </button>
  {#if open}
    <ol id="how-to-use">
      {#each GUIDE_STEPS as step, index (index)}
        <li>{step}</li>
      {/each}
    </ol>
  {/if}
</section>

<style>
  .guide {
    margin: 0.5rem 0 0;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
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
  .marker {
    display: inline-block;
    width: 0.9rem;
    color: #78716c;
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 0.85rem;
  }
  ol {
    margin: 0.55rem 0 0;
    padding: 0 0 0 1.25rem;
    color: #44403c;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  li + li {
    margin-top: 0.4rem;
  }
</style>
