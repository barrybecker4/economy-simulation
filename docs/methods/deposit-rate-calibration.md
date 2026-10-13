# Deposit-rate pass-through calibration

Issue #15. The registry default and the monetary preset both set `bank.depositPassThrough` to 0.45 so
the paid deposit rate over the policy rate sits in the empirical deposit-beta band of 0.3–0.6. A slider
of 1.0 on the monetary preset paid about 0.69 of the policy rate and overstated how well fiat savers
are protected from inflation.

Sources:

- Average bank deposit-rate beta ≈0.46 (spread beta 0.54): Drechsler, Savov & Schnabl, NBER w22152.
- Cumulative cycle betas: about 0.6 (2004–07), ≤0.4 (2015–19), about 0.4 (2022Q4): NY Fed Liberty Street.

## Protocol

- Scale: 500 households, 50 firms, 3 banks (the issue's 500/50/3).
- Horizon: 240 months. Means over months 24–240, skipping months with a non-positive policy rate.
- Ratio: mean paid deposit rate / mean policy rate in that window.
- Seeds: 1 through 10.
- S0 is registry defaults. M is `scenarios/presets/monetary.json`.

Numbers below are filled from `deposit-rate-calibration.test.ts`.
