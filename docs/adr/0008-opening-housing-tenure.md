# ADR 0008: Opening housing tenure

## Status

Accepted

## Context

With tenure choice on, every household started as a renter and could buy only by paying cash for a home priced at 48
months of income. A mortgage was never the cheapest option, because its payment includes principal while owning
outright is only an opportunity cost. The app's default run therefore opened near 98 percent renting. U.S.
homeownership in 2026 is about 65.5 percent.

## Decision

- When `housing.tenureChoice` is on, households open already housed. `housing.openingOwnerShare` defaults to 0.655.
  `housing.openingMortgageShareOfOwners` defaults to 0.62. The highest-skill households own outright, the next band
  holds mortgages, and the rest rent.
- An opening mortgage is outstanding principal: the loan-to-value share of 48 months of income at the opening loan rate.
  The purchase is not replayed and does not create a deposit. Each bank's book is scaled down if it would leave that
  bank's reserves short of the reserve requirement. A zero principal is recorded as owned outright.
- Tenure choice off still opens with no household tenure and no household loan.

## Consequences

The default chart opens near 34.5 percent renting, 40.6 percent with a mortgage, and 24.9 percent owned outright.
Setting the owner share to 0 restores a renter start. Monthly tenure choice still runs, and it can move the shares
after the open.
