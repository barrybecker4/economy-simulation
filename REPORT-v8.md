# REPORT-v8: barrybecker4/economy-simulation, v8 (65bef47 / 2fe74df) vs v7 (d8ac6ca)

Written Fri Oct 9 2026, afternoon PT. The repo clone (`repo-v8`) is read-only: nothing was committed or pushed.

Method: same as earlier rounds. 500 households / 50 firms / 3 banks, 240 months, AI off (automatableShare 0.3 → 0.3).
- Headline E1/X1/E1L runs use 20 seeds.
- Probes use 5–10 seeds; the n is given in each row.
- S0–S3 keep their v1–v6 meaning:
  - S0 = trendWeight 1 / demandWeight 0 / firmLevelHiring off
  - S1 = 0 / 0 / off
  - S2 = 1 / 1 / on
  - S3 = 0 / 1 / on
- D = pure registry defaults. M = `scenarios/presets/monetary.json` as shipped.

## Verdict

**The regime comparison is valid again: the monetary rule now follows `regime.type`.**
- The v7 choiceSpeed bypass is gone. Runs at choiceSpeed 0 and 0.01 are bit-identical.
- Fiat money growth, crisis stimulus and the hybrid lender of last resort all run at the defaults.
- v8 at defaults reproduces our v7 choiceSpeed-0 numbers almost exactly for S0–S3 and D.
- The assetPurchase runaway is fixed. The fix is the unwind cap on excess reserves (ADR 0024), not the "reserve doubling" change.
- The v7 validity crash (gradual transition, bank books not closing) no longer reproduces.

**But two of the six fixes are only partial, and one is not fixed:**
- **(4) S2 stimulus.** It still lets money grow ~10× after a demand shock, with no unemployment benefit.
- **(5) Zero median consumption.** It is not fixed by the shuffle: 14/40 S2 fiat runs, and it has spread to 6/20 M hoarding-3 fiat runs.
- **(6) Wage spiral.** It still exists once firm-level hiring is on: 12× money, 23% CPI. It is only hidden in M because M now pins firmLevelHiring off.

**The headline result:**
- Median consumption gap: bitcoin is 26–45% below fiat in every structure.
- Unemployment and real GDP gaps are much smaller:
  - S0/S1: +1–2.4 pp unemployment, ±1.5% GDP.
  - S3: +5.5 pp, −3.7% GDP.
  - M: +2.2 pp, −3.0% GDP.
  - S2 is the exception: +8.9 pp, −16% GDP.
- So the consumption metric overstates the gap relative to output.
- With the v6 legacy pins (E1L), the same structures show gaps of 0 to ±8%.
- So the big consumption gap comes from the v7 default changes, not from the regime rules.

## 1. What changed (git diff d8ac6ca..65bef47: 23 files, +531/−108)

| area | change |
|---|---|
| central-bank.ts | `money.choiceSpeed` default 0.01 → 0. `setBlendedPolicy` removed: `onCentralBank` always branches on `params.regime` (fiat: setFiatPolicy + growFiatMoney + accommodateReserves; otherwise setMarketRate + hybrid supportInsolventBanks). updateMoneyChoice still moves currency shares, but no longer selects the rule. |
| monetary.json | Adds `money.choiceSpeed: 0` and `labor.firmLevelHiring: "off"`. |
| assetPurchase (ADR 0024) | Purchase: `addReserves(take)`, `bank.vault += take`, `economy.privateEquity += take` (a 1× reserve leg plus a vault/equity leg instead of the 2× booking). Unwind: `min(amount, excessReserveStock, vaultResidual)`, which is the excess-reserve cap we identified as the real fix in v7. |
| stimulus | Taper: `stimulusEffective = clamp(2 / max(totalDeposits/openingDeposits, 1), 0, 1)` once the lag is positive. `economy.openingDeposits` is set after capitalizeBanks. The slider is now validated to the range [0, 2]. |
| goods.ts | The household shopping order is shuffled each tick (`populationRng.fork('shop/'+tick)`). |
| labor.ts | Wage damping, fiat only, when wage growth is positive: if inflation exceeds target and moneyMultiple > 1.25, then growth *= clamp(1 − overshoot/target, 0, 1). |
| tests | choice-speed-regime.test.ts and preset-stability.test.ts. |

## 2. v7 fix list

