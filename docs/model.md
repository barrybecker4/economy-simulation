# Model

Equations and behavioral rules. A section is not part of the simulation until the phase that implements it fills it in. Sources and guesses are named here, and slider status lives in the registry.

## Accounting

Implemented in Phase 1. See [ADR 0002](adr/0002-money-agents-prices-welfare.md).

A ledger holds one unit. Fiat amounts are integer cents, stored as integers and rejected above `Number.MAX_SAFE_INTEGER` (2^53 − 1). Bitcoin amounts are IEEE-754 doubles in satoshis and may be a fraction of a satoshi.

Each account is an asset, a liability, or equity. A debit increases an asset and decreases a liability or equity. A credit does the opposite. A transaction has at least two lines, and its debits equal its credits. The books update only after every line is valid, so a rejected transaction leaves balances unchanged.

Issuing base money credits a liability account and debits an asset account by the same amount. Redeeming reverses that. Moving money between holders credits one asset and debits another. Capitalizing credits an equity account and debits an asset.

The audit identity is:

```text
assets = liabilities + equity
```

For cents the identity is exact. For satoshis it holds within `max(1e-9, 1e-8 * scale)`, where `scale` is the largest absolute balance and at least 1. The relative term absorbs double rounding. The absolute term covers balances near zero. These tolerances are numerical guards, not economic parameters.

An empty ledger satisfies the identity. Phase 1 does not post on its own.

## Time

One tick is one month. A scenario's `ticks` field sets the length of a run. The default is 600 ticks, which is 50 years. The maximum accepted value is 12,000 ticks, a guard against an accidental huge run, not an economic assumption. The core never reads the wall clock.

## Randomness

The seeded generator is sfc32. splitmix32 fills its four words from a FNV-1a mix of the seed and a stream id. The first 12 outputs are discarded so the first visible draw is mixed. That warmup is part of the stream definition.

`fork(id)` depends only on the root seed and the id. Using one stream does not change another. Calling `fork(id)` again restarts that stream; keep the returned object if later draws should continue it. Agent id `n` and the string `"n"` name the same stream.

Uniforms are on `[0, 1)`. Normal draws use Box–Muller. A standard deviation of zero returns the mean and does not consume a draw. Lognormal is the exponential of a normal draw. Poisson uses Knuth's product method and rejects a lambda above 10,000. Weighted choice uses the cumulative sum and skips zero weights.

## Scheduler

Each tick runs, in order: shocks, population mix, labor market, production, goods and asset markets, contract choice, credit, government, central bank, bookkeeping, welfare. The bookkeeping step records the audit. Welfare can read that audit. The result's audit is taken again after the tick. Phase 1 leaves every step empty unless a caller passes a handler.

The ledger unit follows `regime.type`: fiat uses cents; bitcoin and hybrid use satoshis. No regime rules run in this phase.

## Metrics

Every tick stores one row. Series that nothing has set are null. `auditOk` is 1 when the end-of-tick audit passes and 0 otherwise. JSON output is deterministic for a seed and scenario. Hashes use a second form of that output in which object keys are sorted and every number is written in exponential form with 12 digits after the decimal point.

The welfare and macro series are reserved here and filled in later phases. They are not a model of well-being yet.

## Agents

Not yet specified. The population will contain human agents and, in a later phase, AI agents.

## Production

Not yet specified.

## Labor market

Not yet specified.

## Goods and relative prices

Not yet specified. The first economy is one good. A later phase adds categories whose prices move apart.

## Credit and contracts

Not yet specified. A later phase adds the deflation penalty and the contract menu.

## Government and central bank

Not yet specified.

## Regimes

Not yet specified. Fiat, a fixed-supply bitcoin standard, and a hybrid are planned.

## AI productivity

Not yet specified.

## AI agents

Not yet specified.

## Welfare

Not yet specified. The planned series are inequality, mean and median real wealth, mean and median real consumption, and human well-being.

## Shocks

Not yet specified.
