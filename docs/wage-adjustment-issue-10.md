# Issue #10: expectation-driven wage adjustment

Replaces the uniform monthly partial-adjustment lag with a shape that depends on
whether deflation is expected. It does **not** branch on `regime.type`. PR #20
applied fiat-era job-stayer cut rates (~2%/yr) to bitcoin and was not merged.

Bitcoin acceptance here is gold-standard history, not the issue’s original
bitcoin caps (≤5% job-stayer cuts, <25% of months with a YoY money-wage decline).

## Mechanism

The agreed wage is unchanged (price × 1/(1+markup) × productivity × tightness).
`wage.nominalRigidity` is still the raise/cut speed when no exception binds.

1. **Unexpected deflation hold** (`wage.unexpectedHoldMonths`, default 18).
   Month-over-month inflation more than two annual points below expected
   inflation starts a hold. The posted wage is frozen for at least two thirds of
   the slider (12 of 18 months), then only while the surprise lasts. Source:
   US manufacturing wages after 1929 held about 12–24 months, then fell by less
   than prices (−16.8% vs about −25%).
2. **Review interval** (`wage.reviewMonths`, default 12). When expected
   inflation is at or above zero, the posted wage moves only every 12 months and
   that review closes the gap monthly adjustment would have closed. That is the
   Daly–Hobijn zero-change pile. When expected inflation is negative the
   interval is ignored, so expected hard-money deflation can still drift every
   month (US/UK 1873–96).
3. Rigidity 0 skips both exceptions. `FEATURE_OFF` sets both sliders to 0.

There is still one economy-wide wage index. Job-stayer cut share is the share of
months that index falls, because every stayer is paid it.

## Fiat-assumption audit

Every place the new logic or its tests uses a fiat-era fact:

| Location                                           | Fiat-derived content                                                                        | Applied to bitcoin?                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `wage.reviewMonths` default 12, Daly–Hobijn        | Zero-change spike under non-negative expected inflation                                     | **No.** The interval is off when expected inflation is negative. S0 bitcoin (trend prices, expected deflation) shows a low zero share. |
| Grigsby–Hurst–Yildirmaz ~2–2.4% job-stayer cuts/yr | Fiat test: S0/M fiat YoY decline share stays low; MoM cuts are rare                         | **No.** Bitcoin tests require the opposite: some YoY declines and rising real wages. There is no ≤5% or ≤15% bitcoin cut cap.          |
| `fiatWageCatchUpScale` in `labor.ts`               | Pre-existing: damp upward catch-up when trailing inflation is already above the fiat target | Fiat `regime.type` only, unchanged. Not part of this issue.                                                                            |
| `wage-adjustment-issue-10.test.ts` fiat describe   | Asserts a large zero-month share and a low YoY decline share                                | Fiat runs only.                                                                                                                        |
| Same file, bitcoin describe                        | Smooth nominal decline, rising real wages, hold then a smaller wage drop than prices        | Gold-standard 1873–96 and 1929–33, not Grigsby.                                                                                        |
| Hold length 18 months, 2pp surprise threshold      | 1929–33 manufacturing wages vs wholesale prices                                             | Hard-money shock evidence, not a fiat cut rate.                                                                                        |
| Ten-seed table below                               | Fiat columns are compared to Grigsby rarity and Daly–Hobijn zeros                           | Bitcoin columns are **not** scored against 2% job-stayer cuts.                                                                         |

No bitcoin test or slider default uses ~2% job-stayer cuts/yr, ~2% annual cut
incidence, or the original issue’s ≤25% YoY-decline cap.

## Ten-seed verification

Scale: 80 households, 8 firms, 1 bank (the issue’s 500/50/3 band is the same
qualitative setup; this size is what CI can repeat). Ticks 240, months 24–239.
AI start=end 0.3. Seeds 0–9. Shocks off on the four calm arms. S0 is registry
defaults. M is `scenarios/presets/monetary.json`.

Job-stayer cut share = share of months the common wage index falls month-to-month.
YoY decline share = share of months the index is below its level 12 months earlier.
Real wage trend = `realWage` at month 239 / month 24.

| Arm        | YoY decline mean [min, max] | Job-stayer MoM cut mean [min, max] | Zero-month share mean [min, max] | Real wage ratio mean [min, max] |
| ---------- | --------------------------- | ---------------------------------- | -------------------------------- | ------------------------------- |
| S0 fiat    | 0.2% [0.0, 2.3%]            | 0.0% [0.0, 0.0%]                   | 93.0% [91.7, 94.9%]              | 1.13 [1.07, 1.17]               |
| S0 bitcoin | 7.6% [0.0, 14.8%]           | 7.9% [0.0, 13.4%]                  | 14.4% [0.0, 38.9%]               | 1.20 [1.19, 1.20]               |
| M fiat     | 7.7% [0.9, 12.5%]           | 0.0% [0.0, 0.0%]                   | 95.0% [92.1, 96.8%]              | 1.89 [1.71, 2.19]               |
| M bitcoin  | 9.0% [4.2, 18.1%]           | 0.1% [0.0, 0.9%]                   | 95.3% [94.4, 96.3%]              | 1.64 [1.44, 1.80]               |

Deep demand shock (bitcoin, demand-led prices, hold 18, review off, size −0.3 at
month 36, ten seeds): longest frozen-wage streak after the shock **13.7 months
[13, 15]**. Over the 12-month crash window the money wage does not drop by as
much as the price level (wage/price change ratio mean −2.1, i.e. wages held or
rose while prices fell).

## What this hits, and what it does not

**Fiat.** Large zero-change pile (Daly–Hobijn). YoY money-wage declines are rare
on S0 (0.2%) and uncommon on M (7.7%). MoM cuts are 0% on the common index, so
the Grigsby 2–2.4% _cross-section_ of job-stayers is not reproduced: that needs
firm-level wages, which this change does not add.

**Bitcoin steady state.** S0 (trend prices, expected deflation) is the 1873–96
analog: money wages decline in a non-trivial share of months, the zero pile is
small, real wages rise. M bitcoin’s demand-led prices often keep expected
inflation near zero, so the review interval binds and money wages do not crawl
down every month; real wages still rise. That is expectations, not a regime
switch, and it is **not** a 2% job-stayer cap.

**Bitcoin shock.** After an unexpected demand-led price drop the money wage
holds 13–15 months, then the wage change stays smaller than the price change
over the crash window. The 16.8/25 peak-to-trough ratio is not a point estimate
here: the model’s forced demand shock is 12 months of contraction then a rebound,
not four years of 1929–33 deflation.

**Not hit.** Firm-level / worker-level cut incidence of 2–2.4%/yr; original
issue bitcoin caps (those are rejected); a 16.8 vs 25 point calibration.
