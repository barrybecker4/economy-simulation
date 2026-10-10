# REPORT-v10: barrybecker4/economy-simulation, v10 (ee3e4c3 "Pricing, sales floor, wage damp, stimulus") vs v9 (ba893c2)

Written Fri Oct 9 2026, ~2:20 PM PT. The repo-v10 clone is read-only: nothing was committed or pushed.

Method:
- 500 households / 50 firms / 3 banks, 240 months, AI off.
- Headline E1/X1/E1L and E4 use 20 seeds. Probes use 5–10 seeds.
- S0–S3 keep their v1–v6 meaning; M = monetary.json (firm-level hiring on); D = registry defaults.
- The validity suite was run this round.

## Verdict

**The v9 price-floor regression is fixed.** v10 matches our P_EXCESS_SIGN patch to the reported precision:
- S3 seed-1 bitcoin price path is identical: P 108 → 47, GDP 636.
- 10-seed CPI matches: S1 −3.71, S3 −3.37, M −6.24, D −3.60 %/yr.

**The headline is now credible again:**
- Bitcoin − fiat real GDP gaps are within ±2% everywhere except S2 (−17%).
- The consumption gap moved toward the GDP gap:

  | row | consumption gap, v9 → v10 | GDP gap, v10 |
  |---|---|---|
  | S1 | −46 → −23% | −1.5% |
  | S3 | −43 → −23% | −2.0% |
  | D | −40 → −22% | −0.8% |
  | M | −56 → +4% | 0.0% |

- S0 (−31% vs +0.2%) and S2 (−32% vs −17%) are unchanged.

**Still open:**
- Stimulus still doesn't lower unemployment.
- Demand slumps are still muted in S2, and post-shock unemployment is still below calm. Removing the 0.75 sales floor did not change this.
- The S2 fiat supply-shock GDP loss got worse (18.5 → 22.4%), and the unemployment change after a supply shock now has the wrong sign in S0 and S2 fiat.
- M bitcoin is a debt-deflation economy: CPI −6.4%/yr, ~25 bank failures, ~160 foreclosures, and M bimodality is back (SD 18).
- Validity T4 shows a new 20-unit accounting residual in the M bitcoin gradual transition.

## 1. Diff ba893c2..ee3e4c3 (15 files, +208/−73)

| area | change |
|---|---|
| goods.ts | `excess = fromCapacity < 0 ? fromCapacity : max(fromCapacity, stockoutShare)`, so the ratio can go negative again. New test in rationing.test.ts: "cuts the price level when inventory piles up against soft demand" (S3-like, fiat, inventory 500/firm). |
| labor.ts | The 0.75 sales/capacity floor is removed entirely. The `workersForSales` ratio clamp is now [0, 1.5], down from [0.75, 1.5]; it was [0.5, 1.5] before v9. The expected-sales floor is removed. The fiat hiring cap under inflation overshoot is removed. Wage damping: `fiatWageCatchUpScale = clamp(1 − 0.5·overshoot/target, 0.5, 1)`, so it never freezes. |
| central-bank.ts | `stimulusMoneyFade`: full strength up to 2× opening money, then a linear fade to 0 at 3×. |
| tests | phase18 (demand-led output below capacity in a soft phase; post-slump unemployment ≥ calm − 2 pp), phase68/70, preset-stability (fade 1/1/0.5/0 at 1/2/2.5/3×; stimulus raises money at m36 and lowers peak unemployment in a 40-household M fiat run). |

## 2. Per-item verdicts (v9 → v10)

**(1) excessDemandRatio / glut pricing — FIXED (a test was added)**
- S3 seed 1, bitcoin:
  - Price level 120 → 118 over 20 years (v9) became **108 → 47** (v10), identical to P_EXCESS_SIGN.
  - Inventory at m239: 616 units against capacity 618 (v9) became **7** against 589.
  - Real GDP 425 → **636**.
- M seed 1, bitcoin: P 108 → 27 (−6.6%/yr), inventory 0.
- 10-seed bitcoin CPI exactly equals the patch.

