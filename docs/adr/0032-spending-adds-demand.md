# ADR 0032: Deficit spending adds demand only when asked

## Status

Accepted

## Context

The purchase share and the tax rate are separate sliders, but household budgets use one minus the purchase share. A
larger government takes that slice from households. Intended goods demand stays one income. The treasury then buys only
leftover inventory and rebates cash above a one-month buffer, while still issuing bonds for the order it intended. The
money stock can rise. Posted prices follow the regime trend mixed with excess demand, and the money stock is not in
that rule. Trend weight defaults to 1 so an opening run does not jump with excess demand.

A question of the form "if the government spends more than it taxes, what happens to prices?" is therefore answered
inside a world where spending more does not add demand and prices do not follow the money stock. Those are the
defaults because they keep the goods market from being asked to sell the same income twice, and because they keep the
first path calm. They are not a claim that a deficit cannot raise prices.

## Decision

- `government.spendingAddsDemand` defaults to off, which keeps the previous household rule.
- On: the share households give up is the tax rate minus the deficit (`max(0, purchase share − tax)`). A balanced
  budget is unchanged. A deficit is spent on top of after-tax income.
- The treasury's shopping rule is unchanged: leftover inventory, bonds for a shortfall, rebate of the surplus.
- Prices still move with that extra demand only when `prices.trendWeight` is below 1.

## Consequences

The deficit lesson can turn each assumption on and compare a 35 percent purchase share with a matched 20 percent
budget. The full model stays on the split-income rule until the switch is on.
