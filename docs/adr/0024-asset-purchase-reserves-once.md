# ADR 0024: Asset purchase books one interest-bearing reserve

## Status

Accepted. Supersedes the twice-reserves booking in [ADR 0021](0021-rate-cap-and-real-channels.md) and
[ADR 0010](0010-injection-channel.md).

## Context

`assetPurchase` retired a bank bond, paid households, and added reserves equal to twice the purchase so
`loans + reserves + bonds + vault = deposits + equity` closed. The second reserve earned the policy rate. Once reserves
exceeded deposits, reserve interest funded the whole deposit coupon. With deposit pass-through and real-return
sensitivity, spending fell, deflation deepened, and the monthly money-growth cap compounded deposits to thousands of
times the opening stock. The Taylor rate cap did not stop that loop.

## Decision

- `assetPurchase` buys bonds already on bank books, pays households, and adds reserves equal to the purchase (one leg
  matching the new deposits).
- The retired bond seats on vault cash and the private-equity residual (`vault = equity + privateEquity`). That residual
  does not earn the policy rate and does not expand credit room.
- A contraction reverses the same legs: drain deposits, release one reserve, reduce the vault residual, and restore the
  bond. With no bonds, the channel places nothing.

## Consequences

Channel comparisons keep a real purchase instrument without a second interest-bearing reserve. Hoarding cells on
`assetPurchase` stay on the same order of magnitude as `proRataDeposits`.
