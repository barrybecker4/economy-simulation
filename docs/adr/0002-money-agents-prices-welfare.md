# ADR 0002: Money, agents, relative prices, and welfare

## Status

Accepted

## Context

The original design note stored money as integer cents or integer satoshis, treated AI agents as a late add-on, used one consumption good, and judged regimes mostly by macro series such as GDP and unemployment. Those choices cannot represent fractional-satoshi prices after strong deflation, a population that becomes mostly AI, goods that inflate differently, financing that changes when deflation punishes debt, or a plain answer to whether an outcome is good or bad.

## Decision

- Fiat balances stay integer cents. Bitcoin balances, prices, and settlements are IEEE-754 doubles in satoshis and may be fractional. The fiat ledger audit is exact. The bitcoin audit passes within a relative epsilon. Saved output uses a canonical decimal format.
- Humans and AI agents are one population. The AI share is an assumption and may become most of the economy. Well-being uses human agents only.
- After the single-good baseline, the CPI is split into food and beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics. Productivity and housing supply move those prices apart. Headline inflation is their expenditure-weighted average.
- Expected deflation reduces lending, borrowing, and speculation in proportion to its strength. Firms can shift from tradeable stock to profit-sharing. Housing can shift from nominal mortgages to bitcoin-collateralized loans, targeted savings cooperatives, or rent-to-own.
- Outcome quality is a dashboard: inequality, mean and median real wealth, mean and median real consumption, and well-being. A single index exists only when the user sets weights, and those weights are assumptions.

## Consequences

`docs/PLAN.md` follows this ADR where it differs from the original design note. Firm-share markets, multiple countries, and AI agents with goals different from their owners stay out of the first release.