**(2) 75% sales floor — REMOVED, but slumps are still muted (PARTIAL / not fixed)**
- E4, S2 fiat −15% demand shock: GDP loss 6.3% → **6.1%**; Δu over m60–84 +2.5 → **+2.6 pp** (v8: 14.3% / +8.8 pp). Peak unemployment is 23.3%, so there is a short spike followed by a fast rebound.
- Post-shock vs calm, S2 fiat (5 seeds): unemployment over years 2–20 is **5.38% vs 6.56%**, and over m60–96 6.54% vs 7.02%. Post-shock is still below calm.
- S0 is unchanged (7.6% / +6.0 pp). M fiat demand: −1.6% GDP / +3.3 pp.
- The muting does not come from the floor. The base runs are identical with and without it. Likely suspects are the unmet-demand term in expected sales and the rationing; not isolated.

**(3) Fiat wage freeze / hiring cap — FIXED for M; REGRESSED for S2 fiat supply shocks**
- M fiat with firm-level hiring on, no spiral (6 seeds):

  | setting | v9 | v10 |
  |---|---|---|
  | elasticity 0 | 1.37× money, 4.8% CPI, 6.7% u | **1.21×, 3.5%, 6.0%** |
  | rigidity 0 | 1.38×, 4.0% CPI | **0.94×, 2.3%, 5.1% u** |

- Wage growth in months with inflation above target: 0.3–1.0 → **3.8–8.5%/yr**, so the freeze is gone.
- Supply shocks, GDP loss / Δu:

  | row | v9 | v10 |
  |---|---|---|
  | M fiat | 2.7% / +2.6 pp | **0.3% / +0.7 pp** (good) |
  | S2 fiat | 18.5% / +0.15 | **22.4% / −2.9 pp** (worse) |
  | S2 fiat + stabilizer | 15.9% | **21.7%** |
  | S0 fiat | Δu +0.9 | **Δu −1.8** (wrong sign again) |

**(4) Stimulus — NOT FIXED (still no unemployment benefit); cap holds**
- Unemployment, stimulus 1.75 minus stimulus 0 (5 seeds, years 2–20):

  | run | difference |
  |---|---|
  | S2 calm | 0.00 pp |
  | S2 demand | −0.01 pp |
  | M calm | +0.16 pp |
  | M demand | +0.09 pp |

- In M, money with stimulus is *lower* (1.05× vs 1.61× calm), because the symmetric rule withdraws money whenever unemployment is below the natural rate.
- S2 fiat money: 2.36× calm, 2.27× demand, 1.99× boom. Still capped.
- After the demand shock, S2 money growth over m60–96 is 1.26× vs 1.20× at stimulus 0. Stimulus prints a little, with no unemployment effect.

**v9-fix regression checks**
- Zero-median runs: **0** in E1, X1 and E1L (v9: 0). OK.
- S2 money cap: OK, as above.
- M bitcoin with firm-level hiring on vs off: unemployment **8.4% vs 8.3%** (v9: 9.8% vs 5.7%). The hiring penalty is gone, but **bank failures rose to 24.7** (v9 17.8, v8 7.3) and money fell to 0.46×.
- S0 bitcoin bank failures are still **3.6** (v8: 0), identical to v9.
  - Defaults are 15× v8 (7.6k → 112k), foreclosures 2.5 → 44, first failure around m130–205 in every seed.
  - S0 has firm-level hiring off and trendWeight 1, so the cause is a v9 change outside pricing (rationing or the unmet-demand sales term). Not isolated.
- Bitcoin supply-shock unemployment sign:
  - **M bitcoin is now correct: +1.44 pp** (v9 −0.42).
  - **S2 bitcoin is still wrong: −3.03 pp**, and S0 bitcoin −1.62 pp.

## 3. Headline table (20 seeds), bitcoin − fiat

Cells are median consumption at m240 % / unemployment pp over years 2–20 / real GDP % over years 2–20.

| row | v9 | **v10** | Δ consumption gap minus GDP gap (v9 → v10) |
|---|---|---|---|
| S0 | −31.5 / +0.91 / +0.3 | **−30.8 / +1.00 / +0.2** | −31.8 → −31.0 |
| S1 | −45.8 / +0.89 / +0.8 | **−22.9 / +2.57 / −1.5** | −46.6 → −21.4 |
| S2 | −32.0 / +2.75 / −17.3 | **−32.4 / +2.78 / −17.1** | −14.7 → −15.3 |
| S3 | −42.9 / +4.42 / −23.5 | **−23.1 / +2.41 / −2.0** | −19.4 → −21.1 |
| S3 hoarding 3 | −44.6 / +4.83 / −29.6 | **−23.6 / +2.66 / −0.9** | −15.0 → −22.7 |
| M | −55.9 / +4.58 / −43.7 | **+3.9 / +3.57 / 0.0** (CI −20 to +32) | −12.2 → +3.9 |
| M hoarding 3 | −55.8 / +4.25 / −50.8 | **+11.5 / +4.66 / +3.7** (CI −20 to +55) | −5.0 → +7.8 |
| D | −39.5 / +4.36 / −20.2 | **−21.8 / +2.74 / −0.8** | −19.3 → −21.0 |

