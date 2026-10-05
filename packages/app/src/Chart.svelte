<script lang="ts">
  import { onMount } from 'svelte';
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';
  import { monthAxisLabel, monthAxisSeconds } from './chart-time';

  interface Props {
    title: string;
    description: string;
    ticks: number[];
    lines: { label: string; values: number[]; color: string }[];
  }

  let { title, description, ticks, lines }: Props = $props();
  let host: HTMLDivElement | undefined = $state();
  let plot: uPlot | undefined;
  const opened = new Date();
  const axisNote = $derived(`Months run from ${monthAxisLabel(ticks, opened)}.`);

  function draw(): void {
    if (!host || ticks.length === 0) {
      return;
    }
    plot?.destroy();
    plot = new uPlot(
      {
        title,
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
    return () => plot?.destroy();
  });

  $effect(() => {
    ticks;
    lines;
    draw();
  });
</script>

<figure>
  <div bind:this={host}></div>
  <figcaption>{description} {axisNote}</figcaption>
</figure>

<style>
  figure {
    background: #fff;
    margin: 0 0 1rem;
    padding: 0.5rem;
  }
  figcaption {
    color: #333;
    font-size: 0.9rem;
  }
</style>
