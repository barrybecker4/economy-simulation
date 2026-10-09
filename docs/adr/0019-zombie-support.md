# ADR 0019: Zombie support is a replacement cap

## Status

Accepted

## Context

Fiat crisis stimulus grows broad money after a lag. Insolvent firms are still replaced after six months of negative
equity. Without a link between the two, a regime comparison cannot test whether propping up failed firms lengthens a
fiat recovery relative to a bitcoin contraction that clears those firms.

## Decision

- `centralBank.zombieSupport` (default 0) is the share of each month's crisis-stimulus injection that may spare
  negative-equity firms from replacement.
- The budget is a cap on skipped replacements. It is not a cash transfer to firms and does not move deposits or
  reserves beyond the ordinary injection path.
- A firm is spared only when the remaining budget covers its equity shortfall. The failure clock is not reset. Bitcoin
  and hybrid ignore the slider.

## Consequences

`docs/PLAN.md`, `docs/model.md`, and `docs/assumptions.md` follow this ADR. Support 0 matches Phase 66. Hypothesis H10
records whether a bitcoin contraction troughs deeper, recovers sooner, and ends with higher real GDP when fiat support
is on.
