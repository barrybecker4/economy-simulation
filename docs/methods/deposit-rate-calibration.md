# Deposit-rate pass-through calibration

Issue #15. Fiat on the monetary preset pays the empirical deposit beta. `bank.fiatDepositPassThrough`
is 0.45 there, so the paid deposit rate over the policy rate sits in the 0.3–0.6 band. A shared
pass-through of 1.0 on that preset paid about 0.69 of the policy rate and overstated how well fiat
savers are protected from inflation.

`bank.depositPassThrough` is the slider the bitcoin regime reads, and the slider fiat deposits read when
`bank.fiatDepositPassThrough` is −1 (the registry default). Fiat deposits under hybrid use that same rule.
The monetary preset leaves the shared slider at 1, which is the value it had before this calibration, so the
bitcoin regime on that preset matches the previous behavior. Every other preset leaves the fiat slider at −1,
so those runs also match the previous pass-through, including bitcoin at the registry default of 0.45 and
hybrid fiat deposits at the shared slider.

Hybrid coin deposits are not paid interest. Hybrid's fiat deposit leg follows `bank.fiatDepositPassThrough`
when that slider is at least 0, and `bank.depositPassThrough` otherwise. On the monetary preset that leg is
0.45, the same beta as the fiat regime.

Sources:

- Average bank deposit-rate beta ≈0.46 (spread beta 0.54): Drechsler, Savov & Schnabl, NBER w22152.
- Cumulative cycle betas: about 0.6 (2004–07), ≤0.4 (2015–19), about 0.4 (2022Q4): NY Fed Liberty Street.

## Protocol

- Scale: 500 households, 50 firms, 3 banks (the issue's 500/50/3).
- Horizon: 240 months. Means over months 24–240, skipping months with a non-positive policy rate.
- Ratio: mean paid deposit rate / mean policy rate in that window.
- Seeds: 1 through 10.
- S0 is registry defaults. M is `scenarios/presets/monetary.json`.

Numbers from `deposit-rate-s0.test.ts`, `deposit-rate-m.test.ts`, and
`deposit-rate-sensitivity.test.ts`.

## S0 at the shared slider 0.45, and M fiat at 0.45

| arm        | mean  | median | range       |
| ---------- | ----- | ------ | ----------- |
| S0 fiat    | 0.371 | 0.371  | 0.356–0.383 |
| S0 bitcoin | 0.404 | 0.404  | 0.403–0.405 |
| M fiat     | 0.388 | 0.389  | 0.385–0.391 |

M fiat median 0.389 is inside 0.3–0.6. S0 bitcoin uses the registry default of 0.45, the same slider
master applies.

M bitcoin keeps the preset's shared slider at 1. Paid/policy over the same 10 seeds is mean 0.801,
median 0.800, range 0.765–0.846. That arm is not in the fiat band. The test checks that the median
stays above 0.6, so a fiat-only 0.45 applied to bitcoin would fail.

## M fiat sensitivity

The shared slider stays at 1. These rows change `bank.fiatDepositPassThrough`.

| `bank.fiatDepositPassThrough` | mean  | median | range       |
| ----------------------------- | ----- | ------ | ----------- |
| 0.3                           | 0.257 | 0.257  | 0.254–0.259 |
| 0.45 (preset)                 | 0.388 | 0.389  | 0.385–0.391 |
| 0.6                           | 0.517 | 0.518  | 0.512–0.521 |

The 0.3 slider lands below 0.3 on paid/policy because banks do not pay the full posted coupon. That
arm is a sensitivity, not the acceptance target. The 0.45 preset is the value that meets 0.3–0.6.
The ratio rises with the slider.
