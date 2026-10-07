<script lang="ts" module>
  let usingKeyboard = false;
  let listening = false;

  function listenForPointerModality(): void {
    if (listening) {
      return;
    }
    listening = true;
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        usingKeyboard = true;
      }
    });
    window.addEventListener('pointerdown', () => {
      usingKeyboard = false;
    });
  }

  function pointerIsKeyboard(): boolean {
    return usingKeyboard;
  }
</script>

<script lang="ts">
  import { onMount, tick, type Snippet } from 'svelte';
  import type { Slider } from '../../../core/src/config/registry.js';
  import { groupLabel, presentStored, sliderBounds, statusLabel } from './labels.js';
  import { nameTipFrame, placeNameTip, type NameTipFrame, type Viewport } from './place.js';

  let {
    slider,
    label,
    described = true,
    wide = false,
    id,
    kicker,
    intro,
    items,
    children,
  }: {
    slider?: Slider;
    label?: string;
    described?: boolean;
    wide?: boolean;
    id?: string;
    kicker?: string;
    intro?: string;
    items?: readonly { name: string; detail: string }[];
    children?: Snippet;
  } = $props();

  const caption = $derived(label ?? slider?.label ?? '');
  const tipId = $derived(slider?.id ?? id ?? 'note');

  const SHOW_MS = 500;
  const HIDE_MS = 200;

  let nameEl: HTMLSpanElement | undefined = $state();
  let tipEl: HTMLDivElement | undefined = $state();
  let hovering = $state(false);
  let focused = $state(false);
  let placed = $state(false);
  let top = $state(0);
  let left = $state(0);
  let arrow = $state(18);
  let placement = $state<'below' | 'above' | 'side'>('below');
  let maxHeight = $state(384);

  const open = $derived(hovering || focused);

  let showTimer: ReturnType<typeof setTimeout> | undefined;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let layoutGen = 0;

  function scheduleShow(): void {
    clearTimeout(hideTimer);
    if (hovering || focused) {
      return;
    }
    clearTimeout(showTimer);
    showTimer = setTimeout(() => {
      hovering = true;
    }, SHOW_MS);
  }

  function scheduleHide(): void {
    clearTimeout(showTimer);
    if (focused) {
      return;
    }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      hovering = false;
    }, HIDE_MS);
  }

  function onFocusIn(): void {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (!pointerIsKeyboard() && !coarse) {
      return;
    }
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    focused = true;
  }

  function onFocusOut(): void {
    focused = false;
  }

  function currentViewport(): Viewport {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  async function layout(): Promise<void> {
    const gen = ++layoutGen;
    await tick();
    if (gen !== layoutGen || !open || nameEl === undefined || tipEl === undefined) {
      return;
    }
    const row = anchorRow();
    const anchor = row.getBoundingClientRect();
    const name = nameEl.getBoundingClientRect();
    const viewport = currentViewport();
    const frame = nameTipFrame(anchor, viewport, nameEl.classList.contains('host'));
    applyFrame(tipEl, frame);
    const position = placeNameTip(frame, anchor, name, tipEl.getBoundingClientRect(), viewport);
    placement = frame.placement;
    top = position.top;
    left = position.left;
    arrow = position.arrow;
    maxHeight = frame.maxHeight;
    placed = true;
  }

  function applyFrame(tip: HTMLDivElement, frame: NameTipFrame): void {
    tip.style.setProperty('--max', `${frame.maxHeight}px`);
    if (frame.width === null) {
      tip.style.removeProperty('width');
      return;
    }
    tip.style.width = `${frame.width}px`;
  }

  function anchorRow(): HTMLElement {
    if (nameEl === undefined) {
      throw new Error('Name tip is missing its anchor');
    }
    const row = nameEl.closest('label');
    if (row instanceof HTMLElement) {
      return row;
    }
    return nameEl;
  }

  function bindHover(row: HTMLElement, tip: HTMLElement): () => void {
    const hideUnlessInside = (event: MouseEvent): void => {
      if (!staysInside(event, row, tip)) {
        scheduleHide();
      }
    };
    row.addEventListener('mouseenter', scheduleShow);
    row.addEventListener('mouseleave', hideUnlessInside);
    tip.addEventListener('mouseenter', scheduleShow);
    tip.addEventListener('mouseleave', hideUnlessInside);
    row.addEventListener('focusin', onFocusIn);
    row.addEventListener('focusout', onFocusOut);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      row.removeEventListener('mouseenter', scheduleShow);
      row.removeEventListener('mouseleave', hideUnlessInside);
      tip.removeEventListener('mouseenter', scheduleShow);
      tip.removeEventListener('mouseleave', hideUnlessInside);
      row.removeEventListener('focusin', onFocusIn);
      row.removeEventListener('focusout', onFocusOut);
    };
  }

  function staysInside(event: MouseEvent, row: HTMLElement, tip: HTMLElement): boolean {
    const next = event.relatedTarget;
    return next instanceof Node && (row.contains(next) || tip.contains(next));
  }

  $effect(() => {
    if (!open) {
      placed = false;
      return;
    }
    void layout();
    const onMove = (): void => {
      void layout();
    };
    const onScroll = (event: Event): void => {
      if (event.target instanceof Node && tipEl?.contains(event.target)) {
        return;
      }
      onMove();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onMove);
    };
  });

  onMount(() => {
    listenForPointerModality();
    if (tipEl === undefined) {
      throw new Error('Name tip is missing its anchor');
    }
    return bindHover(anchorRow(), tipEl);
  });
