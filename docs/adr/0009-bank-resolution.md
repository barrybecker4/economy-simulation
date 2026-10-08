# ADR 0009: Bank resolution on insolvency

## Status

Accepted

## Context

Marking `bank.failed` stopped lending but left deposits stranded at insolvent
banks. Hybrid already injects capital as lender of last resort; fiat and bitcoin
did not. Experiments need failed banks to resolve so credit can continue and
regime comparisons stay meaningful.

## Decision

- `bank.resolution` is `off` (prior behavior) or `merge` (monetary preset).
- On merge, deposits and loans move to the lowest-id surviving bank. A sole bank
  is bailed in: deposits are written down until equity is positive, then the
  failed flag clears.
- `bank.depositHaircut` optionally writes off a share of deposits on merge or
  before the residual bail-in.
- Insolvency is checked before contract choice and credit, and again in
  bookkeeping after late losses, so a failed bank cannot lend the same tick.
- Hybrid still runs lender-of-last-resort injection in the central-bank step
  before those checks when equity is negative.

## Consequences

Fiat and bitcoin can clear failed banks without a central-bank backstop. Hybrid
still differs when injection prevents failure. Sole-bank monetary runs use
bail-in rather than requiring multiple banks.
