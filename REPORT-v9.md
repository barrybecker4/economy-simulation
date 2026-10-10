# REPORT-v9: barrybecker4/economy-simulation, v9 (ba893c2 "4 fixes") vs v8 (65bef47)

Written Fri Oct 9 2026, ~1:50 PM PT. The repo-v9 clone is read-only: nothing was committed or pushed.

**Method** (same as before):
- 500 households / 50 firms / 3 banks, 240 months, AI off.
- Headline E1/X1/E1L runs: 20 seeds. Probes: 5–10 seeds; n is noted per row.
- S0–S3 keep their v1–v6 meaning. M = monetary.json as shipped. D = registry defaults.

## Verdict

**All three target items work as intended:**
- (A) No more zero-median-consumption runs.
- (B) S2 money is capped at about 2.4×.
- (C) The fiat wage spiral is gone, and M now runs with firm-level hiring on.

**But v9 adds a serious regression.**
- In goods.ts `excessDemandRatio`, the new stockout lift is combined as `Math.max(fromCapacity, lift)`, where `lift = 0` whenever `fromCapacity < 0`.
- So **excess demand can no longer go negative, and prices cannot fall in a glut.**
- With trendWeight 0 structures (S1, S3, D, M) under bitcoin:
  - CPI is about 0%/yr instead of −3.5 to −4%.
  - Inventory piles up to roughly one month of capacity.
  - Real GDP falls. The bitcoin − fiat GDP gap goes from −3.7% to −23.5% (S3), −2.5% to −20.2% (D) and −3.0% to −43.7% (M).
- **The regime comparison is not valid on v9 as shipped** for S1, S3, D and M. S0 and S2 (trendWeight 1) are unaffected.
- A one-line patch (`P_EXCESS_SIGN`, in patched-v9: keep the negative ratio when `fromCapacity < 0`) restores falling prices and puts the bitcoin GDP gap back at about +1% (10 seeds). The fix belongs in the repo.

## 1. Diff 65bef47..ba893c2 (19 files, +397/−71)

| area | change |
|---|---|
| goods.ts + rationing.ts | Two-pass shopping: plan every household's spendable budget, then scale all by `rationScale = min(1, stockValue/desired)` before the walk. `unmetGoodsDemand = desired − spent`. `excessDemandRatio = max(fromCapacity, fromCapacity ≥ 0 ? unmet/(spent+unmet) : 0)` ← **bug: the floor is 0**. |
| central-bank.ts | Stimulus fades linearly as the money multiple goes from 1 to 3 (`STIMULUS_MONEY_CAP = 3`) and stops at 3× opening deposits. |
| labor.ts | Wage damping now triggers on any fiat inflation overshoot (the 1.25× money gate is removed). `wageHiringScale` is capped at 1 under fiat when inflation > target. `workersForSales` ratio floor goes 0.5 → 0.75. `refreshExpectedSales` adds unmet units (except during a demand contraction) and floors expected sales at 0.75 × capacity. `hireToUnderstaffed` fills up to the aggregate floor. |
| monetary.json | `labor.firmLevelHiring` "off" → **"on"** (unpinned). |
| tests | consumption-gap.test.ts, rationing.test.ts, preset-stability updated. |

## 2. Per-item verdicts (v8 → v9)

**A. Shortages / zero median consumption — FIXED**
- Zero-median runs:
  - E1 S2 fiat: 14/40 → **0/40**.
  - X1 M hoarding-3 fiat: 6/20 → **0/20**.
  - X1, all M variants: 12 → 0.
  - S2 fiat demand probe: 6/6 → **0/6**; median consumption 0 → 0.716.
- S2 fiat demand, seed 1, at month 240:
  - Households buying nothing: 376/500 → 4/500.
  - Median deposits: 11.5k → 1.1k.
  - Real GDP: 625 → 680.
  - Price level: 143 → 151.
  - Unmet demand is about 1.6% of spend.
- Inventory still clears to 0 in fiat (sensible: demand ≥ capacity).
- **Caveat:** the new stockout price lift causes the regression described below.

