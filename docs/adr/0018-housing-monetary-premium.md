# ADR 0018: Housing monetary premium

## Status

Accepted

## Context

Under fiat inflation, households bid for homes partly as a store of value. Under a bitcoin or hybrid price path, holding
money itself protects purchasing power, so that inflation-hedge bid should leave housing. The model already cut housing
demand through the deflation penalty on the CPI line, but the tenure purchase price stayed fixed at 48 months of income.

## Decision

- `housing.monetaryPremium` is the share of the current 48-month price that exists as an inflation hedge. Default 0
  leaves Phase 64 unchanged.
- The hedge follows the regime price path (`normalInflation`), not trailing inflation. Hedge share is that path over the
  inflation target, clamped to [0, 1], and 0 when the target is 0.
- The price multiple is `1 − premium × (1 − hedge)`. It multiplies the tenure purchase price, opening mortgage principal,
  rent and user-cost home price, and the unscaled CPI housing line. Market-clearing scarcity multiplies after it.
- Fiat on its inflation target keeps the 48-month price. Bitcoin and hybrid shed the premium share immediately; there is
  no month-by-month glide. A mid-run regime flip updates the multiple on the next tenure pass; existing mortgage balances
  stay contractual.

## Consequences

`docs/model.md` and `docs/PLAN.md` Phase 65 follow this ADR. Home equity is still not counted in wealth. Hybrid uses the
same deflationary path as bitcoin for this multiple.