| # | item | verdict | evidence (v7 → v8) |
|---|---|---|---|
| 1 | choiceSpeed bypass / regime rule decoupled | **FIXED** | cs0 and cs0.01 are identical in every metric (M, S0; 10 seeds each). M fiat: u 15.7% → **5.0%**, CPI −2.5% → **+2.0%**, money 0.56× → 1.15×, failures 17.2 → 3.1 (v7 cs0 was 8.0% / +6.7% / 1.62× / 4.4). X1 20 seeds: M fiat u 4.9%, CPI +2.2%. M hybrid failures 0.1 (bitcoin 7.7). E1 v8 matches v7 cs0 for S0–S3/D to within ~2 pp. |
| 2 | assetPurchase unwind / top-up runaway | **FIXED** (by the excess-reserve cap) | M fiat assetPurchase money 3,227× (v7 HEAD) → **1.29×**, CPI 54% → **5.2%/yr**. S3: 6,014× → **1.45×**, CPI 9.3%. Same scale as our v7 P_QE_EXCESS patch (1.49× / 8.3%). The new 1× reserve leg balances through vault/privateEquity, so the books close: 0 errors and no books-check crash in 84 qe/ratecap runs. In v7, the 1×-only patch broke the books at tick 0, so "reserve doubling" alone was not the bug; the cap is what fixes it. Residual: assetPurchase still adds +3 pp CPI over proRata in M (5.2% vs 2.1%) and +3.3 pp in S3 (9.3% vs 6.0%), with 1.0–2.5 more bank failures. |
| 3 | M preset pins firm-level hiring | **FIXED** (pinned off) | M Δu (bitcoin − fiat) 6.35 pp (v7 cs0) → **2.22 pp**. M fiat u 7.9% → 4.9%, M bitcoin 14.2% → 7.1%. With flh on in v8 M: bitcoin u 18.2%, 28 failures. The pin hides a firm-level-hiring problem in bitcoin rather than fixing it. |
| 4 | S2 stimulus runaway cap | **PARTIAL** | S2 fiat calm money 6.6× → **4.8×** (stim 0: 1.9×). After a −15% demand shock: 149–159× → **10.3×** (money doubles from m60 to m96). After a +15% boom: 9.7×. Unemployment is unchanged: calm 10.3% vs 10.3%, demand 15.0% vs 15.0% at stim 0, so the stimulus adds money with no real effect. The taper is soft: growth goes roughly linear above 2×, not capped. In M, money is 1.2× and harmless. Stimulus > 2 is now rejected by validation. |
| 5 | Shopping order / zero median consumption | **NOT FIXED** (order bias removed, rationing remains) | Zero-median runs: E1 S2 fiat **14/40** (v7 cs0 16/40). X1 M hoard3 fiat **6/20** (v7 cs0 2/20), plus 1 each in five other M fiat variants. S2 fiat demand probe: 6/6 at zero. Diagnosis, S2 fiat demand seed 1: inventory is 0, real GDP 625 (above pre-shock 506), median deposits up 21× to 11.5k, and **376/500 households buy nothing in the m240 tick**. Money greatly exceeds goods, and early shoppers in each tick take all the output; the shuffle only changes who misses out. |
| 6 | Fiat wage-price spiral (el 0 / low rigidity) | **PARTIAL** (masked in M) | M as shipped (flh off): el0 1.21× money, 3.5% CPI, u 6.0%; rig0 1.21×, 3.1%. With flh on (the v7 M setup): el0 **12.35×, 23.0% CPI, u 19.1%** (v7 34×, 27.9%, 20.5%); rig0 **1.95×, 9.1%, 9.1%** (v7 8.7×, 16.7%). The damping helps at rig0, but the el0 spiral survives because it only applies above a 1.25× money multiple. Most of the M improvement comes from the flh pin, not the damping (results-v8/wage_flh_attribution.txt). |
| + | v7 validity crash (M bitcoin gradual transition, books do not close) | **FIXED** | repro_gradual.mjs, seeds 1–5: v7 crashes on seeds 1 and 3 (ticks 127/133, gap ~3.5k–6k); v8 runs 5/5 OK. |

## 3. Headline table (20 seeds): bitcoin minus fiat

Cells are median real consumption at m240 % [5,95] / unemployment pp (yrs 2–20) / real GDP % (yrs 2–20).