v10 levels, fiat / bitcoin:

| row | unemployment % | CPI %/yr | real GDP | median consumption |
|---|---|---|---|---|
| S0 | 5.0 / 6.0 | +1.9 / −1.1 | 679 / 641 | 0.682 / 0.469 |
| S1 | 4.5 / 7.0 | +2.4 / −3.8 | 666 / 624 | 0.791 / 0.611 |
| S2 | 6.6 / 9.4 | +1.9 / −1.1 | 670 / 475 | 0.706 / 0.477 |
| S3 | 4.6 / 7.0 | +1.9 / −3.8 | 660 / 598 | 0.762 / 0.579 |
| M | 4.7 / 8.3 | +1.7 / −6.4 | – | 0.559 / 0.573 |
| D | 4.2 / 7.0 | +2.9 / −3.7 | 667 / 625 | 0.781 / 0.610 |

Reading the tables:
- In absolute terms the consumption gap shrank by about 20 pp in S1, S3, S3 hoarding 3 and D, and by 60 pp in M, where it now matches GDP.
- S1, S3 and D still sit about 21 pp below their GDP gap: a consumption/output disconnect of the v7 default package that stays unexplained.
- S0 and S2 are unchanged from v9.
- E1/X1/E1L: 2,240 runs, 0 errors, 0 zero-median runs.
- M bimodality (X1 M hoarding 0, per seed): mean +3.9%, median +1.4%, **SD 18.1**, share > 0 = 0.50, corr(failures) 0.49. The v9 values were −55.9 / SD 5.8. Bimodality has returned, driven by bank failures.

## 4. E4 shocks (20 seeds, m60, rigidity 0.7; GDP loss % / Δu pp over m60–84, v9 → v10)

| row | v9 | v10 |
|---|---|---|
| S0 fiat demand | 8.0 / +6.0 | 7.6 / +6.0 |
| S0 bitcoin demand | 1.7 / +6.0 | 1.7 / +6.0 |
| S0 fiat supply | 1.2 / +0.9 | 0.7 / **−1.8** |
| S0 bitcoin supply | 0.9 / −1.6 | 0.9 / −1.6 |
| S2 fiat demand | 6.3 / +2.5 | 6.1 / +2.6 |
| S2 bitcoin demand | −7.5 / +4.2 | −7.5 / +4.2 |
| S2 fiat supply | 18.5 / +0.2 | **22.4 / −2.9** |
| S2 fiat+stab supply | 15.9 / +0.5 | 21.7 / −1.6 |
| S2 bitcoin supply | 12.8 / −3.0 | 12.9 / −3.0 |
| M fiat demand | 0.8 / +5.5 | −1.6 / +3.3 |
| M bitcoin demand | −4.1 / +4.6 | 0.5 / +5.5 |
| M fiat supply | 2.7 / +2.6 | 0.3 / +0.7 |
| M bitcoin supply | 8.9 / −0.4 | 1.2 / **+1.4** |
| M bitcoin credit | 0.3 / +0.1 | −5.1 / +4.8 |

Full table: results-v10/E4_shock_table.txt.

## 5. Validity suite (v10; results-v10/validity.md)

The suite ran without crashing, including the M bitcoin gradual transition that crashed in v7.

- **T4 conservation:** residuals are 0 to 7e-9, **except M bitcoin gradual transition: 20**.
  - This is a new, real leak; it was a crash in v7, and v8/v9 only checked that the books close.
  - "Cash home buys" also show paid ≠ firm gain in the M bitcoin configs (e.g. 4,268 → 6,282).
- **T1 helicopter +50%:**
  - Bitcoin CPI at +96 months: S1 +62%, S3 +59%, M +72% (fiat: +12%, +11%, +2%).
  - S2 bitcoin GDP +31% at +96 months.
  - The fiat response is small because the rule offsets it; the bitcoin response is large. This was already in v7 (M bitcoin +77.6%).
