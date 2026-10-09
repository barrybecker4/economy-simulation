# ADR 0010: Fiat money injection channel

## Status

Accepted. Channel mechanics updated by [ADR 0021](0021-rate-cap-and-real-channels.md) and
[ADR 0024](0024-asset-purchase-reserves-once.md).

## Context

Pro-rata deposit injections reverse the inflation tax and remove Cantillon effects,
so hypotheses about who first holds new money cannot be tested fairly.

## Decision

- `centralBank.injectionChannel` selects `proRataDeposits` (default, prior path),
  `governmentSpending`, `newLoans`, or `assetPurchase`.
- `newLoans` books firm loans within credit room and does not create reserves.
- `assetPurchase` buys existing bank-held bonds, pays households, and adds reserves equal to
  the purchase; the retired bond seats on vault cash and private equity (see ADR 0024).
- `governmentSpending` credits the treasury, adds reserves, and buys firm inventory;
  unspent credit stays in the treasury.
- A contraction withdraws from the sector that channel credits, and only up to the
  balances that exist.

## Consequences

Regime comparisons can vary the entry point of new fiat without changing the
aggregate growth target. Neutral settings reproduce Phases 35–39.
