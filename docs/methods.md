# Methods notes

`pnpm sim hypotheses --out hypotheses.json` runs H1–H8. Each note says what the runner compares. A `supported` flag is the comparison on seed 4 for 36 months at 40 households. It is a check that the mechanism moves, not a test of the real economy. See [limits.md](limits.md).

## H1

Claim: fixed money and rapid AI adoption lower the price level.

The runner compares a bitcoin economy with AI held at a constant automatable share to one with a steep adoption curve and sticky wages. Support means the fast run ends at a lower CPI.

## H2

Claim: inflation targeting changes output relative to a fixed supply.

Both regimes take the same demand, credit, and productivity shocks. Support means ending real GDP differs. The runner does not measure volatility with a filter.

## H3

Claim: AI adoption lowers the labor share, and who owns the AI changes the wealth Gini.

One run keeps the automatable share fixed. Another adopts quickly at the default ownership concentration. A third adopts quickly with ownership concentration at 0.2. Support needs both a lower labor share and a different wealth Gini.

## H4

Claim: lower payment friction raises the AI transaction share.

Two fiat runs set the autonomy share to 0.6. Friction is 0 in one and 0.1 in the other. Support means the easier run has a higher AI share of transactions.

## H5

Claim: full-reserve lending holds no more credit than maturity-matched lending.

Both are bitcoin economies with shocks on. Support means the full-reserve loan-to-savings ratio is no higher than the maturity-matched ratio at the last tick.

## H6

Claim: a larger physical-task share lowers the productivity gain from AI.

Both runs adopt quickly. Physical-task share is 0.1 in one and 0.7 in the other. Robotics start is set past the sample so the physical ceiling stays in place for the comparison. Support means productivity per human is lower when more tasks stay physical. In the default scenario the ceiling rises across the robotics ramp, and after that ramp finishes the gap between those two physical shares shrinks.

## H7

Claim: stronger expected deflation cuts credit and raises profit-sharing.

Both are bitcoin economies. Sensitivity is 0 in one and 5 in the other. Support needs lower credit to GDP and a higher profit-sharing share. The profit-sharing share is the contract report in [limits.md](limits.md), not a traded security.

## H8

Claim: electronics cheapen and housing rises inside both a rising and a falling CPI.

The fiat run uses default category growth, so electronics should end below the rest of the basket and housing above the CPI. The bitcoin run should end with lower inflation than fiat. Support needs all three.

## Transition comparison

`pnpm sim transition --out transition.json` runs the Phase 15 comparison. Steady fiat, steady bitcoin, and a 12-month transition each use the same seeds for 120 months with tenure choice on. The report gives median real consumption, real wealth, unemployment, debt service, and tenure shares, with the 5th and 95th percentiles across seeds.
