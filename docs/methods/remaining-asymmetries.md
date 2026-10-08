# Remaining design asymmetries

Phase 50 note. These asymmetries still shape regime comparisons even after
Phases 35–49.

## Fiscal stabilizer

`government.stabilizer` raises the fiat spending share with the unemployment
gap. Under bitcoin and hybrid the boost is zero: spending cannot be financed by
new base money. That is intentional for the hard-money comparison, not a bug.

## Payment friction

`ai.paymentFrictionFiat` defaults to 2 percent and `ai.paymentFrictionBitcoin` to
0.5 percent. Both are labeled guesses. They matter only when AI agents trade.

## Opening tenure

`housing.openingOwnerShare` and `housing.openingMortgageShareOfOwners` impose
the opening housing mix. Tenure choice then evolves from that imposed book.
Endogenous opening tenure remains deferred.

## Hybrid versus bitcoin

With no bank failure and choice speed 0, hybrid matches bitcoin except that
hybrid can inject capital as lender of last resort when equity goes negative.
If that injection leaves equity negative, hybrid uses the same merge or bail-in
as the other regimes, and the treasury deposit at bank 0 is included.

## Registry versus app defaults

The registry keeps `prices.trendWeight` at 1 so older phases stay money-irrelevant
under S0. The web app and `scenarios/presets/monetary.json` open with trend weight
0 so money can move prices. Document both when reporting experiments.
