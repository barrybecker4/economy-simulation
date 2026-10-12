# ADR 0030: No new consumer credit under Bitcoin

## Status

Accepted

## Context

Consumer loans used the same income-share ceiling in every regime. Under Extreme AI that ceiling scaled with
concentrated capital and UBI income, so monthly consumer origination rose even when almost no one had a wage. That was
especially hard to defend under bitcoin, where household revolving credit is not the intended story and lending is
already savings-capped.

## Decision

- When `regime.type` is `bitcoin`, no new consumer loans are originated.
- Existing consumer loan balances still service and repay.
- Mortgages and firm loans stay on the savings-capped bitcoin path.
- Fiat and hybrid keep the income-share consumer-credit rule.

## Consequences

`housing.consumerCreditLimit` does nothing under bitcoin. Bitcoin Extreme runs no longer show an income-driven consumer
borrowing surge. `docs/model.md` and the slider description follow this ADR.
