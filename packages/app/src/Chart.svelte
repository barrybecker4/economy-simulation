<script lang="ts" module>
  let chartSeq = 0;
</script>

<script lang="ts">
  import { onMount, tick } from 'svelte';
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';
  import { monthAxisLabel, monthAxisSeconds } from './chart-time';

  interface Props {
    title: string;
    /** Shown in parentheses after the title. Omit when the chart has no single unit. */
    unit?: string;
    description: string;
    ticks: number[];
    lines: { label: string; values: number[]; color: string }[];
  }

  let { title, unit = '', description, ticks, lines }: Props = $props();
  let host: HTMLDivElement | undefined = $state();
  let plot: uPlot | undefined;
  const opened = new Date();
  const axisNote = $derived(`Months run from ${monthAxisLabel(ticks, opened)}.`);
  const heading = $derived(unit ? `${title} (${unit})` : title);
  const titleId = `chart-title-${chartSeq}`;
  const tipId = `chart-tip-${chartSeq}`;
  chartSeq += 1;

  let infoEl: HTMLButtonElement | undefined = $state();
  let tipEl: HTMLDivElement | undefined = $state();
  let hovering = $state(false);
  let focused = $state(false);
  let placed = $state(false);
  let top = $state(0);
  let left = $state(0);
  let arrow = $state(18);
  let placement = $state<'below' | 'above'>('below');
  const shown = $derived(hovering || focused);

  let hideTimer: ReturnType<typeof setTimeout> | undefined;
  let layoutGen = 0;

  function show(): void {
    clearTimeout(hideTimer);
    hovering = true;
  }

  function scheduleHide(): void {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (infoEl && document.activeElement === infoEl) {
        return;
      }
      hovering = false;
    }, 120);
  }

  function onFocus(): void {
    clearTimeout(hideTimer);
    focused = true;
  }

  function onBlur(): void {
    focused = false;
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') {
      return;
    }
    hovering = false;
    focused = false;
    infoEl?.blur();
  }

  async function layout(): Promise<void> {
    const gen = ++layoutGen;
    await tick();
    if (gen !== layoutGen || !shown || !infoEl || !tipEl) {
      return;
    }
    const anchor = infoEl.getBoundingClientRect();
    const margin = 12;
    const gap = 8;
    if (anchor.bottom < margin || anchor.top > window.innerHeight - margin) {
      placed = false;
      return;
    }
    const width = Math.min(448, window.innerWidth - margin * 2);
    tipEl.style.width = `${width}px`;
    const box = tipEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - anchor.bottom - gap - margin;
    const spaceAbove = anchor.top - gap - margin;
    placement = spaceAbove >= box.height || spaceAbove > spaceBelow ? 'above' : 'below';
    const maxLeft = window.innerWidth - margin - box.width;
    const ideal = anchor.left + anchor.width / 2 - box.width / 2;
    left = Math.max(margin, Math.min(ideal, Math.max(margin, maxLeft)));
    const rawTop = placement === 'above' ? anchor.top - gap - box.height : anchor.bottom + gap;
    const maxTop = Math.max(margin, window.innerHeight - margin - box.height);
    top = Math.min(Math.max(margin, rawTop), maxTop);
    arrow = Math.min(box.width - 22, Math.max(16, anchor.left + anchor.width / 2 - left - 6));
    placed = true;
  }

  function draw(): void {
    if (!host || ticks.length === 0) {
      return;
    }
    plot?.destroy();
    plot = new uPlot(
      {
        width: host.clientWidth || 640,
        height: 240,
        scales: { x: { time: true } },
        series: [
          { label: 'Month', value: '{MMM} {YYYY}' },
          ...lines.map((line) => ({ label: line.label, stroke: line.color })),
        ],
        axes: [{}, { size: 48 }],
      },
      [monthAxisSeconds(ticks, opened), ...lines.map((line) => line.values)],
      host,
    );
  }

  onMount(() => {
    draw();
    return () => {
      clearTimeout(hideTimer);
      plot?.destroy();
    };
  });

  $effect(() => {
    ticks;
    lines;
    draw();
  });

  $effect(() => {
    description;
    axisNote;
    if (!shown) {
      placed = false;
      return;
    }
    void layout();
    const onMove = (): void => {
      void layout();
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  });
</script>

<figure aria-labelledby={titleId}>
  <div class="heading">
    <p class="title" id={titleId}>{heading}</p>
    <button
      type="button"
      class="info"
      bind:this={infoEl}
      aria-label="About {heading}"
      aria-describedby={tipId}
      aria-expanded={shown}
      onmouseenter={show}
      onmouseleave={scheduleHide}
      onfocus={onFocus}
      onblur={onBlur}
      onkeydown={onKeydown}
    >
      <span aria-hidden="true">i</span>
    </button>
  </div>
  <div
    bind:this={tipEl}
    class="tip"
    class:open={shown}
    class:placed
    class:above={placement === 'above'}
    id={tipId}
    role="tooltip"
    style:top="{top}px"
    style:left="{left}px"
    style:--arrow="{arrow}px"
    onmouseenter={show}
    onmouseleave={scheduleHide}
  >
    <div class="body">
      <p class="copy">{description}</p>
      <p class="note">{axisNote}</p>
    </div>
  </div>
  <div bind:this={host}></div>
</figure>

<style>
  figure {
    background: #fff;
    margin: 0 0 1rem;
    padding: 0.5rem 0.5rem 0.35rem;
  }
  .heading {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.45rem;
    margin: 0.2rem 0 0.15rem;
  }
  .title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.3;
  }
  .info {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    margin: 0;
    padding: 0;
    border: 1px solid #a8a29e;
    border-radius: 999px;
    background: #fff;
    color: #44403c;
    font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 0.8rem;
    font-style: italic;
    font-weight: 700;
    line-height: 1;
    cursor: help;
  }
  .info:hover,
  .info:focus-visible {
    border-color: #1c1917;
    color: #1c1917;
  }
  .info:focus-visible {
    outline: 2px solid #1c1917;
    outline-offset: 2px;
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
    width: min(28rem, calc(100vw - 1.5rem));
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
  .tip.open::before {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    background: #fffdf8;
    transform: rotate(45deg);
  }
  .tip.open:not(.above)::before {
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
  .body {
    padding: 0.85rem 1rem 0.95rem;
    border-radius: 12px;
  }
  .copy {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  .note {
    margin: 0.65rem 0 0;
    color: #57534e;
    font-size: 0.84rem;
    line-height: 1.45;
  }
  @media (prefers-reduced-motion: reduce) {
    .tip.open.placed,
    .tip.open.above.placed {
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
</style>
