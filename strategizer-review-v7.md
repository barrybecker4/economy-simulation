# Strategizer review v7 — barrybecker4/economy-simulation, commits after 1ca86eb (HEAD d8ac6ca)

**STATUS: COMPLETE** (2026-10-08 PT). Small-N probes: ±2 pp unemployment and ±0.1x money are within noise.

Repo: /workspace/econ-sim/strategizer/repo-v7 (builds clean). Probes: /workspace/econ-sim/strategizer/probes-v7/ (outputs in out/).
Probe base: ai.automatableShare 0.3/0.3, 500 HH / 50 firms / 3 banks, 120 ticks, 2-3 seeds unless noted. Small-N: treat ±2 pp as noise.
Commits: 0840e07 + 0126a36 (44 slider-default changes, feature-off.ts), fc3dd4b (zombie support), 1a37fec ("Address the v6 regression report"), d8ac6ca (tests).

## 0. CRITICAL new finding: regime.type no longer selects the monetary rule under defaults or M

`packages/core/src/sim/central-bank.ts:76`:
```
if (economy.params.choiceSpeed > 0) { setBlendedPolicy(economy); if (economy.moneyShares.fiat > 0) accommodateReserves(economy); }
else if (economy.params.regime === 'fiat') { setFiatPolicy(economy); growFiatMoney(economy); accommodateReserves(economy); }
else { setMarketRate(economy); if (regime === 'hybrid') supportInsolventBanks(economy); }
```
0840e07 changed `money.choiceSpeed` default 0 -> 0.01; monetary.json (M) does not override it. So under defaults AND M:
- `growFiatMoney` (only call site) never runs: no secular fiat growth, no crisis stimulus, in any regime.
- hybrid LOLR (`supportInsolventBanks`) never runs.
- Policy rate is a fiat-share-weighted Taylor/market blend in every regime; opening shares ignore regime.type, and fiat share drifts 0.98 -> ~0.52 in 10 y.
- Fiat-only *fiscal/banking* asymmetries keyed on `params.regime` still run (stabilizer, government.ts:132, now default 1; IOR/deposit subsidy, deposit-interest.ts:55/76).

| Run (120 t, 3 seeds) | infl/yr | money xM0 | fiat inj/M0 | maxRate | fiat share end | unemp | failures |
|---|---|---|---|---|---|---|---|
| M fiat default (cs 0.01) | -2.3% | 0.61 | **0** | 12.4% | 0.52 | **15.9%** | 18 |
| M bitcoin default | -7.4% | 0.43 | 0 | 3.8% | 0.52 | 14.0% | 22 |
| M hybrid default | -6.7% | 0.56 | 0 | 3.1% | 0.52 | 14.7% | 0 |
| M fiat cs 0 | +5.8% | 1.58 | 0.08 | 20.0% (cap) | 0.98 | 7.7% | 3.3 |
| M bitcoin cs 0 | -7.4% | 0.46 | 0 | 7.0% | 0.98 | 15.9% | 27.7 |
| M hybrid cs 0 | -4.3% | 0.94 | 0 | 7.0% | 0.98 | 17.8% | 0 |
| S0 fiat default | -3.1% | 0.65 | 0 | 9.8% | 0.52 | 11.3% | 5.3 |
| S0 bitcoin default | -4.5% | 0.63 | 0 | 8.4% | 0.52 | 12.2% | 5 |
| S0 fiat cs 0 | +6.3% | 1.15 | -0.04 | 19.9% | 0.98 | 7.2% | 4 |

Severity: **critical**. Direction: under defaults the regime comparison is mostly gone (fiat ≈ bitcoin ≈ hybrid, all deflating); any "fiat vs bitcoin" chart at defaults is measuring currency-competition + fiat-only fiscal/IOR differences, not monetary rules. The slider text admits it ("Above 0 the policy rate and reserve accommodation follow the fiat share"), but presets/experiments don't account for it (only experiments/hypotheses.ts:183 sets choiceSpeed). Fix: gate the blended branch on an explicit `regime.type === 'competing'` or set choiceSpeed 0 in fiat/bitcoin/hybrid presets.
Also: at cs 0, M fiat runs at the 20% Taylor cap with +5.8% CPI (rate pinned, see item 5).

## 1. Verdicts on REPORT-v6 §10.1 (so far)

