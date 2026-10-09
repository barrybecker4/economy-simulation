# Remaining design asymmetries

Phase 50 note, updated through Phase 62. These asymmetries still shape regime
comparisons even after Phases 35–62.

## Transition window

A positive `transition.gradualWeight` converts deposits and debts into bitcoin units month by month. Goods can be paid
from either balance while the window is open. Weight 0 is still a one-step rebase on the last month. The fiscal
stabilizer stays fiat-only during and after the window.

## Fiscal stabilizer

`government.stabilizer` raises the fiat spending share with the unemployment
gap. Under bitcoin and hybrid the boost is zero: spending cannot be financed by
new base money. That is intentional for the hard-money comparison, not a bug.
A tax surplus above `government.treasuryBufferMonths` is rebated in every
regime, so the treasury does not sit on idle deposits.

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
That injection creates base money. Hybrid is not hard money plus a backstop; it
is a money-creating LOLR. If that injection leaves equity negative, hybrid uses
the same merge or bail-in as the other regimes, and the treasury deposit at bank
0 is included.

## Fiat-only reserve interest and deposit subsidy

Fiat banks can fund deposit interest from interest on reserves and from
`bank.depositInterestSubsidy`, both inside the steady-state money-growth budget.
Bitcoin and hybrid receive neither. That is a saver transfer under fiat, not a
Cantillon test of who first holds new money. Report saver and distribution gaps
with pass-through 0 as well as at the preset.

## Injection channel

`centralBank.injectionChannel` changes who first holds new fiat. With
`centralBank.spendNewMoney` at 0, loan, bond, and treasury receipts stay
unblended into household demand, so channel comparisons are first-recipient
tests. `newLoans` books within credit room and retires on the ordinary path;
`assetPurchase` buys existing bonds and books one reserve plus a vault residual;
`governmentSpending` buys inventory. Do not blend channels to make loan injections look like a gift.

## Rebate and S0–S3 gaps

The treasury surplus rebate ([ADR 0012](../adr/0012-treasury-surplus-rebate.md))
runs in every regime. It can dominate S0–S3 gaps. Report those gaps twice: at the
default buffer, and with `government.treasuryBufferMonths` high enough that the
rebate does not bind.

## Imposed inequality

The monetary preset sets `household.skillSigma` to 1.1, skill-weighted bequests
use skill to the 16th, and the transition can reassign deposits by holder
concentration. Those are imposed. Regime gaps are also shown at skill sigma 0.5.

## Firm-level hiring on the monetary preset

The registry default for `labor.firmLevelHiring` is on. The monetary preset pins it
off: with demand-led output, firm-level shedding drove most of the fiat–bitcoin
unemployment gap on that preset. Report hiring-on cells separately when that
mechanism is the claim under test.

## Registry versus app defaults

The registry keeps `prices.trendWeight` at 1 so older phases stay money-irrelevant
under S0. The web app and `scenarios/presets/monetary.json` open with trend weight
0 so money can move prices. Document both when reporting experiments.
