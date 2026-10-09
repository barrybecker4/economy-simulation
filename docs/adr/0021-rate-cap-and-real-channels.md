# ADR 0021: Taylor rate cap and real injection channels

## Status

Accepted. Supersedes the same-tick loan clawback and invented bond claim in
[ADR 0010](0010-injection-channel.md).

## Context

Under hoarding the uncapped Taylor rate could print near 100 percent. The named injection channels did not match the
instruments: government spending paid cash without taking inventory, new loans were clawed back before wages, and asset
purchases invented bond claims.

## Decision

- The raw fiat Taylor rate is capped at 20 percent before smoothing.
- `governmentSpending` credits the treasury and buys firm inventory; unspent credit stays in the treasury.
- `newLoans` books firm loans only up to unused bank credit room. Those loans retire on the ordinary interest and
  repayment path. A contraction still repays firm loans up to balances on hand.
- `assetPurchase` buys bonds already on bank books, pays households, and adds reserves equal to twice the purchase
  (one leg replaces the retired bond, one matches the new deposits) so bank books close. With no bonds, it places
  nothing.

## Consequences

Channel comparisons exercise real loans, purchases, and spending. Hoarding cells no longer runaway on the policy rate.
