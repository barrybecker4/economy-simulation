/** Twelve-month relative change between the last entry and the entry 12 steps earlier. */
export function yearOverYear(history: readonly number[], fallback: number): number {
  const last = history[history.length - 1] ?? fallback;
  const prev = history[history.length - 13] ?? last;
  if (prev <= 0) {
    return fallback;
  }
  return last / prev - 1;
}
