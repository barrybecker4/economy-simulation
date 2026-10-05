export interface ChartKeyLine {
  label: string;
  color: string;
  values: readonly number[];
  dash?: readonly number[];
  omitLegend?: boolean;
  pair?: string;
}

/** Identity of a drawn chart, including its width so a resize redraws. */
export function chartKey(
  width: number,
  ticks: readonly number[],
  lines: readonly ChartKeyLine[],
): string {
  return JSON.stringify([
    width,
    ticks,
    lines.map((line) => [
      line.label,
      line.color,
      line.dash ?? null,
      line.omitLegend === true,
      line.pair ?? null,
      line.values,
    ]),
  ]);
}