**B. S2 stimulus runaway — FIXED (cap); stimulus is still ineffective**
- S2 fiat money multiple at month 240:

  | run | v8 | v9 | v9, stimulus 0 |
  |---|---|---|---|
  | calm | 4.81× | **2.38×** | 2.37× |
  | −15% demand shock | 10.3× | **2.25×** | — |
  | +15% boom | 9.75× | **2.08×** | — |

- In v9, stimulus 1.75 vs 0 makes no difference to unemployment: calm 6.48% vs 6.49%; demand 5.67% vs 5.70%; boom 7.05% vs 7.05%.
- So **stimulus now neither runs away nor helps.** Secular growth already pushes money near 2.4×, so the fade factor is about 0.3, and the deadband filters the rest.
- S2 fiat unemployment did fall, 10.3% → 6.4%, but that came from the hiring floor, not stimulus.
- In M, stimulus 1.75 vs 0 also does nothing for unemployment (5.6% vs 5.3% calm).

**C. Fiat wage spiral / firm-level hiring — FIXED for fiat; PARTIAL for bitcoin**
- M fiat with firm-level hiring on (6 seeds):

  | setting | v8 | v9 |
  |---|---|---|
  | elasticity 0 | 12.35× money, 23.0% CPI, 19.1% u | **1.37×, 4.8%, 6.7%** |
  | rigidity 0 | 1.95×, 9.1%, 9.1% | **1.38×, 4.0%, 6.2%** |

- The preset now **unpins** firm-level hiring (on). M fiat as shipped: 5.5% unemployment, 3.7% CPI.
- **The damping triggers.** In months with trailing CPI above target, nominal wage growth falls from 6.0–14.4%/yr (v8) to 0.3–1.0%/yr (v9).
  - Those are 46–67% of months, so real wages fall about 3%/yr in them.
  - The damping goes to 0 once inflation reaches 2× target.
  - This may be too strong. It also cuts M fiat median consumption from 0.586 to 0.521.
- M bitcoin, firm-level hiring on vs off:

  | | firm-level hiring on | firm-level hiring off |
  |---|---|---|
  | v8 | 18.2% u, 28.3 failures | 7.4% u, 7.3 failures |
  | v9 | **9.8% u, 17.8 failures** | 5.7% u, **19.8 failures** |

  - The firm-level hiring penalty is halved but still about +4 pp.
  - Bank failures with hiring off rose from 7.3 to 19.8, because of the price-floor bug. With P_EXCESS_SIGN, M bitcoin unemployment is 8.2% with 23.6 failures.

## 3. Headline table (20 seeds), bitcoin − fiat

Cells are median consumption at month 240 % / unemployment pp over years 2–20 / real GDP % over years 2–20.

| row | v8 | **v9** | v9 + P_EXCESS_SIGN (10 seeds, base probe) |
|---|---|---|---|
| S0 | −40.4 / +1.07 / +0.4 | **−31.5 / +0.91 / +0.3** | −34.4 / +0.94 / −0.7 |
| S1 | −31.6 / +2.37 / −1.5 | **−45.8 / +0.89 / +0.8** | −25.8 / +2.16 / −0.6 |
| S2 | −35.9 / +8.86 / −16.3 | **−32.0 / +2.75 / −17.3** | −33.1 / +3.22 / −13.7 |
| S3 | −31.3 / +5.53 / −3.7 | **−42.9 / +4.42 / −23.5** | −28.6 / +2.10 / +1.0 |
| S3 hoarding 3 | −29.0 / +11.3 / −6.8 | **−44.6 / +4.83 / −29.6** | – |
| M | −36.3 / +2.22 / −3.0 | **−55.9 / +4.58 / −43.7** | +2.4 / +3.29 / +1.2 |
| M hoarding 3 | −26.1 / +3.33 / +2.7 | **−55.8 / +4.25 / −50.8** | – |
| D | −31.8 / +5.58 / −2.5 | **−39.5 / +4.36 / −20.2** | −31.8 / +2.07 / +1.4 |

