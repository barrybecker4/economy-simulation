/**
 * Share of each household's goods budget that can clear against the current
 * stock. When desired spend exceeds inventory value, everyone is scaled by the
 * same factor so scarce output is shared rather than claimed first-come.
 */
export function rationScale(desiredSpend: number, stockValue: number): number {
  if (!(desiredSpend > 0) || !(stockValue > 0) || desiredSpend <= stockValue) {
    return 1;
  }
  return stockValue / desiredSpend;
}
