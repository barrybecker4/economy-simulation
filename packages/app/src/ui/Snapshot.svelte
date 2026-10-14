<script lang="ts">
  import type { PredictionFeedback } from '../session/prediction.js';
  import type { SnapshotCard } from '../session/snapshot.js';

  let {
    card,
    feedback = null,
  }: {
    card: SnapshotCard;
    feedback?: PredictionFeedback | null;
  } = $props();

  function formatValue(value: number): string {
    if (!Number.isFinite(value)) {
      return '—';
    }
    const abs = Math.abs(value);
    if (abs >= 1000) {
      return value.toFixed(0);
    }
    if (abs >= 10) {
      return value.toFixed(2);
    }
    if (abs >= 0.1) {
      return value.toFixed(3);
    }
    return value.toFixed(4);
  }

  function monthLabel(month: number, last: number): string {
    if (month === 0) {
      return 'Start';
    }
    if (month === last) {
      return 'End';
    }
    return `Year ${Math.round(month / 12)}`;
  }
</script>

<section class="snapshot" aria-label="Lesson snapshot">
  <h2>Snapshot</h2>
  {#if feedback}
    <p
      class="feedback"
      class:correct={feedback.matched === true}
      class:incorrect={feedback.matched === false}
      role="status"
    >
      {#if feedback.matched === true}
        <span class="mark" aria-hidden="true">✓</span>
        <span class="visually-hidden">Correct. </span>
      {:else if feedback.matched === false}
        <span class="mark" aria-hidden="true">✗</span>
        <span class="visually-hidden">Incorrect. </span>
      {/if}
      <span>{feedback.message}</span>
    </p>
  {/if}
  {#if card.typicalHousehold}
    <p class="household">{card.typicalHousehold}</p>
  {/if}
  <table>
    <thead>
      <tr>
        <th scope="col">Metric</th>
        {#each card.rows[0]?.points ?? [] as point (point.month)}
          <th scope="col">
            {monthLabel(
              point.month,
              card.rows[0]?.points[card.rows[0].points.length - 1]?.month ?? 0,
            )}
          </th>
        {/each}
        <th scope="col">Change</th>
      </tr>
    </thead>
    <tbody>
      {#each card.rows as row (row.id)}
        <tr>
          <th scope="row">{row.label}</th>
          {#each row.points as point (point.month)}
            <td>{formatValue(point.value)}</td>
          {/each}
          <td>{row.changeWords}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  .snapshot {
    border: 1px solid #d6d3d1;
    border-radius: 0.5rem;
    margin: 0 0 1rem;
    padding: 0.85rem 1rem 1rem;
  }
  h2 {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
  }
  .feedback,
  .household {
    color: #44403c;
    font-size: 0.95rem;
    line-height: 1.45;
    margin: 0 0 0.65rem;
  }
  .feedback {
    align-items: flex-start;
    display: flex;
    gap: 0.45rem;
    font-weight: 600;
  }
  .feedback.correct {
    color: #166534;
  }
  .feedback.incorrect {
    color: #991b1b;
  }
  .mark {
    flex-shrink: 0;
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .visually-hidden {
    clip: rect(0, 0, 0, 0);
    border: 0;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
  table {
    border-collapse: collapse;
    font-size: 0.9rem;
    width: 100%;
  }
  th,
  td {
    border-bottom: 1px solid #e7e5e4;
    padding: 0.35rem 0.4rem;
    text-align: left;
  }
  td {
    font-variant-numeric: tabular-nums;
  }
  tbody th {
    font-weight: 500;
  }
</style>
