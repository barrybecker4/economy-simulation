# ADR 0005: Fiat-to-bitcoin transition as a rebase

## Status

Accepted

## Context

Steady regime runs compare economies that each start already on their own standard. The bitcoin-standard chat asks about
leaving a fiat system, including existing debts and who holds the new base money. A second goods price for bitcoin
during the transition would reopen international and dual-currency questions that the limits note rules out.

## Decision

- `transition.lengthMonths` defaults to 0. Steady `regime.type` runs are unchanged.
- A positive length starts on fiat rules. Balances use satoshis from the start of that run so the ledger class does not
  change mid-run. At the last transition month the model haircuts nominal debts by `transition.debtHaircut`, reassigns
  household deposits by `transition.holderConcentration`, clears bank-held government bonds, and switches the active
  regime to bitcoin. Bond monetization stays off afterward.
- There is no second currency price and no model of a country converting in the real world. The transition is a rebasing
  of one closed economy.

## Consequences

`docs/model.md`, `docs/limits.md`, and the Phase 15 methods note follow this ADR. Dual-currency trade and a market
bitcoin price stay deferred.
