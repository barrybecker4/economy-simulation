# ADR 0011: Deposit interest is paid from asset income

## Status

Accepted

## Context

Household deposit interest was paid out of the bank equity stock, down to zero.
A thin capital buffer was gone in about nine months, so every bank failed and
the sole survivor was bailed in every month after that. The fiat subsidy that
topped up the shortfall raised equity and reserves and left private equity
unchanged, so `vault = equity + private equity` threw on the first tick the
subsidy bound.

## Decision

- Deposit interest is paid from this tick's borrower interest. Fiat banks also
  earn the policy rate on reserves, up to the coupon gap and the steady-state
  money-growth budget. That creation is subtracted from the same tick's
  money-growth injection.
- The anniversary firm draw cannot push a loan above the firm's capital value.
  Expansion loans that fund new capital are not under that cap.
- Equity already on the books, including the capital buffer, is not spent to pay
  the coupon.
- `bank.depositInterestSubsidy` remains an optional fiat top-up inside the same
  money-growth budget. It lowers private equity by the amount equity rises.
  Vault is unchanged. That creation is subtracted from the same tick's
  money-growth injection. Coupon above the budget is not paid. Bitcoin and
  hybrid do not receive reserve interest or the subsidy. See
  [ADR 0015](0015-subsidy-budget-and-mortgage-real-cost.md).

## Consequences

A calm run can pay savers only what the asset book earns, and it can do that
without driving equity through zero. Fiat money growth stays on the same annual
path because reserve interest is inside that budget. Turning the subsidy on no
longer breaks the ledger.