| # | Item | Verdict | On by default | Under M | Evidence |
|---|---|---|---|---|---|
| 2 | Crisis stimulus read shock generator | **Fixed in code, all 3 asks; still fiat-only; inactive at defaults/M** | Code yes (stimulus 1.75, lag 3); effective **no** (cs 0.01 bypass) | Inactive (bypass) | 1a37fec central-bank.ts:152-154 `gap = unemploymentRate - naturalUnemployment` ... `Math.abs(gap) < STIMULUS_GAP_DEADBAND ? 0 : gap` (deadband 0.02, :145); :113 `annual = secular + stimulusAnnual`; slider macro.ts:298-299 default 1.75, **min 0**; fiat-only :100 `if (economy.params.regime !== 'fiat' ...) return`. Probe stim.json, M fiat cs0 stim1.75 calm: 35.5 positive / **17 negative** stimulus months, min -0.105 (tightens), max +0.186 -> (a) observed, (b) two-way, confirmed. stim 0: 0/0 months, zero (c) confirmed. Default cs0.01 arm: 0/0 months in every shock (bypass). Bitcoin: 0. Caveat: a ±2 pp deadband around a fixed naturalUnemployment, not a real gap; fires in calm runs as ordinary U feedback |
| 6 | Mortgage double count + one-sided term rule | **Fixed** | Yes (tenureChoice on by default now) | Yes | 1a37fec contracts.ts:135 `realRate = loanRate - inflation`, :150 `ownedBurden = monthlyOwnedCost(homePrice, realRate) + impatience` (separate capitalLoss term removed); :81 `if (payment <= input.income * input.defaultShare)` two-sided, current income. ADR 0022. Residual: deflation prepay (:175) still allowed, which is reasonable |
| 7 | Bank dividends paid to nobody | **Fixed** | Yes | Yes | 1a37fec money.ts:122 `releaseBankEquity` -> equity down, `household.deposit += take` (:156) pro rata by deposit at that bank, all regimes, not vault-limited; ADR 0023. Money at pass-through 0, M fiat cs0: **1.61x** (v6 0.46x); M fiat pt0 default 0.66x (bypass-driven, not dividends); M bitcoin pt0 cs0 0.48x. Residual: deposit-weighted, households only (firms never receive), concentrates bank profit in the top deposit holders |
| 1 | S3 + hoarding bitcoin collapse | **Patched (milder), not fixed** | S3 not default (defaults now trendWeight 0.75, demandWeight 0.5, firm-level on, realReturnSensitivity 0.8) | n/a | 1a37fec labor.ts:41 `hiringReferenceRealWage` = `(1/(1+markup))*productivity`, tightness/impulse glide removed (ADR 0020). i1.json (240 t, 3 seeds, S3 + sensitivity 3): bitcoin cs0 U 16.9% (end 16.2%, peak 21.7%) vs fiat cs0 7.4%; v6 N8 was 30.8% (39.9% at yr 20). At defaults bitcoin 14.2% vs fiat 15.0%: the gap only "closes" because fiat is also crippled (§0). trendWeight 0.75 arm: 16.1%. Bitcoin-vs-fiat gap under S3 still ~9.5 pp at cs0 |
| 3 | M printing raises CPI while money falls (N10) | **Unchanged where printing runs; moot at defaults/M** | No printing at defaults (bypass) | No printing (bypass) | stim.json, M fiat cs0 stim 1.75, demand -0.1 at m60, window m60-96 vs calm: money **-6.7%**, CPI **+5.0 pp**; stim 0: money -1.8%, CPI +1.3 pp. So the stimulus arm still raises CPI while broad money falls. Same pattern for credit +0.1 (-7.8%, +5.5 pp). No code change targeted it |
| 4 | Supply-shock sign | **Patched in code; outcome still sign-ambiguous/noisy** | Firm-level hiring on by default | n/a | labor.ts:185 `if (economy.productivityImpulse < 0) return Math.min(scale, 1)` (ADR 0020). i4.json, productivity -0.1 at m60, 3 seeds, GDP loss m60-143: S0 cs0 fiat **-1.7%** (GDP rises), bitcoin +2.0%; S0 default fiat +2.7%, bitcoin +3.2%; S2 cs0 fl-off fiat +1.7%, bitcoin -0.2% (v6 8.9% vs 1.3%). Impact window m60-71: U *falls* 1.9-5.0 pp in every on-arm (more labour per unit of fixed demand). The fiat-vs-bitcoin asymmetry is gone, but a negative supply shock still often raises GDP |
| 5 | Uncapped Taylor / channel runaways | **Taylor: fixed (cap binds often). Channels: worse for assetPurchase** | Cap yes; channel default proRata | Cap binds under M fiat cs0 | rules.ts / central-bank.ts:57 `clamp(..., 0, MAX_POLICY_RATE)`, MAX 0.20. M fiat cs0 maxRate 0.197-0.200, mean 8.8% (rate pinned at cap with CPI +5.6%). Channels (ADR 0021; S3h fiat cs0, 240 t, 2 seeds): proRata money 1.34x, CPI 7.1%; governmentSpending 2.87x, 5.1%; newLoans 2.17x, **10.3%**, 11.5 failures; **assetPurchase 7276x money, CPI +48.9%/yr, U end 0.01%**. Not S3-specific: M fiat cs0 assetPurchase (120 t) 10.8x money, CPI +24%/yr; S0 fiat cs0 7.6x, +20%. fiatInjectionFlow reads **-9.7x M0** (a net withdrawal) while money grows 10.8x, so money is created outside the measured injection. Candidates: reserves booked at 2x the purchase (central-bank.ts:345 `addReserves(bank, 2 * take)`), reserve interest on those reserves at the 20% cap, and item-7 dividends now reaching deposits. Root cause not isolated. Also :346 `injectHouseholdDeposits(economy, take)` pays households deposit-weighted for bonds they never held, which makes it pro-rata plus extra reserves rather than a distinct Cantillon channel |
| 8 | MAX_CENT / E4 M fiat peak-U spikes | **Patched (fail-loud); spikes not reproduced** | Yes | Yes | banking.ts:60/64/72 `throw new Error('Fiat bond balance exceeds the safe integer range')` replaces BigInt spill. amount.ts:6 MAX_CENT = 2^63-1 unchanged. The throw never fired, even in the 7276x assetPurchase runs (deposits are float). M fiat cs0 5 seeds: peak U 15.1% vs mean 7.6%; M fiat default peak 20.4% vs 15.6%. No E4-scale spike at 500 HH. Not tested at default scale |


