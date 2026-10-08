# ADR 0010: Fiat money injection channel

## Status

Accepted

## Context

Pro-rata deposit injections reverse the inflation tax and remove Cantillon effects,
so hypotheses about who first holds new money cannot be tested fairly.

## Decision

- `centralBank.injectionChannel` selects `proRataDeposits` (default, prior path),
  `governmentSpending`, `newLoans`, or `assetPurchase`.
- All channels grow deposits and reserves by the same monthly amount from the money
  growth rule; only the first holders differ.
- Contractions still drain household deposits pro rata.

## Consequences

Regime comparisons can vary the entry point of new fiat without changing the
aggregate growth target. Neutral settings reproduce Phases 35–39.
