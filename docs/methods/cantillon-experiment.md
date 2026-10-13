# Cantillon effect experiment

Issue #16: the default `proRataDeposits` channel is a savers' dividend with no
first-receiver advantage, and the other injection channels had no experiment
that compared wealth or income across them. This note is that experiment.

The simulation cannot show that one monetary system is better in the real world.
It shows which assumptions a conclusion depends on. Cantillon is the usual
bitcoin-side claim students raise; the run is meant to show sign and size,
including that the measured effect is small.

## Design

Each cell is one preset × one regime. Every cell uses the same money-growth
rule and turns shocks off so the only slider that changes is
`centralBank.injectionChannel`.

| Cell       | Preset                            | Regime  |
| ---------- | --------------------------------- | ------- |
| S0 fiat    | `FEATURE_OFF`                     | fiat    |
| S0 bitcoin | `FEATURE_OFF`                     | bitcoin |
| M fiat     | `scenarios/presets/monetary.json` | fiat    |
| M bitcoin  | `scenarios/presets/monetary.json` | bitcoin |

Scale is 60 households, 6 firms, 1 bank. Horizon is 24 months. Seed band is
1–10. Bitcoin ignores the injection slider; those rows are a control.

Channels, and who first holds the new money:

- `proRataDeposits`: households, in proportion to existing deposits.
- `governmentSpending`: the treasury, then firms that still have inventory.
- `newLoans`: firms, as loans booked inside unused credit room.
- `assetPurchase`: households, paid for bonds already on bank books. Places
  nothing when there are no bonds.

Metrics:

- Wealth Gini change: last month minus month 0.
- Top-decile wealth-share change: last month minus month 0.
- Gini versus `proRataDeposits`: same-seed end Gini minus the pro-rata end Gini.
  That is the cross-channel Cantillon increment.
- First-receiver gain, months 0–12: relative change in top-decile real wealth
  (`topDecileWealthShare × totalRealWealth`) for household-first channels, and
  in `realClaimWealth` for firm-first channels.

The issue's target is unchanged: mean wealth-Gini change within **±0.01** of
zero for `assetPurchase` and `proRataDeposits`.

## How to run

The experiment is `packages/core/src/experiments/cantillon.ts`. CI runs it in
`cantillon-ci.test.ts`.

```bash
pnpm vitest run cantillon
```

## Findings (10 seeds)

Means with `[min, max]` over seeds 1–10. "Target" is `|GiniΔ| ≤ 0.01` on
start-to-end wealth Gini for `proRataDeposits` and `assetPurchase`.

### S0 × fiat

| Channel            | Gini Δ                     | vs pro-rata                | Top-decile Δ               | First-receiver             |
| ------------------ | -------------------------- | -------------------------- | -------------------------- | -------------------------- |
| proRataDeposits    | −0.0660 [−0.0760, −0.0602] | 0                          | −0.0518 [−0.0678, −0.0402] | −0.0591 [−0.0656, −0.0527] |
| governmentSpending | −0.0731 [−0.0855, −0.0658] | −0.0072 [−0.0099, −0.0055] | −0.0575 [−0.0768, −0.0440] | 0.0243 [0.0240, 0.0246]    |
| newLoans           | −0.0694 [−0.0787, −0.0635] | −0.0035 [−0.0054, −0.0016] | −0.0547 [−0.0728, −0.0427] | 0.0108 [−0.1105, 0.0246]   |
| assetPurchase      | −0.0686 [−0.0794, −0.0622] | −0.0027 [−0.0035, −0.0021] | −0.0541 [−0.0711, −0.0418] | −0.0771 [−0.0833, −0.0704] |

Start-to-end Gini **misses** ±0.01 on both named channels. The cross-channel
gaps versus pro-rata all sit inside ±0.01.

### S0 × bitcoin

Every channel is the same path: Gini Δ −0.0657 [−0.0760, −0.0592], vs pro-rata
0, top-decile −0.0513 [−0.0679, −0.0400]. First-receiver is −0.0579 for the
household-first proxy and +0.0243 for the firm-claim proxy, because those
proxies read different stocks, not because the printer ran. Bitcoin ignores
`centralBank.injectionChannel`. Start-to-end Gini **misses** ±0.01.

### M × fiat

| Channel            | Gini Δ                    | vs pro-rata              | Top-decile Δ               | First-receiver             |
| ------------------ | ------------------------- | ------------------------ | -------------------------- | -------------------------- |
| proRataDeposits    | −0.0333 [−0.2252, 0.0049] | 0                        | −0.0333 [−0.0471, −0.0091] | −0.0541 [−0.1159, −0.0155] |
| governmentSpending | −0.0110 [−0.0585, 0.0071] | 0.0224 [−0.0376, 0.2212] | −0.0353 [−0.0520, −0.0078] | 0.0318 [−0.0073, 0.0540]   |
| newLoans           | 0.0009 [−0.0364, 0.0220]  | 0.0343 [−0.0223, 0.2473] | −0.0372 [−0.0549, −0.0154] | 0.0331 [−0.0069, 0.0556]   |
| assetPurchase      | −0.0041 [−0.0697, 0.0207] | 0.0293 [−0.0671, 0.2460] | −0.0374 [−0.0548, −0.0127] | −0.0446 [−0.0777, −0.0074] |

`assetPurchase` start-to-end Gini **hits** ±0.01. `proRataDeposits` **misses**
(mean −0.0333). One seed drops Gini by 0.225 under pro-rata, which pulls the
mean and widens the vs-pro-rata range. New loans still raise end Gini relative
to a savers' dividend on average (+0.0343), which is the teachable
first-receiver sign on this preset.

### M × bitcoin

Every channel is the same path: Gini Δ −0.0337 [−0.0858, −0.0137], vs pro-rata
0, top-decile −0.0336 [−0.0549, −0.0029]. First-receiver −0.0600 (household
proxy) and +0.0325 (firm-claim proxy). Start-to-end Gini **misses** ±0.01.

## Target status

The experiment exists and runs in CI. First-receiver gain is reported for every
channel. The ±0.01 start-to-end Gini target is **not met** for
`proRataDeposits` on any cell, and is met for `assetPurchase` only on M/fiat.

That miss is not a reason to widen the band. Over 24 months the model's wealth
Gini falls by several points from opening skill-squared deposits, equity
claims, and ordinary income flows. A month of ~3 percent a year fiat growth is
small next to that. Euro-area QE moved a 0–100 wealth Gini by −0.03 points
(Lenza & Slacalek). The printer is not what moves Gini here.

The quantity that matches the teaching claim is the same-seed gap versus
`proRataDeposits`. On S0/fiat that gap is inside ±0.01 for every channel. On
M/fiat it is small for government spending and larger for new loans, which is
the sign students should see: credit-first money can concentrate claims more
than a savers' dividend. Bitcoin cannot show a Cantillon injection at all.

## Why not retune to hit ±0.01

Forcing start-to-end Gini inside ±0.01 would mean flattening opening inequality
or equity claims so the whole 24-month path barely moves. That would hide the
model's other distributional mechanics and would not isolate the printer. The
experiment keeps the target, reports the miss, and reports the cross-channel
increment.

## References

- Issue #16
- Lenza & Slacalek, ECB Working Paper 2190
- Doepke & Schneider (2006), _Journal of Political Economy_
