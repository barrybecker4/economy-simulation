# ADR 0017: Fiat cannot freeze, and crisis stimulus lags

## Status

Accepted

## Context

Regime comparisons used `centralBank.moneyGrowth` at 0 to freeze the fiat stock. That made fiat look like bitcoin and
hid the political risk that real central banks expand money over time and in crises. A crisis can still cut prices
before the bank responds.

## Decision

- `centralBank.moneyGrowth` keeps the secular rule but its minimum is 0.05. Loading 0 fails validation.
- `centralBank.stimulus` (minimum 0.05) times lagged demand or credit contraction pressure adds to the annual growth
  rate. A productivity shock does not create that pressure.
- `centralBank.stimulusLag` (minimum 1) delays the extra injection and extends it after the contraction ends.
- Bitcoin and hybrid ignore both sliders. Unemployment does not trigger this injection.
- This supersedes the freeze-at-zero consequence in [ADR 0007](0007-bank-identity-and-fiat-money-growth.md).

## Consequences

Regression tests that needed a fixed fiat stock use the growth floor instead. Fiat-vs-bitcoin comparisons no longer
share a frozen money path.
