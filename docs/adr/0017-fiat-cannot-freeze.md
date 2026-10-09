# ADR 0017: Fiat cannot freeze, and crisis stimulus lags

## Status

Accepted. Stimulus pressure updated in Phase 69 to the observed unemployment gap.

## Context

Regime comparisons used `centralBank.moneyGrowth` at 0 to freeze the fiat stock. That made fiat look like bitcoin and
hid the political risk that real central banks expand money over time and in crises. A crisis can still cut prices
before the bank responds. Reading only exogenous demand or credit impulses left endogenous slumps without stimulus.

## Decision

- `centralBank.moneyGrowth` keeps the secular rule but its minimum is 0.05. Loading 0 fails validation.
- `centralBank.stimulus` (minimum 0) times the lagged unemployment gap (unemployment minus the natural rate) adds to the
  annual growth rate. A positive gap expands; a negative gap withdraws. At 0 the crisis term is off.
- `centralBank.stimulusLag` (minimum 1) delays that response.
- Deflation stays in the secular inflation-gap term only.
- Bitcoin and hybrid ignore both sliders.

## Consequences

Regression tests that needed a fixed fiat stock use the growth floor instead. Fiat-vs-bitcoin comparisons no longer
share a frozen money path. Stimulus responds to observed labor-market slack, including slumps the economy creates
itself.
