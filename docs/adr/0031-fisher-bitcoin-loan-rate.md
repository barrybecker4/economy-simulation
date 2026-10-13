# ADR 0031: Fisher real rate for bitcoin tenure, charged rate unchanged

## Status

Accepted

## Context

Issue #13 found that bitcoin bank credit/GDP and the share of owners with a
mortgage had collapsed (about 0.12–0.16 and 12–14 percent at master `84d2086`)
while fiat sat in the real-world band. Two later effects stacked:

- Bitcoin’s market rate is already a real rate (`timePref + LOAN_SPREAD ×
pressure`). Tenure user cost then subtracted expected inflation again, so
  deflation made mortgages look much more expensive than under fiat (the Taylor
  rule is already nominal). Liquid households prepaid.
- Housing mobility ([issue #12](https://github.com/barrybecker4/economy-simulation/issues/12))
  paid off a mortgage and immediately originated a new full-LTV loan without
  asking whether a mortgage still won on user cost. On current master that
  pumped bitcoin `creditToGdp` above fiat.

Marking the _published_ bitcoin policy rate down by expected inflation (classical
Fisher on `marketLoanRate`) restored similar real user cost but starved bank
interest income. M bitcoin then failed issue #11’s failure-rate ceilings
(about 12% per bank-year with shocks off, versus 0.5%).

## Decision

- Tenure user cost uses a Fisher real rate: bitcoin `policyRate + LOAN_SPREAD`
  (the market rate is already real); fiat and hybrid `policyRate + LOAN_SPREAD −
expectedInflation` (Taylor is already nominal). Charged interest and the
  published bitcoin market rate stay `policyRate + LOAN_SPREAD`.
- A mobility sale pays off the mortgage and the household chooses the new
  tenure by the ordinary user-cost rule. A move does not force a new mortgage
  when rent or cash ownership wins.

## Consequences

Households still want mortgages when real rates are similar, so the opening
book does not collapse to a tenth of fiat. Bank net interest is not marked
down under deflation. `creditToGdp` remains loans over nominal GDP, so a given
satoshi loan book rises relative to a falling price level. That is
debt-deflation of a living mortgage stock, not a clamp to the fiat ratio.
Gold-standard credit/GDP remains an open research item.
