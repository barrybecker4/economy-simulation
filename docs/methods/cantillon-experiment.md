# Cantillon Effect Experiment

## Overview

This experiment tests the distributional impact of different monetary injection channels to address the claim that "fiat enriches those closest to the printer" (Cantillon effect). It implements the requirements from issue #16.

## Research Question

Does the channel through which new fiat money enters the economy create measurable differences in wealth and income distribution, and if so, how large are these effects?

## Real-World Evidence

- **Euro-area QE (Lenza & Slacalek, ECB WP 2190)**: wealth Gini moved from 69.17 to 69.14 (−0.03 points), income Gini from 43.15 to 43.09 (−0.06 points)
- **Unanticipated inflation (Doepke & Schneider, 2006)**: shifts 5.7-15.2% of GDP from rich, old bondholders to young debtors

## Method

### Injection Channels Tested

1. **proRataDeposits** (neutral baseline): New money distributed to households proportional to existing balances
2. **governmentSpending**: New money enters through government purchases from firms
3. **newLoans**: New money enters through new firm loans (within credit capacity)
4. **assetPurchase**: New money enters through central bank bond purchases, paying households

### Experimental Design

- **Seeds**: 10+ per configuration (per acceptance criteria)
- **Duration**: 24 ticks (2 years) to observe distributional effects
- **Regimes**: fiat and bitcoin
- **Presets**: S0 (feature-off baseline) and monetary (demand-driven)
- **Control variables**:
  - Same secular money growth rate across all channels (`centralBank.moneyGrowth = 1`)
  - Crisis stimulus disabled (`centralBank.stimulus = 0`)
  - Shocks disabled to isolate channel effects
  - Demand-driven prices (`prices.trendWeight = 0`, `production.demandWeight = 1`)

### Metrics

1. **Wealth Gini change**: End wealth Gini minus start wealth Gini
2. **Top decile share change**: End top 10% wealth share minus start share
3. **First-receiver gain**: 12-month wealth change of the group receiving new money first
   - proRataDeposits/assetPurchase: top quintile gain (households)
   - governmentSpending/newLoans: mean real wealth gain (firm receipts flow to households)

## Acceptance Criteria (Issue #16)

The experiment exists and runs in CI. Across channels:

- Change in wealth Gini is within **±0.01** of zero for `assetPurchase` / `proRataDeposits`, consistent with the ECB estimate
- First-receiver gain is reported for each channel

## Implementation

- `packages/core/src/experiments/cantillon.ts`: Core experiment runner
- `packages/core/src/experiments/cantillon-report.ts`: Report generator with summary statistics
- `packages/core/src/experiments/run-cantillon.ts`: CLI runner
- Tests: `cantillon.test.ts` and `cantillon-report.test.ts`

## Running the Experiment

```bash
# Run the full experiment (10+ seeds, all channels, both regimes)
pnpm tsx packages/core/src/experiments/run-cantillon.ts

# Run tests
pnpm vitest run cantillon
```

## Expected Results

Based on the ECB evidence, we expect:

- **Neutral channels** (proRataDeposits, assetPurchase): Gini changes near zero (within ±0.01)
- **Firm-first channels** (governmentSpending, newLoans): Potentially larger but still modest effects
- **Regime differences**: Bitcoin's fixed money supply may amplify or dampen effects differently than fiat

## Interpretation

The Cantillon effect is theoretically important but empirically small in the real world. The simulator should replicate this: teachable sign and direction, but modest magnitude. This allows instructors to show students:

1. The effect exists (different channels produce different distributions)
2. The effect is typically small (consistent with empirical findings)
3. Which structural assumptions matter for the size of the effect

## Findings (10 seeds per preset/regime)

### S0 (Feature-Off Baseline) + Fiat
- **All channels**: Gini Δ ≈ -0.10 (range: -0.13 to -0.085)
- **Interpretation**: Wealth inequality decreases uniformly across channels because the baseline has minimal economic dynamics

### Monetary Preset + Fiat
- **proRataDeposits**: Gini Δ = -0.024 (range: -0.033 to -0.015)
- **governmentSpending**: Gini Δ = -0.023 (range: -0.033 to -0.014)
- **newLoans**: Gini Δ = -0.015 (range: -0.029 to -0.004) — smallest effect
- **assetPurchase**: Gini Δ = -0.028 (range: -0.039 to -0.016) — largest effect
- **Interpretation**: Modest differences between channels; all show wealth inequality decrease

### S0 + Bitcoin
- **All channels**: Identical Gini Δ ≈ -0.103 (range: -0.129 to -0.088)
- **Interpretation**: Without money growth, channels have no differential effect

### Monetary Preset + Bitcoin
- **All channels**: Gini Δ ≈ -0.057 (range: -0.073 to -0.038)
- **First-receiver gains**:
  - proRataDeposits/assetPurchase: +0.52% (households)
  - governmentSpending/newLoans: -2.64% (firms channel)
- **Interpretation**: Channels differ in first-receiver wealth changes but produce similar Gini outcomes

## Status Relative to Acceptance Criteria

**✓ Experiment exists and runs in CI** — Implemented in `cantillon-ci.test.ts`

**✗ Gini changes within ±0.01** — Not met. Measured changes are 2-10× larger than the ECB-based target.

**✓ First-receiver gains reported** — Implemented for all channels

### Why the Target is Not Met

The acceptance criterion (±0.01) is based on Euro-area QE data where the wealth Gini moved by only -0.03 points. The simulation shows larger changes because:

1. **Structural differences**: The model has fewer asset classes and wealth dampeners than real economies
2. **Time scale**: 24 months may be too short to reach steady-state distribution
3. **Opening conditions**: Wealth starts more concentrated than in the real world
4. **Calibration needed**: Capital valuations, equity markets, and wealth accumulation need tuning to match real-world Gini sensitivity

The experiment successfully demonstrates that:
- Different injection channels CAN be tested
- Distributional effects ARE measurable
- Channel differences exist but are relatively small (consistent with "small Cantillon effect" finding)

**Recommendation**: Either (1) calibrate the model to reach ±0.01 by adjusting wealth accumulation parameters, or (2) update the acceptance criterion to reflect what the model's structure implies (e.g., ±0.05).

## References

- Issue #16: https://github.com/barrybecker4/economy-simulation/issues/16
- Lenza & Slacalek (2018), "How does monetary policy affect income and wealth inequality?", ECB Working Paper 2190
- Doepke & Schneider (2006), "Inflation and the Redistribution of Nominal Wealth", Journal of Political Economy
