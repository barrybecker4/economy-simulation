# ADR 0031: Fisher bitcoin loan rate and mobility tenure choice

## Status

Accepted

## Context

Issue #13 found that bitcoin bank credit/GDP and the share of owners with a
mortgage had collapsed (about 0.12–0.16 and 12–14 percent at master `84d2086`)
while fiat sat in the real-world band. Housing mobility ([issue #12](https://github.com/barrybecker4/economy-simulation/issues/12))
then kept the opening mortgage book in force by paying off a loan and immediately
originating a new full-LTV mortgage, without asking whether a mortgage still won
on user cost. On current master that pumped bitcoin `creditToGdp` above fiat
(about 0.70 versus 0.43) because sticky satoshi incomes re-levered at current
home prices while nominal GDP fell.

The bitcoin market rate was a real rate (`timePref + LOAN_SPREAD × pressure`).
Tenure user cost then subtracted expected inflation again, so deflation raised
the real mortgage burden twice. Fiat’s Taylor rule already includes inflation,
so its real rate stays near time preference.

## Decision

- Bitcoin’s published market rate is Fisher-nominal:
  `max(0, timePrefMean + LOAN_SPREAD × pressure + expectedInflation)`.
  The fiat Taylor rule is unchanged. Hybrid keeps the Taylor path on the fiat
  side.
- Tenure user cost is still `loanRate − expectedInflation`. After Fisher that
  real rate equals time preference plus credit pressure, the same object as
  under fiat aside from savings-cap pressure.
- A mobility sale pays off the mortgage and the household chooses the new
  tenure by the ordinary user-cost rule. A move does not force a new mortgage
  when rent or cash ownership wins, and it cannot bypass the bitcoin savings
  cap by freeing a slot and immediately filling it.

## Consequences

Households still want mortgages when real rates are similar, so the opening
book does not collapse to a tenth of fiat. `creditToGdp` remains loans over
nominal GDP, so a given satoshi loan book rises relative to a falling price
level. That is debt-deflation of a living mortgage stock, not a clamp to the
fiat ratio. Forcing bitcoin `creditToGdp` below fiat would require shrinking
that book and would recreate the issue #13 teaching problem (hard money
abolishes credit). Gold-standard credit/GDP remains an open research item;
this ADR does not invent a lower target.