| row | v6 | v7 default | v7 cs0 | **v8 default** | v8 legacy pins (E1L) |
|---|---|---|---|---|---|
| S0 | +8.4 / +1.12 / – | +37.0 / +0.90 / −0.8 | −41.4 / +0.97 / +0.5 | **−40.4 [−48.5,−28.0] / +1.07 / +0.4** | +7.9 / +1.02 |
| S1 | – | +2.3 / +0.68 / +3.9 | −33.3 / +2.33 / −1.8 | **−31.6 [−37.4,−20.1] / +2.37 / −1.5** | −1.4 / +1.40 |
| S2 | – | −13.2 / +1.77 / −11.8 | −25.5 / +8.08 / −16.0 | **−35.9 [−55.2,−3.3] / +8.86 / −16.3** | +1.1 / +0.61 |
| S3 | – | −7.3 / +0.22 / +1.8 | −34.7 / +5.25 / −3.9 | **−31.3 [−35.8,−24.1] / +5.53 / −3.7** | −2.3 / +1.51 |
| S3 hoard 3 | −23.5 / +18.0 / −15.0 | −6.8 / +1.47 / 0.0 | −28.5 / +11.1 / −6.3 | **−29.0 [−38.3,−15.1] / +11.3 / −6.8** | −3.3 / +5.71 |
| M hoard 0 | −24.6 / +2.16 / 0.0 | +3.4 / −2.15 / +4.5 | −24.6 / +6.35 / −6.6 | **−36.3 [−44.1,−25.1] / +2.22 / −3.0** | −26.4 / +2.17 |
| M hoard 3 | +11.3 / +3.07 / +0.9 | −9.8 / +8.85 / −3.7 | −24.2 / +21.1 / −10.5 | **−26.1 [−37.7,−10.7] / +3.33 / +2.7** | +7.8 / +3.94 |
| D (pure defaults) | – | −1.8 / +1.00 / +2.3 | −33.4 / +5.51 / −2.2 | **−31.8 [−43.3,−20.1] / +5.58 / −2.5** | – |

Levels, v8 defaults (fiat vs bitcoin):

| row | unemployment % (fiat / btc) | CPI %/yr (fiat / btc) | real GDP (fiat / btc) | median consumption (fiat / btc) |
|---|---|---|---|---|
| S0 | 5.0 / 6.0 | +1.9 / −1.2 | 680 / 658 | 0.674 / 0.398 |
| S1 | 4.6 / 7.0 | +3.1 / −3.8 | 672 / 632 | 0.809 / 0.552 |
| S2 | 10.9 / 19.7 | +1.7 / −1.3 | 629 / 436 | 0.477 / 0.399 |
| S3 | 7.4 / 12.9 | +5.3 / −3.6 | 651 / 617 | 0.777 / 0.533 |
| M | 4.9 / 7.1 | +2.2 / −4.0 | – | 0.583 / 0.368 |
| D | 7.2 / 12.7 | +6.1 / −3.4 | 623 / 590 | 0.750 / 0.509 |

Reading the tables:
- v8 ≈ v7 cs0 everywhere except M, where the firmLevelHiring pin shrinks Δu from 6.35 to 2.22 pp.
- The consumption gap (−26 to −45%) is far larger than the GDP gap (−3.7 to +0.4%) in S0, S1, S3, D and M.
- With the v6 legacy pins, the same structures give −3 to +8%.
- So the "bitcoin is a third poorer" headline is driven by the v7 default package (stabilizer, tenureChoice and others; see results-v7/gap_defaults_*.txt), plus a median-consumption metric affected by rationing. It is not driven by output.
- S2 is the only structure where real output collapses under bitcoin (−16%, u 19.7%).
- E1 runs 1,340, crashes 0. X1 and E1L also have 0 errors.

M bimodality (X1 M hoard 0, per-seed bitcoin − fiat consumption):

| version | mean | median | SD | share > 0 |
|---|---|---|---|---|
| v6 | −24.6 | −33.6 | 22.4 | 0.20 |
| v7 default | +3.4 | – | 7.7 | 0.75 |
| v7 cs0 | −24.6 | – | 8.5 | 0 |
| **v8** | **−36.3** | – | **6.9** | **0** |
| v8 legacy | −26.4 | – | 18.4 | – |

