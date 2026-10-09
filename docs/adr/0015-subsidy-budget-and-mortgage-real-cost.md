# ADR 0015: Deposit subsidy stays in the growth budget; mortgages use real buy-or-wait cost

## Status

Accepted. Supersedes the uncapped-subsidy sentence of
[ADR 0011](0011-deposit-interest-funding.md) and the deflation-only mortgage
burden note in earlier tenure text.

## Context

Two accepted paths distorted regime comparisons.

1. `bank.depositInterestSubsidy` printed new reserves and equity with no cap.
   On demand-led fiat with pass-through 1, the uncapped Taylor rate made the
   deposit coupon larger than asset income, the subsidy filled the gap, and
   spending fed the Taylor rule into hyperinflation.
2. Tenure choice added expected deflation to the mortgage rate but did not
   charge expected capital loss on the house, did not shorten the term when
   income was expected to fall, and never let a liquid mortgagor prepay when
   the real burden said waiting was cheaper. Bitcoin households still took and
   kept nominal loans under large deflation, so bail-ins looked like a credit
   failure instead of a credit freeze.

## Decision

- Fiat reserve interest and the deposit-interest subsidy both draw on the same
  tick's steady-state money-growth budget. Their creation is subtracted from
  that tick's money-growth injection. Coupon that does not fit is not paid.
  Bitcoin and hybrid still receive neither.
- Mortgage and cash-ownership user costs use the real loan rate
  (`loanRate − expectedInflation`) once. Rent does not. The separate capital-loss
  term and the one-sided income floor are superseded by
  [ADR 0022](0022-mortgage-user-cost-once.md).
- The longest offered term, up to the term slider, is the longest horizon at
  which the fixed nominal payment stays inside `housing.mortgageDefaultShare`
  of current income. If even one year fails, the household does not originate.
- While expected inflation is negative, a mortgagor whose deposits cover the
  balance may prepay in full when rent or cash ownership wins on user cost.
  Illiquid borrowers keep the loan and the existing foreclosure rule. The
  adjustment draw still gates ordinary tenure switches when inflation is not
  negative.

## Consequences

S3 fiat with subsidy 1 and pass-through 1 no longer runs away on printed
deposit coupons. Under about −8%/yr expected inflation, new long mortgages go
to about zero and liquid opening mortgages prepay, so bitcoin credit freezes
instead of failing through a stream of new loans. Hybrid lender-of-last-resort
support remains a money-creating backstop and is not hard money plus a
backstop.
