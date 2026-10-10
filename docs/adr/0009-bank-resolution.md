# ADR 0009: Bank resolution on insolvency

## Status

Accepted

## Context

Marking `bank.failed` stopped lending but left deposits stranded at insolvent
banks. Hybrid already injects capital as lender of last resort; fiat and bitcoin
did not. Experiments need failed banks to resolve so credit can continue and
regime comparisons stay meaningful.

## Decision

- `bank.resolution` is `off` or `merge`. The registry default is `merge`. `off` is the feature-off path.
- On merge, deposits and loans move to the lowest-id surviving bank. A sole bank
  is bailed in until equity meets the capital target from `equityFor`, then the
  failed flag clears. A bank already at that target is not bailed in again.
- The treasury deposit at bank 0 takes the same write-down as other deposits.
- `bank.depositHaircut` optionally writes off a share of deposits on merge or
  before the residual bail-in.
- Insolvency is checked before contract choice and credit, and again in
  bookkeeping after late losses, so a failed bank cannot lend the same tick.
- Hybrid still runs lender-of-last-resort injection first. If equity is still
  negative after that support, hybrid uses the same merge or bail-in.

## Consequences

Fiat and bitcoin can clear failed banks without a central-bank backstop. Hybrid
still gets lender-of-last-resort support first, and is resolved the same way if
that support leaves equity negative. Sole-bank monetary runs use bail-in rather
than requiring multiple banks. One loss refills the capital target instead of
repeating a write-down to a token of equity.
