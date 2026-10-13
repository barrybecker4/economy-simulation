# Deposit-rate pass-through calibration

Issue #15. The registry default and the monetary preset both set `bank.depositPassThrough` to 0.45 so
the paid deposit rate over the policy rate sits in the empirical deposit-beta band of 0.3–0.6 for fiat
regimes. A slider of 1.0 on the monetary preset paid about 0.69 of the policy rate and overstated how
well fiat savers are protected from inflation.

The pass-through of 0.45 applies only to fiat and hybrid regimes. Bitcoin uses a pass-through of 1.0
regardless of the slider setting, because the fiat-era empirical deposit beta does not apply to a
bitcoin standard.

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

## S0 / M fiat at slider pass-through 0.45

| arm     | mean  | median | range       |
| ------- | ----- | ------ | ----------- |
| S0 fiat | 0.371 | 0.371  | 0.356–0.383 |
| M fiat  | 0.388 | 0.389  | 0.385–0.391 |

M fiat median 0.389 is inside 0.3–0.6.

Bitcoin uses an effective pass-through of 1.0 regardless of the slider setting. The S0 and M bitcoin
arms measure the paid/policy ratio but do not constrain it to the fiat-era band.

## M fiat sensitivity

| `bank.depositPassThrough` | mean  | median | range       |
| ------------------------- | ----- | ------ | ----------- |
| 0.3                       | 0.257 | 0.257  | 0.254–0.259 |
| 0.45 (preset)             | 0.388 | 0.389  | 0.385–0.391 |
| 0.6                       | 0.517 | 0.518  | 0.512–0.521 |

The 0.3 slider lands below 0.3 on paid/policy because banks do not pay the full posted coupon. That
arm is a sensitivity, not the acceptance target. The 0.45 preset is the value that meets 0.3–0.6.
The ratio rises with the slider.