## 2. Rechecks of v6 items not on the 10.1 list

| Item | Status v7 | Evidence (re.json / re2.json, M, 240 t, 3-5 seeds) |
|---|---|---|
| Fiat-only reserve interest | **Unchanged and now ON by default** (pass-through 0.45, subsidy 0.35) | deposit-interest.ts:55/76 `economy.params.regime === 'fiat' &&`. M fiat cs0 reserve interest/M0 **0.34** (v6 0.32); pass-through 0 gives 0 and money 1.68x. At defaults 0.066 |
| Legacy mortgage book | **Unchanged**, still the main bitcoin drag | M bitcoin cs0: book on gives money 0.46x, 27.7 failures; `openingMortgageShareOfOwners 0` gives 1.01x, 12.8 failures (v6 0.53/28.4 vs 1.02/16.7) |
| Real mortgage loss on depositors | **Unchanged** (by design) | macro.ts:399 "the rest seats on deposits at that bank". Transition 24 m cs0: realMortgage off gives money 0.29x, 41 failures, U end 28%; on gives 0.30x, 15 failures, U end 19% but peak U 34%. Money is now neutral (v6 0.86 to 0.38x) |
| Backward-looking wages | **Unchanged**; `wageElasticity 0` now explodes fiat | Agreed wage is still current price level x ... x (1 + 0.4·tightness); nominalRigidity 0.9 unchanged. M fiat cs0 el0: **money 36x, CPI +26.5%/yr, U 20.8%, rate at cap**; M bitcoin cs0 el0: U 11.3% vs 15.9% |
| Monetary premium | **Worse for neutrality: default 0 to 0.25** | M bitcoin cs0: premium 0 gives money 0.27x, 39.6 failures, U 19.7%; **0.25 (default)** gives 0.46x, 27.7, 15.9%; 0.5 gives 0.68x, 6.4, 12.4%. The default now hands bitcoin -12 failures and +0.19x money |
| Satoshi crash | **Still fixed** | crash5: M bitcoin 0/10, M hybrid 0/10 (240 t); no crashes in any probe this round |

