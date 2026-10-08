# ADR 0012: Treasury surplus is rebated

## Status

Accepted

## Context

The income tax and the government spending share are both 20 percent, but the
treasury only buys inventory left after households shop. The unspent residual
stays in the government deposit. In long runs that stock was about half of fiat
deposits and about four fifths of bitcoin deposits. A deposit-only return does
not enter the goods budget while balances sit inside the household cash buffer,
so prices barely move.

## Decision

- `government.treasuryBufferMonths` (default 1) is the cash the treasury keeps,
  measured in months of this tick's grant, goods actually bought, and bond
  coupons.
- Cash above that buffer is paid to households after tax, in proportion to that
  tick's household income, and added to income. An equal split flattened income
  below the skill distribution. A refund in proportion to income raises next
  month's demand and is not taxed in the collection that funded it. When every
  household's income is zero, the rebate is split equally.
- The spending share does not rise. A shortfall still issues bonds. Bitcoin and
  hybrid use the same rebate, because the surplus is not a fiat-only stabilizer.

## Consequences

The treasury cannot accumulate a stock of deposits by taxing more than it
spends. Inflation is not asserted to hit the target because of this rebate
alone.
