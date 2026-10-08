# ADR 0014: Dual-currency transition window

## Status

Accepted

## Context

ADR 0005 rebases a closed economy from fiat rules to bitcoin on the last month of
`transition.lengthMonths`. A positive `transition.gradualWeight` only spread that
haircut and the deposit reassignment across the window. No bitcoin balance
existed during the window, so lengths 12 and 1 were a delayed reshuffle, and a
debt haircut wrote loans down without a balance anyone could hold or spend.

## Decision

- `transition.gradualWeight` 0 keeps the one-step rebase in ADR 0005.
- When the weight is positive, each month converts `weight / months remaining`
  of every deposit, and the same fraction of firm loans, mortgages, and consumer
  loans, into bitcoin units at the current bitcoin price. The haircut writes off
  that share of the slice being converted. The rest becomes bitcoin debt of equal
  ledger value.
- Goods can be paid from either balance. Bitcoin spent at the current price is a
  deposit of that value for the seller.
- On the last month the bitcoin units fold back into the single balance and the
  active regime becomes bitcoin. A later bitcoin price move revalues any units
  still outstanding onto bank equity so the books stay closed.
- There is still one goods price and no second country.

## Consequences

`docs/model.md` and `docs/limits.md` follow this ADR. ADR 0005 still governs the
one-step path. The fiat fiscal stabilizer stays fiat-only.