- **T2 +15% demand impulse:** CPI +28.5% within 11 months in S0 and S2 (trendWeight 1); unemployment −5 to −10 pp.
- **T3 Phillips correlation:** S0 −0.48, **S2 −0.01** (v7 −0.45). The S2 Phillips relation is gone.
- **T5 steady-state unemployment, fiat / bitcoin:**

  | structure | fiat | bitcoin |
  |---|---|---|
  | S0 | 5.1% | 6.1% |
  | S1 | 5.0% | 7.2% |
  | S2 | 6.5% | 10.1% |
  | S3 | 5.0% | 7.1% |
  | M | 4.8% | 7.5% |

  Within-run SD is 0.06–1.7 pp.
- **T6 money growth vs inflation:** S1 fiat with moneyGrowth 0.05 shows money growth −2.9% and CPI −3.3%. That is odd and needs a look.
- **T8 first-landing incidence:** proRataDeposits 80% to Q5 households; assetPurchase lands 100% on households.
- **T10:** M bitcoin has 165.6 foreclosures and 25.4 failures per run. With resolution off: aggregate bank equity < 0 in 91% of ticks, minimum −5,344.
- **T11 gradual transition:** smooths the Gini jump (one-step 0.57 → 0.63 at m11; gradual 0.57 → 0.61 by m24).

## 6. New issues

1. **M bitcoin debt deflation:** CPI −6.4%/yr, money 0.46×, 24.7 failures, about 160 foreclosures, nominal house price 0.33×. M bimodality is back (SD 18, corr(failures) 0.49).
2. **S2 fiat supply shocks:** GDP loss 22.4% with Δu −2.9 pp. Unemployment *falls* while output drops 22%.
3. **Demand slumps in S2 are a spike-and-overshoot:** post-shock unemployment ends below calm.
4. **Stimulus is inert** and, in M, mildly contractionary (the symmetric withdrawal below the natural rate).
5. **T4 accounting residual of 20** in the M bitcoin gradual transition; cash home buys don't reconcile.
6. **The S2 Phillips correlation collapsed** (−0.01).
7. **S0 bitcoin defaults and failures** introduced in v9 (3.6 failures, 15× defaults) are not addressed.

## 7. Remaining fixes, in priority order

1. **M bitcoin debt deflation and bank failures:** check why M bitcoin CPI is −6.4%/yr (v8 −4.1) and money 0.46×; look at the mortgage/foreclosure channel and the housing premium. Resolve the S0 bitcoin failure increase from v9.
2. **Fix the T4 residual** in the gradual transition, and reconcile cash home buys.
3. **S2 supply shock:** find why unemployment falls during a 22% output loss (likely the productivity-impulse hiring scale interacting with firm-level hiring); fix the supply-shock Δu sign in S0, S2 fiat and S2 bitcoin.
4. **Demand-slump response:** remove the overshoot below calm (check the unmet-demand term in expected sales and the shed/hire asymmetry); restore the S2 Phillips relation.
5. **Stimulus:** make it effective in slumps (it only matters if slumps create a sustained unemployment gap; after fix 4 this may follow), or make withdrawal asymmetric so it isn't contractionary in normal times.
6. **The remaining ~21 pp consumption/output gap** in S1, S3 and D, and the S0/S2 gaps: attribute to the v7 default package (stabilizer, tenureChoice).
7. **Bitcoin helicopter CPI response** (+60–72%) and the S1 fiat mg0.05 negative money growth (T6).

## Skipped

- E6, E8, E9, X2 and X3: the core is not clean (items 2–4, M bitcoin failures).

## Files

- **REPORT-v10.md**
- **charts-v10/**
  - `v1_v2_v3_v4_v5_v6_v7_v8_v9_v10_gap.png`: v10 in brown.
  - `v10_fix_checks.png`: items 1–4 plus the v9-fix regression checks.
- **results-v10/**
  - `compare_v1_v2_v3_v4_v5_v6_v7_v8_v9_v10.json`, `compare_v1_v10.txt`
  - `E1_regime_structure.txt`, `X1_monetary_preset.txt`, `E1L_legacy_defaults.txt`
  - `E4_shock_table.json`, `E4_shock_table.txt`
  - `M_bimodality.json`
  - `V10_probes.md`
  - `wage_flh_v10.txt`
  - `diag_btc_price_v10.txt`
  - `diag_zero_S2_demand_v10.txt`
  - `validity.md`
- **data-v10/**: jsonl runs, review/*.json, validity.json.
- **scripts-v10/**: `chart_v10.py`, plus round-9 scripts repointed to repo-v10.
