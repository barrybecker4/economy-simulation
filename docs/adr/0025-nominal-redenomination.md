# ADR 0025: Redenominate fiat before the safe integer

## Status

Accepted.

## Context

Extreme AI plus a large household grant drives nominal prices and bond stocks up without a ceiling. A bank bond balance
is a JavaScript number, so the run throws once that balance passes `Number.MAX_SAFE_INTEGER`. Spilling the overflow
into a second field lost integer precision and showed up as false spikes in the charts. Bigint cannot hold the stock
either: over 1,200 months the nominal path can pass 2^63.

## Decision

- When a fiat price or money stock passes 10^12, divide every nominal fiat quantity by 1,000 and multiply `nominalScale`
  by 1,000. Repeat until the internal numbers are back under the ceiling.
- Charted prices and money flows are the internal values times `nominalScale`, so they stay in original cents.
- Real ratios, including inflation, are unchanged. Cent rounding residue is seated on the first bank's equity and the
  private-equity residual so the books still close.
- Bitcoin unit balances are not divided. The fiat price of bitcoin is.
- A single posting that would jump one balance past the safe integer still throws.

## Consequences

A hyperinflation finishes the requested months and can be read on a log price scale. The internal books stay inside the
safe integer. One redenomination moves balances by less than half a cent of rounding per stock, seated so the ledger
identity holds.
