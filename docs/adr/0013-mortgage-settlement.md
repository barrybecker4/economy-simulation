# ADR 0013: Mortgage settlement

## Status

Accepted

## Context

A new mortgage credited the principal to the buyer and paid the seller only the
down payment, so the buyer gained about three years of income. Every household
faced the same user cost, and at a low opening loan rate the whole eligible
stock borrowed in the first tick. The renter share then fell from about 35
percent to a few percent.

## Decision

- The principal is a new deposit credited to firms. The buyer pays the down
  payment and does not keep the principal. Total deposits rise by the principal.
- The monthly user cost adds that household's time preference minus the mean.
  At the neutral loan rate the median household is near the rent-mortgage
  margin. More impatient households keep renting.
- `housing.adjustmentRate` (default 0.01) is the chance a household may switch
  tenure this month. Opening tenure is unchanged until that draw. A mortgagor
  stays until the loan is repaid or foreclosed. Selling the house back into
  firm deposits would pull working capital out of payroll. The default is
  0.01 rather than 0.04 because a cheap window converts renters and they do
  not switch back.

## Consequences

One cheap month cannot originate the whole mortgage stock. The renter share
stays near the opening mix. Stronger expected deflation still raises the
mortgage burden.
