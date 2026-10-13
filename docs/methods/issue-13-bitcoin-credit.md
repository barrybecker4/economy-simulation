# Issue #13: bitcoin bank credit and mortgage tenure

Headline-suite arms, 500 households / 50 firms / 3 banks, 240 months, AI
automatable share fixed at 0.3, shocks off. `creditToGdp` is bank loans over
nominal annual GDP. Owners-with-mortgage is `mortgageShare / (mortgageShare +
ownedShare)`.

Real-world anchors in the issue: BIS bank credit to the private non-financial
sector 43–59% of GDP ([FRED QUSPBM770A](https://fred.stlouisfed.org/series/QUSPBM770A));
61.2% of owner-occupied homes have a mortgage (ACS 2019–23). Classical
gold-standard credit/GDP has no single verified number here; it stays an open
research item and is not used to cut the bitcoin floor.

## What changed

Tenure user cost treats the bitcoin market rate as already real (Fisher: do
not subtract expected inflation a second time). The published bitcoin policy
rate is unchanged, because marking it down starved bank interest and blew
issue #11’s failure-rate ceilings. Fiat still subtracts inflation from the
Taylor rate. A housing-mobility sale pays off the mortgage and the household
chooses the new tenure by user cost; it does not force a new full-LTV loan.
See [ADR 0031](../adr/0031-fisher-bitcoin-loan-rate.md).

## 10-seed results (this change)

Headline arms, seeds 1–10, month 239.

| arm        | creditToGdp mean [range] | owners with a mortgage mean [range] |
| ---------- | ------------------------ | ----------------------------------- |
| S0 fiat    | 0.506 [0.447, 0.548]     | 0.605 [0.585, 0.619]                |
| S0 bitcoin | 0.764 [0.708, 0.814]     | 0.616 [0.604, 0.619]                |
| M fiat     | 0.398 [0.360, 0.430]     | 0.623 [0.614, 0.629]                |
| M bitcoin  | 0.614 [0.597, 0.649]     | 0.611 [0.604, 0.619]                |

S0 fiat, both bitcoin floors, and all owners-with-mortgage bands meet the issue. M fiat credit/GDP is 0.02 under 0.43 on current master (demand-led nominal GDP); this change does not touch the fiat path.

## Why bitcoin `creditToGdp` is not forced below fiat

At master `84d2086`, S0 bitcoin credit/GDP was 0.16 with 14% of owners
mortgaged: real user cost added deflation on top of a real market rate, so
liquid households prepaid and new mortgages lost to rent. After mobility
landed, the same book was re-levered every move and bitcoin credit/GDP rose
above fiat.

Fisher removes the extra real-rate penalty, so households keep mortgages and
the issue’s floors (≥ 0.30 credit/GDP, ≥ 40% of owners mortgaged) hold. The
ratio can still sit above fiat because the denominator is nominal GDP and
bitcoin prices fall. Shrinking the book until the ratio is below fiat would
recreate the “hard money abolishes credit” result the issue asked us not to
bake in.
