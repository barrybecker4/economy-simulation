<script lang="ts">
  import type { SnapshotCard } from '../session/snapshot.js';

  let { card, feedback = null }: { card: SnapshotCard; feedback?: string | null } = $props();

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
    <p class="feedback">{feedback}</p>
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