v8 is unimodal and negative. The v8 legacy row is bimodal again, with corr(failures) 0.93. Data: results-v8/M_bimodality.json.

Rebate (P_NO_REBATE patch, 10 seeds, bitcoin − fiat consumption / Δu):

| structure | rebate on | rebate off |
|---|---|---|
| S0 | −46.6% / +0.95 pp | −46.8% / +0.95 pp |
| S1 | −31.8% / +2.34 pp | −31.0% / +2.31 pp |
| S2 | −38.8% / +10.8 pp | −39.2% / +10.9 pp |
| S3 | −34.4% / +5.79 pp | −35.5% / +3.63 pp |
| M | −37.2% / +2.19 pp | −33.1% / +2.23 pp |
| D | −27.2% / +5.74 pp | −37.6% / +3.92 pp |

- The rebate does not explain the consumption gap.
- It accounts for about 2 pp of the unemployment gap in S3 and D.

## 4. New artifacts and observations (v8)

1. **Stimulus is pure money printing in S2.** At the default 1.75, money is 4.8× calm and 10× after a shock, with the same unemployment as at stimulus 0. The taper is not a cap. Median consumption hits zero in all six S2 fiat demand-shock runs (it does not at stim 0), so the stimulus itself creates the zero-consumption artifact by flooding deposits.
2. **Excess money is rationed, not priced.** CPI barely moves (S2 fiat +1.7%/yr at 10× money). Price formation does not respond to deposit overhang, so excess money shows up as goods-market rationing (inventory 0, ~75% of households buying nothing in a tick).
3. **The M firmLevelHiring pin is a mask.** With flh on in v8 M, bitcoin u is 18.2% with 28 failures, and fiat el0 still spirals. The preset is now stable because the problem mechanism is off.
4. **Wage damping is gated on a 1.25× money multiple,** so it does not act on spirals that start below that level. No evidence that it suppresses legitimate catch-up in the default runs: M fiat wage growth 2.9–3.1%/yr.
5. **M bitcoin housing premium 0 is fragile:** money 0.26×, 38 failures, CPI −8.4%/yr (m7 probe, 6 seeds). Premium ≥ 0.25 gives 0.73×, 8 failures.
6. **assetPurchase still costs about 3 pp of CPI** over proRataDeposits in fiat M and S3, with more bank failures. That is plausible, but it is a level effect worth documenting.
7. **The consumption metric is now the main validity problem for headlines.** The bitcoin − fiat gap is −40% in S0 while unemployment is +1 pp and GDP +0.4%. Use unemployment and GDP as primary headline metrics until median consumption is fixed (rationing plus the v7 default package).

## 4b. E4 shocks (v8, 20 seeds, shock at m60, rig 0.7; results-v8/E4_shock_table.txt)

GDP loss is over m60–84 against the no-shock baseline. Δu is the unemployment change over m60–84 (pp).

| shock | v8 fiat | v8 bitcoin | v8 hybrid | v7 cs0 fiat / bitcoin |
|---|---|---|---|---|
| S0 demand | 7.3% / +6.0 | 1.7% / +6.0 | – | 7.8% / 1.7% GDP |
| S0 supply | 1.1% / −1.1 | 0.9% / −1.6 | – | – |
| S2 demand | 14.3% / +8.8 | −2.7% / +11.0 | – | 16.5% / −2.6% GDP |
| S2 supply | 10.7% / +0.6 | 13.3% / +0.8 | – | 10.3% / 13.4% GDP |
| M demand | −0.6% / +3.3 | −3.3% / +5.1 | −3.9% / +3.5 | −0.3% / +4.7; 4.5% / +7.6 |
| M supply | 1.0% / +0.2 | −1.4% / +1.3 | −1.6% / +1.4 | 1.5% / +2.0; 0.2% / −4.9 |
| M credit | −3.1% / −0.6 | **−11.5%** / +2.7 | −9.3% / +2.4 | −4.5% / −1.1; −0.9% / +5.7 |

- E4 is essentially unchanged from v7 cs0 in S0 and S2.
- **Still open:** fiat loses more GDP than bitcoin in S0 and S2 demand slumps (7.3% vs 1.7%; 14.3% vs −2.7%), and supply shocks still lower unemployment on impact in S0.
- **Improved in M:** bitcoin's supply-shock Δu is now +1.3 pp (v7 cs0 −4.9).
- **New oddity:** in M bitcoin and hybrid, a credit shock *raises* GDP by 9–12% over m60–84.

