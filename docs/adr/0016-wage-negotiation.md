# ADR 0016: Symmetric wage negotiation toward an agreed wage

## Status

Accepted.

## Context

The money wage grew with the regime price trend plus productivity, and `wage.nominalRigidity` only slowed the
unemployment add-on, with cuts scaled by the square of remaining flexibility. Under bitcoin that left the nominal wage
flat while prices fell. Hiring compared the real wage with `1 / (1 + markup)`, which ignored economy-wide productivity,
so every productivity-matched price decline looked like a permanent raise and shed jobs. A separate contract-length
slider left at 0 would have kept that path as the default.

## Decision

- The agreed wage is the price level times `1 / (1 + firm.markup)` times economy-wide productivity times one plus the
  hiring productivity impulse, times one plus `0.4` times labor-market tightness.
- `wage.nominalRigidity` is the share of the posted-to-agreed gap left for next month. Raises and cuts use the same
  speed. The default is 0.9 (was 0.7): under catch-up, 0.7 would close 30 percent of the gap each month and erase the lag.
- `labor.wageElasticity` uses the agreed real wage as its reference. The default stays 0.5.
- The onus follows the gap, not the regime label.

## Consequences

Calm runs at the defaults stay near the natural rate in fiat, bitcoin, and hybrid. Rising prices leave employees behind
while wages catch up; falling prices leave them ahead. Phase tests that assumed automatic trend indexation or that
default elasticity alone raised unemployment when productivity grew are rewritten.
