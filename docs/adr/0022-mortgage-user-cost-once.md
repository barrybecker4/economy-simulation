# ADR 0022: Mortgage user cost counts expected inflation once

## Status

Accepted. Supersedes the double-count and one-sided term rule in
[ADR 0015](0015-subsidy-budget-and-mortgage-real-cost.md).

## Context

Tenure burdens used the real loan rate and a separate expected capital-loss term, so expected inflation entered twice.
The affordability check also shrank income under expected deflation with no mirror under inflation.

## Decision

- Buy-versus-rent uses the real loan rate (`loanRate − expectedInflation`) once. There is no separate capital-loss term.
- Affordability compares the contractual nominal payment with current income. Expected inflation does not rescale
  income.
- Liquid mortgagors may still prepay under expected deflation. The booked payment stays nominal.

## Consequences

Deflation still raises the user cost of buying through the real rate. Affordability is two-sided. Phase 62 tests that
relied on the income floor under deflation are rewritten.
