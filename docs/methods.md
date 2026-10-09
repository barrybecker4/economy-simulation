# Methods notes

`pnpm sim hypotheses --out hypotheses.json` runs H1–H8. Each note says what the runner compares. A `supported` flag is
the comparison on seed 4 at 40 households, usually for 36 months. H4 runs 48 months. It is a check that the mechanism
moves, not a test of the real economy. See [limits.md](limits.md).

## H1

Claim: fixed money and rapid AI adoption lower the price level.

The runner compares a bitcoin economy with AI held at a constant automatable share to one with a steep adoption curve
and sticky wages. Support means the fast run ends at a lower CPI. On the 120-month methods check the two ending
levels stay within 2 percent, so that ordering is not stable once the CPI is the capacity-weighted average of posted
prices.

## H2

Claim: inflation targeting changes output relative to a fixed supply.

Both regimes take the same demand, credit, and productivity shocks, with price trend weight 0 so money can move
prices. Support means ending real GDP differs. The runner does not measure volatility with a filter.

## H3

Claim: AI adoption raises capital share or productivity per human, and who owns the AI changes the wealth Gini.

One run keeps the automatable share fixed. Another adopts quickly at the default ownership concentration. A third adopts
quickly with ownership concentration at 0.2. Support needs a higher capital share or productivity per human, and a
different wealth Gini. The labor share is reported but need not fall on this short seed once hiring no longer amplifies
slack through the wage reference.

## H4

Claim: lower payment friction raises the AI transaction share.

Two fiat runs put the adoption midpoint at year 1 and the steepness at 1.5, and they run for 48 months so agent output
is near its ceiling. Friction is 0 in one and 0.1 in the other. Support means the easier run has a higher AI share of
transactions.

## H5

Claim: full-reserve lending holds no more credit than maturity-matched lending.

Both are bitcoin economies with shocks on. Support means the full-reserve loan-to-savings ratio is no higher than the
maturity-matched ratio at the last tick.

## H6

Claim: a larger physical-task share lowers the productivity gain from AI.

Both runs adopt quickly. Physical-task share is 0.1 in one and 0.7 in the other. Robotics start is set past the sample
so the physical ceiling stays in place for the comparison. Support means productivity per human is lower when more tasks
stay physical. In the default scenario the ceiling rises across the robotics ramp, and after that ramp finishes the gap
between those two physical shares shrinks.

## H7

Claim: stronger expected deflation cuts credit and raises profit-sharing.

Both are bitcoin economies. Sensitivity is 0 in one and 5 in the other. Support needs lower credit to GDP and a higher
profit-sharing share. The profit-sharing share is the contract report in [limits.md](limits.md), not a traded security.

## H8

Claim: electronics cheapen and housing rises inside both a rising and a falling CPI.

The fiat run uses default category growth, so electronics should end below the rest of the basket and housing above the
CPI. The bitcoin run should end with lower inflation than fiat. Support needs all three.

## Transition comparison

`pnpm sim transition --out docs/results/transition.json` runs the Phase 15 comparison. Steady fiat, steady bitcoin, and
a 12-month transition each use the same seeds for 120 months with tenure choice on. The report gives median real
consumption, real wealth, unemployment, debt service, and tenure shares, with the 5th and 95th percentiles across seeds.

## Reporting rules

- **Paired seeds.** Any seed that throws or fails the audit in one arm is dropped from every arm of that comparison. Do
  not publish unpaired consumption gaps from crash survivors; those gaps flatter bitcoin on consumption by about a
  percentage point on the monetary preset. Unemployment gaps were not affected by that survivor bias.
- **Pass-through sensitivity.** Fiat-only reserve interest and the deposit subsidy are a saver transfer. Report saver
  and distribution gaps with `bank.depositPassThrough` at 0 as well as at the preset.
- **Injection channels.** First-recipient claims use `centralBank.spendNewMoney` 0. Do not treat a collapse of
  `newLoans` under the monetary preset as a failed gift.
- **Rebate-off sensitivity.** S0–S3 gaps are reported with the default treasury buffer and with a buffer high enough
  that the rebate does not bind.
- **Skill sigma.** Regime gaps on the monetary preset are also shown at `household.skillSigma` 0.5.
- Design asymmetries that remain intentional are listed in [methods/remaining-asymmetries.md](methods/remaining-asymmetries.md).

## Monetary-preset deposit decomposition

Phase 70 records per-tick deposit-flow buckets on the economy (`fiatInjection`, `netCredit`,
`interestRetained`, `writeDowns`, `reserveAccommodation`). On the monetary preset with a forced
demand slump (seed 4, 40 households):

- **Fiat.** Ending deposits sit below a calm run. The dominant gap versus calm is a smaller (often
  negative) `fiatInjection`: the secular money-growth rule withdraws once inflation overshoots after
  the crisis injection, and the smaller deposit base shrinks any positive monthly growth. Net credit
  also contracts. The Taylor rate sets the policy rate and deposit coupon; the deposit stock itself
  is moved by the money-growth channel.
- **Bitcoin.** Ending deposits also sit below calm. There is no fiat injection. Write-downs hit bank
  equity, not deposits. The deposit drag is net credit and borrower interest retained in bank equity
  after deposit coupons (see Phase 73 on dividends paid to nobody).