## 5. v7 validity run (finished; results-v7/validity.md and validity_cs0.md)

- **T3 Phillips correlation:** S0 −0.31; S2 −0.45 / −0.47 (correct sign).
- **T4 accounting residuals** are ~1e-9, except S3 assetPurchase at 1.4e-6.
  - **Crash: M bitcoin gradual transition, "Bank books do not close"** at tick 127 (default) / tick 163 (cs0).
  - This is **fixed in v8** (repro 5/5 OK vs v7 2/5 crash).
- **T5 at cs0:**
  - S2 bitcoin u 23.1%, within-run SD 3.9 pp.
  - M fiat 8.7%, M bitcoin 18.2%.
  - v8 M: 4.9% / 7.1% because of the flh pin.
- **T6b at cs0:** assetPurchase money growth +40–44%/yr, CPI +41–47%/yr. That was the runaway; fixed in v8 (1.29×–1.45× over 20 years).
- **T8 assetPurchase incidence:** households −95%, firms +195% (the accommodation signature). Not rerun on v8.
- **T10 M bitcoin:** 175 foreclosures, 29 failures.
- **T1 M bitcoin helicopter:** CPI +77.6% at +96 months.
- v8 validity rerun: **skipped** (~17 min). Recommended next.

## 6. Skipped this round

- E6, E8, E9, X2 and X3: the core is not clean (items 4–6).
- v8 validity rerun.
- v7-vs-v8 T8 incidence.

## 7. Remaining fixes, in priority order

1. **Goods-market rationing / zero median consumption (item 5).** Allocate scarce output pro rata to desired spend (or let price respond to the deposit overhang and to stockouts) instead of first-come-first-served within a tick. Then re-check the S2 and M hoard3 zero runs. Until then, headline on unemployment and GDP.
2. **S2 stimulus (item 4).** Make the taper a real cap (e.g. stop new stimulus once moneyMultiple ≥ 2, or tie it to the output gap). Also check why stimulus has no effect on S2 unemployment: it raises deposits, not demand that firms can meet.
3. **firmLevelHiring under bitcoin and el0 (items 3 and 6).** The M pin hides it: flh on gives bitcoin u 18%, 28 failures, and fiat el0 12× money. Fix the mechanism, then unpin M. Make the wage damping act on inflation overshoot regardless of the 1.25× money gate.
4. **Attribute the −30 to −45% consumption gap** that appears with the v7 default package (E1 vs E1L) to individual defaults, especially the stabilizer and tenureChoice for S0. Decide whether those defaults are intended.
5. **M bitcoin housing premium 0 fragility** (38 failures), and the residual +3 pp CPI from assetPurchase (document or damp).
6. Shock responses (E4): the fiat-vs-bitcoin GDP-loss sign in demand slumps, unemployment falling after supply shocks in S0, and credit shocks raising GDP in M bitcoin/hybrid.
7. Rerun the validity suite on v8.

## Files

- **REPORT-v8.md** (this file)
- **charts-v8/**
  - `v1_v2_v3_v4_v5_v6_v7_v8_gap.png`: consumption, Δu and real GDP gap by version; v8 in magenta.
  - `v8_fix_checks.png`: the six fix items, v7 vs v8.
- **results-v8/**
  - Version comparison: `compare_v1_v2_v3_v4_v5_v6_v7_v8.json`, `compare_v1_v8.txt`
  - Headline tables: `E1_regime_structure.txt`, `X1_monetary_preset.txt`, `E1L_legacy_defaults.txt`
  - `M_bimodality.json`
  - `V8_probes.md`: all probe groups plus the rebate table.
  - `wage_flh_attribution.txt`
  - `repro_gradual_v7.txt`, `repro_gradual_v8.txt`
  - `E4_shock_table.json` / `E4_shock_table.txt`
- **data-v8/**: E1, X1, E1L, E4 jsonl, and review/*.json probes.
- **scripts-v8/**
  - `chart_v8.py`, `diag_zero_v8.mjs`, `probe_wage_flh_v8.mjs`, `repro_gradual.mjs`
  - `compare.py` and `chart_compare.py`, updated for v8.
