# ADR 0020: Hiring reference omits tightness and the productivity impulse

## Status

Accepted. Narrows the hiring reference in [ADR 0016](0016-wage-negotiation.md).

## Context

The agreed wage and the hiring reference used the same formula, including labor-market tightness and the productivity
impulse. Slack cut the reference, sticky posted wages looked expensive, and the quota fell, which deepened the slump.
An adverse supply shock did the same through the impulse. Firm-level hiring plus hoarding under bitcoin then climbed
through high unemployment.

## Decision

- The agreed wage stays the price level times `1 / (1 + firm.markup)` times trend productivity times one plus
  `0.4` times tightness. It does not include the productivity impulse.
- The hiring reference is that agreed real wage at zero tightness: `1 / (1 + firm.markup)` times trend productivity.
  Tightness and the productivity impulse stay out of the quota.
- Capacity still multiplies by one plus the productivity impulse. While the impulse is negative, the hiring scale cannot
  rise above 1. The hiring-impulse glide is gone.

## Consequences

A supply shock cuts output without cutting the cost quota, and does not boom hiring when sticky wages lag a price rise.
Firm-level hiring can still shed when sales fall, under the monthly shed cap. Slack no longer amplifies itself through
the hiring reference.
