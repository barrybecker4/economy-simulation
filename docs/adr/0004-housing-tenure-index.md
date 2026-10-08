# ADR 0004: Housing tenure on the CPI index

## Status

Accepted

## Context

Phase 12 needs mortgages, renting, and cash ownership so deflation can raise the real burden of nominal housing debt.
The CPI already has a housing line. Opening a separate housing quantity market would change relative-price accounting
and the single-good shopping rule.

## Decision

- Housing stays an expenditure weight and relative price inside the CPI basket. Households still buy one consumption
  good.
- When `housing.tenureChoice` is on, each household holds a tenure (`rent`, `mortgage`, or `owned`), a nominal mortgage,
  and an optional consumer loan. Shelter cost stays inside the food and housing spending floor from Phase 10. Consumer
  loans fund only discretionary spending above that floor.
- Tenure shares, property turnover, and debt service are measured from those stocks. When the switch is off, the older
  deflation-penalty formulas remain.
- There is no stock of vacant homes, no landlord agent type, and no separate rent market. Paying cash for a home moves
  deposits into the private-equity residual.

## Consequences

`docs/model.md` and `docs/limits.md` follow this ADR. A later phase can still replace the penalty formula for
profit-sharing without opening a firm-share exchange.
