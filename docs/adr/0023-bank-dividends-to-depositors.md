# ADR 0023: Bank dividends go to depositors

## Status

Accepted

## Context

Loan interest left deposits and raised bank equity. Excess equity above the capital target was released by cutting
equity and vault with no recipient, so at deposit pass-through 0 the deposit stock soaked into bank books. There is no
bank-share market.

## Decision

- Excess equity above the capital target is paid to that bank's depositors, pro rata by deposit, with a last-household
  residual.
- Equity falls and private equity rises by the same amount. Vault is unchanged. The payout is not limited by vault.
- The dividend does not enter `paidDepositRate`, so pass-through 0 still posts a zero coupon for the hoarding rule.

## Consequences

Pass-through-0 fiat runs keep deposits on the growth path instead of collapsing into equity. Owners remain deferred
until a share market exists.
