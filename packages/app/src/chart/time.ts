const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** First day of the month `tick` months after `origin`'s month. */
export function monthStart(origin: Date, tick: number): Date {
  return new Date(origin.getFullYear(), origin.getMonth() + tick, 1);
}

/** Unix seconds for each tick, one calendar month apart. Tick 0 is the first of `origin`'s month. */
export function monthAxisSeconds(ticks: readonly number[], origin: Date): number[] {
  return ticks.map((tick) => monthStart(origin, tick).getTime() / 1000);
}

/** English month and year of the first tick, for the chart caption. */
export function monthAxisLabel(ticks: readonly number[], origin: Date): string {
  const first = ticks[0];
  if (first === undefined) {
    throw new Error('Chart has no ticks');
  }
  const start = monthStart(origin, first);
  const name = MONTHS[start.getMonth()];
  if (name === undefined) {
    throw new Error('Month out of range');
  }
  return `${name} ${start.getFullYear()}`;
}