## 3. New bias risks (ranked)

| # | Risk | Severity | Direction | Evidence |
|---|---|---|---|---|
| R1 | `money.choiceSpeed` default 0.01 routes **every regime** through `setBlendedPolicy`. No fiat growth, no crisis stimulus, no hybrid LOLR. Fiat share drifts to 0.52 by year 10 | **Critical** | Anti-fiat at defaults (M fiat: U 15.9% vs 7.7% at cs0, CPI -2.3% vs +5.8%); erases regime contrast | §0; central-bank.ts:76-90 |
| R2 | The test suite runs on `FEATURE_OFF` (choiceSpeed 0, stimulus 1, premium 0, stabilizer 0) in **67 test files**. The v6 fixes are verified in a world the shipped defaults never run | High | Hides R1 and R5 | sim/feature-off.ts:7,13,19,31; opening-path.test.ts `...FEATURE_OFF` |
| R3 | assetPurchase money runaway (7-7000x, CPI 20-49%/yr), with injection accounting showing net withdrawal | High (opt-in) | Pro-bitcoin / discredits fiat QE if used | §1 item 5; i5.json, i5b.json |
| R4 | `wageElasticity 0` under fiat cs0 gives a 36x money, 26%/yr stagflation spiral pinned at the rate cap | Medium-high (opt-in) | Anti-fiat | re2.json |
| R5 | 44 defaults changed in one commit (0840e07/0126a36). Fiat-only stabilizer (default 1), IOR and deposit subsidy are switched on while the fiat money rule is switched off. Monetary premium 0.25 is on | Medium-high | Mixed: fiscal/IOR pro-fiat, premium pro-bitcoin; none of it labelled per regime | defaults.mjs; government.ts:132 |
| R6 | Bank dividends are deposit-weighted, households only | Low-medium | Regressive (top depositors get bank profit); firms excluded | money.ts:122-156 |
| R7 | `replaceFirm` keeps the workforce; zombie support exists (default 0, fiat-only, budget-capped) | Low | Hides failure unemployment; pro-fiat if enabled | bookkeeping.ts (fc3dd4b), ADR 0019 |
| R8 | Stimulus gap uses a fixed `naturalUnemployment` with a ±2 pp deadband. It fires in calm runs (35 positive / 17 negative months) | Low | Pro-fiat when the natural rate is mis-set | central-bank.ts:145-154 |

## 4. Feasibility of X1–X5 at d8ac6ca

| X | Feasibility | One line |
|---|---|---|
| X1 Cantillon | **Medium (up from low), cs 0 required** | stimulus can be 0, gov/loans channels are real and dividends reach depositors (pt0 money 1.61x). assetPurchase runs away and is pro-rata by construction, and you must set choiceSpeed 0 or no channel fires |
| X2 Transition cost | **Feasible after one small hook** (unchanged) | realMortgage still marks to same-bank depositors. Still needs a preserve/holderConcentration mode and an equity-or-shareholder mark variant |
| X3 Good vs bad deflation | **Partly feasible** (unchanged) | Legacy-book (0.46 to 1.01x) and premium switches separate them. Wages are still backward-looking, and el0 explodes fiat, so a wage-floor arm is unreliable |
| X4 Rainy-day vs stabilizer | **~5-line hook, now more urgent** | The fiat-only stabilizer is ON by default (government.ts:132) and bitcoin still has no fiscal tool |
| X5 Dual-currency adoption | **Medium; mechanism now on by default but entangled** | choiceSpeed gives endogenous currency shares, but it also replaces the regime's policy rule (R1). It needs decoupling before it can be used as an experiment |

## 5. Probe files (/workspace/econ-sim/strategizer/probes-v7/)
defaults.mjs (slider diff); branch.mjs (generic arm runner, extended with peak U, reserve interest and live banks); stim.mjs (stimulus sign/zero/regime by shock); p6.mjs (supply shock windows); crash5.mjs (crash survey). Outputs in out/: b_Mdef, b_Mcs0, b_S0, b_pt0, stim, i1, i4, i5, i5b, re, re2 (.json), crash_btc.txt, crash_hyb.txt. No repo changes, no pushes.
