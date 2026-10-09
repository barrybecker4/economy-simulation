# ADR 0018: Real mortgage claim at the rebase

## Status

Accepted

## Context

A one-step or gradual fiat-to-bitcoin transition leaves opening mortgages as fixed satoshi payments. Under the bitcoin
price path those payments rise in real terms, middle-skill mortgagors default, bank equity is written down, and deposit
bail-ins destroy money. Removing the inherited mortgage stock halves the damage in regime comparisons. Agents already
refuse new long mortgages and liquid borrowers prepay; the illiquid opening book is the remaining crisis path.
`transition.debtHaircut` can write off a share of all debts at once, but a share large enough to stop the spiral can
wipe equity and still trigger bail-in.

## Decision

- `transition.realMortgage` is `off` (default) or `on`.
- On: at the end of the transition window, after any debt haircut and after bitcoin loan units fold into the single
  balance, every positive household mortgage is stamped. Later months multiply principal and payment by the price level
  over the last stamped price so the real payment stays at the rebase. Creditors keep that real claim.
- The principal change seats `bank.capitalRatio` of itself on bank equity and the rest on deposits at that bank, pro
  rata. The mark is not recorded as a default and is not charged entirely to equity.
- Mortgages originated after the flip stay nominal. Firm loans and consumer loans stay nominal.

## Consequences

`docs/PLAN.md`, `docs/model.md`, and `docs/assumptions.md` follow this ADR. Transition runs with the slider off match
Phase 65. A fair rebase comparison turns the slider on without raising the debt haircut.
