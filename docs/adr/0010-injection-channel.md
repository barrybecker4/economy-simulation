# ADR 0010: Fiat money injection channel

## Status

Accepted

## Context

Pro-rata deposit injections reverse the inflation tax and remove Cantillon effects,
so hypotheses about who first holds new money cannot be tested fairly.

## Decision

- `centralBank.injectionChannel` selects `proRataDeposits` (default, prior path),
  `governmentSpending`, `newLoans`, or `assetPurchase`.
- `newLoans` books firm loans and firm deposits. It does not create reserves. The
  loan is repaid before that cash is paid out as wages.
- `assetPurchase` credits firm deposits and a bond claim. The loan stock is unchanged.
- `governmentSpending` credits the treasury, adds reserves, and buys goods from
  firms in the same tick.
- A contraction withdraws from the sector that channel credits, and only up to the
  balances that exist.

## Consequences

Regime comparisons can vary the entry point of new fiat without changing the
aggregate growth target. A new-loan injection is inside money that is repaid,
not a gift that is paid out as wages. Neutral settings reproduce Phases 35–39.
