# ADR 0007: Bank identity and fiat broad-money growth

## Status

Accepted

## Context

Cash home purchases destroyed deposits while the stock journal re-derived both sides from the same totals, so the ledger
audit stayed green. Opening reserves were only a fraction of deposits, so bank books did not close. Fiat broad money did
not grow with the inflation target, so a higher target meant an imposed price path on a fixed stock.

## Decision

- Every tick enforces `loans + reserves + bonds + vault = deposits + bank equity`, with vault equal to bank equity plus
  the private-equity residual.
- Opening reserves fill `deposits − loans − bonds`.
- `centralBank.moneyGrowth` defaults to 1. Under fiat, deposits and reserves change together by that weight times
  `(inflation target + productivity growth + inflation gap) / 12` times deposits. Bitcoin and hybrid ignore the slider.
  Setting the slider to 0 freezes the fiat stock for regression tests.

There is still no multi-period forecast or durable-goods timing model. Expected inflation remains the trailing rate
blended with `expectations.anchorWeight`.

## Consequences

`docs/PLAN.md`, `docs/model.md`, and `docs/assumptions.md` follow this ADR. Regime comparisons that need a fixed fiat
stock must set `centralBank.moneyGrowth` to 0.