</script>

<span
  class:name={!children}
  class:host={!!children}
  class:wide
  id={described && !children ? `label-${tipId}` : undefined}
  bind:this={nameEl}
>
  {#if children}
    {@render children()}
  {:else}
    {caption}
  {/if}
</span>
<div
  bind:this={tipEl}
  class="tip"
  class:open
  class:placed
  class:above={placement === 'above'}
  class:side={placement === 'side'}
  id={described ? `help-${tipId}` : undefined}
  role={described ? 'tooltip' : undefined}
  aria-hidden={described ? undefined : 'true'}
  style:top="{top}px"
  style:left="{left}px"
  style:--arrow="{arrow}px"
  style:--max="{maxHeight}px"
>
  <div class="body">
    {#if slider}
      <p class="kicker">{groupLabel(slider.group)}</p>
      <p class="copy">{slider.description}</p>
      <ul class="meta">
        <li><span>Unit</span> {slider.unit}</li>
        <li><span>Default</span> {presentStored(slider, slider.default)}</li>
        <li><span>{slider.kind === 'number' ? 'Range' : 'Options'}</span> {sliderBounds(slider)}</li>
      </ul>
      <p class="source">
        <span class="badge {slider.status}">{statusLabel(slider.status)}</span>
        {slider.source}
      </p>
    {:else}
      {#if kicker}
        <p class="kicker">{kicker}</p>
      {/if}
      {#if intro}
        <p class="copy">{intro}</p>
      {/if}
      {#if items}
        <dl class="choices">
          {#each items as item (item.name)}
            <div>
              <dt>{item.name}</dt>
              <dd>{item.detail}</dd>
            </div>
          {/each}
        </dl>
      {/if}
    {/if}
  </div>
</div>

<style>
  .name {
    cursor: help;
    text-decoration: underline dotted #78716c;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.22em;
  }
  .name:hover,
  .name:focus-visible {
    text-decoration-color: #1c1917;
  }
  .name.wide {
    flex: 0 0 16rem;
  }
  .host {
    display: inline-flex;
    position: relative;
  }
  .tip:not(.open) {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
    pointer-events: none;
  }
  .tip.open {
    position: fixed;
    z-index: 40;
    box-sizing: border-box;
    width: min(28rem, calc(100vw - 1.25rem));
    margin: 0;
    padding: 0;
    overflow: visible;
    border: 1px solid #e6d9c8;
    border-radius: 12px;
    background: #fffdf8;
    color: #1c1917;
    box-shadow:
      0 18px 40px rgba(68, 48, 28, 0.16),
      0 2px 6px rgba(68, 48, 28, 0.06);
    opacity: 0;
    pointer-events: none;
  }
  .tip.open.placed {
    opacity: 1;
    pointer-events: auto;
    animation: tip-in 90ms ease-out;
  }
  .tip.open.above.placed {
    animation-name: tip-in-above;
  }
  .tip.open.side.placed {
    animation-name: tip-in-side;
  }
  .tip.open.placed::after {
    content: '';
    position: absolute;
  }
  .tip.open.placed:not(.above):not(.side)::after {
    left: 0;
    right: 0;
    top: -16px;
    height: 16px;
  }
  .tip.open.above.placed::after {
    left: 0;
    right: 0;
    bottom: -16px;
    height: 16px;
  }
  .tip.open.side.placed::after {
    top: 0;
    bottom: 0;
    left: -16px;
    width: 16px;
  }
  .tip.open::before {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    background: #fffdf8;
    transform: rotate(45deg);
  }
  .tip.open:not(.above):not(.side)::before {
    top: -7px;
    left: var(--arrow);
    border-top: 1px solid #e6d9c8;
    border-left: 1px solid #e6d9c8;
  }
  .tip.open.above::before {
    bottom: -7px;
    left: var(--arrow);
    border-right: 1px solid #e6d9c8;
    border-bottom: 1px solid #e6d9c8;
  }
  .tip.open.side::before {
    top: var(--arrow);
    left: -7px;
    border-bottom: 1px solid #e6d9c8;
    border-left: 1px solid #e6d9c8;
  }
  .body {
    max-height: var(--max, 24rem);
    overflow: auto;
    overscroll-behavior: contain;
    padding: 0.85rem 1rem 0.95rem;
    border-radius: 12px;
  }
  .kicker {
    margin: 0 0 0.35rem;
    color: #78716c;
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .copy {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem 1rem;
    margin: 0.8rem 0 0.75rem;
    padding: 0.7rem 0 0;
    border-top: 1px solid #f0e6d8;
    list-style: none;
    font-size: 0.88rem;
  }
  .meta span {
    display: block;
    margin-bottom: 0.12rem;
    color: #78716c;
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .source {
    margin: 0;
    color: #44403c;
    font-size: 0.84rem;
    line-height: 1.45;
  }
  .choices {
    margin: 0.75rem 0 0;
    padding: 0.7rem 0 0;
    border-top: 1px solid #f0e6d8;
  }
  .choices div + div {
    margin-top: 0.75rem;
  }
  .choices dt {
    font-size: 0.92rem;
    font-weight: 700;
  }
  .choices dd {
    margin: 0.15rem 0 0;
    font-size: 0.92rem;
    line-height: 1.45;
  }
  .badge {
    display: inline-block;
    margin-right: 0.4rem;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    line-height: 1.4;
    text-transform: uppercase;
    vertical-align: 0.08em;
  }
  .badge.sourced {
    background: #dcfce7;
    color: #166534;
  }
  .badge.calibrated {
    background: #e0e7ff;
    color: #3730a3;
  }
  .badge.guess {
    background: #ffedd5;
    color: #9a3412;
  }
  @media (prefers-reduced-motion: reduce) {
    .tip.open.placed,
    .tip.open.above.placed,
    .tip.open.side.placed {
      animation: none;
    }
  }
  @keyframes tip-in {
    from {
      transform: translateY(6px);
    }
    to {
      transform: translateY(0);
    }
  }
  @keyframes tip-in-above {
    from {
      transform: translateY(-6px);
    }
    to {
      transform: translateY(0);
    }
  }
  @keyframes tip-in-side {
    from {
      transform: translateX(-6px);
    }
    to {
      transform: translateX(0);
    }
  }
</style>