(The patch column uses the probe's GDP window, months 60–144, and 10 seeds; the v8 base probe on the same basis is in results-v9/excess_sign_patch.txt.)

v9 levels, fiat / bitcoin:

| row | unemployment % | CPI %/yr | real GDP | median consumption |
|---|---|---|---|---|
| S0 | 5.1 / 6.0 | +1.85 / −1.15 | 680 / 641 | 0.689 / 0.469 |
| S1 | 4.8 / 5.7 | +2.9 / −0.1 | 665 / 653 | 0.750 / 0.403 |
| S2 | 6.6 / 9.4 | +1.9 / −1.1 | 676 / 475 | 0.713 / 0.485 |
| S3 | 4.9 / 9.3 | +3.0 / −0.1 | 663 / 412 | 0.751 / 0.423 |
| M | 5.2 / 9.8 | +3.5 / −0.1 | – | 0.553 / 0.242 |
| D | 5.0 / 9.4 | +3.0 / −0.8 | 680 / 450 | 0.760 / 0.458 |

**Did the consumption gap shrink toward the GDP gap?**
- **Only in S0** (consumption −40 → −31%; GDP about 0) **and S2** (−36 → −32%; GDP −17%).
- In S1, S3, D and M the two gaps converged the wrong way: GDP collapsed toward consumption because of the price-floor bug.
- With the patch:
  - M's gap closes (+2.4% consumption, +1.2% GDP).
  - S1, S3 and D still show −26 to −32% consumption against about +1% GDP.
- So the consumption/output disconnect remains outside M.
- E1/X1/E1L: 1,340 + 460 + 440 runs, 0 errors, 0 zero-median runs.
- M bimodality (X1, M hoarding 0): mean −55.9%, SD 5.8, share > 0 is 0 (v8: −36.3%, SD 6.9).

## 4. New issues

1. **Excess-demand floor bug (critical).**
   - The location is above.
   - The bitcoin price level stays flat (S3 seed 1: P 120 → 118 over 20 years; v8 108 → 54).
   - Inventory grows to about 616 units ≈ capacity, sales drop to about 425, and bank failures rise (M bitcoin 7.7 → 17.8; S1/S3/D bitcoin 0.1–1.4 → 2.5–2.9).
   - The fiat side shifts too: S3/D fiat CPI goes from 4.4% / 6.1% to 2.6% / 2.8%.
   - Patch verified (results-v9/excess_sign_patch.txt, diag_btc_gdp*.txt).
2. **The expected-sales floor (0.75 × capacity in all regimes) mutes demand shocks.**
   - S2 fiat demand shock: GDP loss 14.3% → 6.3%, Δu +8.8 → +2.5 pp.
   - S2 fiat average unemployment over years 2–20 after a −15% demand shock (5.7%) is lower than in calm runs (6.5%).
   - Firms stop shedding labour in slumps; the 0.75 floor is a strong assumption.
3. **The fiat hiring cap plus wage damping worsen supply shocks.** S2 fiat supply-shock GDP loss: 10.7% → 18.5% (with stabilizer 8.0% → 15.9%). M fiat supply: 1.0% → 2.7% loss, Δu +0.2 → +2.6 pp.
4. **Wage freeze under fiat** whenever inflation ≥ 2× target, with real-wage erosion of about 3%/yr in those months. M fiat CPI rose from 2.0–2.2% to 3.5%.
5. **Stimulus is now inert** at the defaults (item B).
6. **Supply-shock signs.**
   - Fixed: S0 fiat Δu is now +0.94 (v8 −1.07).
   - Still wrong: S2 bitcoin supply-shock Δu is −3.0 pp (v8 +0.8), and M bitcoin −0.4.
7. **M bitcoin credit-shock GDP oddity resolved:** −11.5% → +0.3%.
8. **S0 bitcoin bank failures 0 → 3.6** (10 seeds). S0 is unaffected by the price bug, so this likely comes from the rationing or the hiring floor. Not investigated.

E4 table (results-v9/E4_shock_table.txt), months 60–84. Cells are GDP loss % / Δu pp, v8 → v9:

| row | v8 | v9 |
|---|---|---|
| S0 fiat demand | 7.3 / +6.0 | 8.0 / +6.0 |
| S0 bitcoin demand | 1.7 / +6.0 | 1.7 / +6.0 |
| S0 fiat supply | 1.1 / −1.1 | 1.2 / +0.9 |
| S2 fiat demand | 14.3 / +8.8 | 6.3 / +2.5 |
| S2 bitcoin demand | −2.7 / +11.0 | −7.5 / +4.2 |
| S2 fiat supply | 10.7 / +0.6 | 18.5 / +0.2 |
| S2 bitcoin supply | 13.3 / +0.8 | 12.8 / −3.0 |
| M fiat demand | −0.6 / +3.3 | 0.8 / +5.5 |
| M bitcoin demand | −3.3 / +5.1 | −4.1 / +4.6 |
| M fiat supply | 1.0 / +0.2 | 2.7 / +2.6 |
| M bitcoin supply | −1.4 / +1.3 | 8.9 / −0.4 |
| M bitcoin credit | −11.5 / +2.7 | 0.3 / +0.1 |

## 5. Skipped

- E6, E8, E9, X2, X3 and the validity suite: the core is not clean because of the price-floor regression.
- The full 20-seed headline suite on the patched build: only a 10-seed base probe was run.
- A stimulus probe on the patched build was started, but its results were not checked or used.

## 6. Remaining fixes, in priority order

1. **Fix `excessDemandRatio`:** `fromCapacity >= 0 ? max(fromCapacity, stockoutShare) : fromCapacity`. Add a test that bitcoin/trendWeight-0 prices fall with excess inventory. Then rerun the headline suite.
2. **Revisit the 0.75 × capacity expected-sales floor:** it mutes demand slumps and makes post-slump unemployment lower than calm. Make it regime-neutral and smaller, or decay it.
3. **Soften the fiat wage damping and hiring cap:** for example, damp only the money-financed part, or floor the scale at about 0.5. Today wages freeze at inflation ≥ 2× target and fiat supply-shock losses nearly double.
4. **Decide what stimulus is for.** At the defaults it is now inert. Either lower the secular base, raise the cap, or document it as off in practice.
5. **The consumption/output disconnect in S1, S3 and D** (−26 to −32% consumption vs about +1% GDP after the patch): trace it to the v7 default package (stabilizer, tenureChoice) as planned in v8.
6. **M bitcoin firm-level hiring penalty** (+4 pp) and bank failures (18–24); S0 bitcoin failures 0 → 3.6.
7. **Supply-shock unemployment sign** under bitcoin (S2 −3.0 pp).

## Files

- **REPORT-v9.md**
- **charts-v9/**
  - `v1_v2_v3_v4_v5_v6_v7_v8_v9_gap.png`: v9 in gold.
  - `v9_fix_checks.png`: items A/B/C plus the GDP effect of the price-floor bug and the patch.
- **results-v9/**
  - `compare_v1_v2_v3_v4_v5_v6_v7_v8_v9.json`, `compare_v1_v9.txt`
  - `E1_regime_structure.txt`, `X1_monetary_preset.txt`, `E1L_legacy_defaults.txt`
  - `E4_shock_table.json`, `E4_shock_table.txt`
  - `M_bimodality.json`
  - `V9_probes.md`
  - `wage_flh_v8.txt`, `wage_flh_v9.txt`
  - `diag_zero_S2_demand_v9.txt`
  - `diag_btc_gdp.txt`, `diag_btc_gdp_patched.txt`
  - `excess_sign_patch.txt`
- **data-v9/**: the jsonl runs and review/*.json.
- **patched-v9/**: the P_EXCESS_SIGN patch in dist/sim/goods.js.
- **scripts-v9/**
  - `probe_wage_flh_v9.mjs`, `diag_zero_v9.mjs`, `diag_btc_gdp_v9.mjs`
  - `chart_v9.py`
  - `probes_v9.sh`, `probes_v9p.sh`
