### T1: +50% helicopter money at month 60 (household deposits ×1.5 with matching reserves), change vs same-seed control, 10 seeds

| config | CPI +24m | CPI +96m | GDP +24m | GDP +96m | broad money +96m |
|---|---|---|---|---|---|
| S0|fiat | +0.12% | +0.96% | -0.00% | +0.04% | +31.42% |
| S0|bitcoin | +0.15% | +1.84% | +0.01% | -1.35% | +57.66% |
| S1|fiat | +1.50% | +11.81% | -1.08% | -0.61% | +30.71% |
| S1|bitcoin | +29.74% | +62.18% | +2.76% | -3.78% | +60.10% |
| S2|fiat | +0.03% | +0.31% | +0.95% | +0.12% | +32.49% |
| S2|bitcoin | +0.23% | +1.74% | +10.99% | +31.48% | +57.14% |
| S3|fiat | +2.61% | +11.39% | +1.08% | -0.31% | +37.05% |
| S3|bitcoin | +29.06% | +58.64% | +3.51% | -2.69% | +59.47% |
| M|fiat | +0.70% | +2.13% | +4.69% | -2.50% | +49.80% |
| M|bitcoin | +33.39% | +71.99% | +7.21% | +0.30% | +84.36% |

### T2: +15% demand impulse at month 60, change at month 71 vs control, 10 seeds

| config | CPI | wage | unemployment (pp) | GDP |
|---|---|---|---|---|
| S0|fiat | +28.53% | +6.18% | -4.93 | +3.13% |
| S0|bitcoin | +28.74% | +12.43% | -5.96 | +4.02% |
| S1|fiat | +7.19% | +4.34% | -3.94 | +4.22% |
| S1|bitcoin | +17.01% | +10.82% | -7.17 | +6.46% |
| S2|fiat | +28.47% | +6.60% | -6.87 | -0.29% |
| S2|bitcoin | +28.73% | +13.66% | -9.75 | +6.32% |
| S3|fiat | +2.98% | +4.11% | -4.60 | +7.25% |
| S3|bitcoin | +16.40% | +9.69% | -6.76 | +6.44% |
| M|fiat | +2.40% | +4.19% | -2.64 | +6.19% |
| M|bitcoin | +13.54% | +9.19% | -7.96 | +8.35% |

### T3: Phillips correlation (12-month wage growth vs unemployment, random shocks)

S0 -0.48, S2 -0.01 (n = 360 each)

### T4: independent conservation check (bank identity change per phase), seed 1, 240 ticks

| config | max per-phase residual change | annual money growth | cash home buys (paid → firm gain) |
|---|---|---|---|
| S0 fiat | 0 | +4.60% | 0 (0 → 0) |
| S0 bitcoin | 7.2e-09 | -1.46% | 0 (0 → 0) |
| S0 fiat+tenure | 0 | +4.60% | 0 (0 → 0) |
| S0 bitcoin+tenure | 7.2e-09 | -1.46% | 0 (0 → 0) |
| M fiat | 0 | -0.26% | 0 (0 → 0) |
| M bitcoin | 5.1e-09 | -3.84% | 10 (4267.726807308179 → 6282.0000000000255) |
| M bitcoin transition | 7.3e-09 | -6.24% | 8 (2430.484206287344 → 2429.999999999958) |
| M bitcoin gradual transition | 20 | -5.94% | 9 (2618.714531831594 → 3582.000000000029) |
| S3 fiat allFixes | 0 | -0.49% | 0 (0 → 0) |
| M fiat allFixes | 0 | +1.41% | 0 (0 → 0) |
| M bitcoin allFixes | 6.3e-09 | -3.98% | 10 (3016.406662968755 → 4958.999999999998) |
| S3 fiat governmentSpending | 0 | +3.31% | 0 (0 → 0) |
| S3 fiat assetPurchase | 0 | +0.30% | 0 (0 → 0) |

### T5: steady state (no shocks), months 120–179, 10 seeds

| config | mean unemployment | within-run SD |
|---|---|---|
| S0|fiat | 5.1% | 0.15 pp |
| S0|bitcoin | 6.1% | 0.12 pp |
| S1|fiat | 5.0% | 1.46 pp |
| S1|bitcoin | 7.2% | 1.17 pp |
| S2|fiat | 6.5% | 0.28 pp |
| S2|bitcoin | 10.1% | 0.06 pp |
| S3|fiat | 5.0% | 1.41 pp |
| S3|bitcoin | 7.1% | 1.21 pp |
| M|fiat | 4.8% | 1.71 pp |
| M|bitcoin | 7.5% | 1.04 pp |

### T6: annual broad-money growth vs inflation, 5 seeds (mg0.05 = moneyGrowth 0.05, the v6 floor)

| config | money growth | inflation |
|---|---|---|
| S0|fiat | +4.67% | +1.77% |
| S0|bitcoin | -1.47% | -1.19% |
| S0|fiat mg0.05 | +2.03% | +1.73% |
| S1|fiat | +0.64% | +2.33% |
| S1|bitcoin | -1.69% | -4.42% |
| S1|fiat mg0.05 | -2.91% | -3.31% |
| S2|fiat | +4.41% | +1.82% |
| S2|bitcoin | -1.44% | -1.13% |
| S2|fiat mg0.05 | +2.14% | +1.86% |
| S3|fiat | +0.49% | +2.03% |
| S3|bitcoin | -1.70% | -4.30% |
| S3|fiat mg0.05 | -2.78% | -2.85% |
| M|fiat | +0.25% | +1.96% |
| M|bitcoin | -3.86% | -7.50% |
| M|fiat mg0.05 | -3.35% | -3.46% |

### T6b (new): Barry's fiat-undershoot / injection fixes, 5 seeds

| config | money growth | inflation | velocity yr 20 (/month) |
|---|---|---|---|
| S1|fiat spendNewMoney1 | -1.47% | +3.42% | 0.1299 |
| S1|fiat governmentSpending | +3.60% | +0.90% | 0.0292 |
| S1|fiat newLoans | +0.04% | +4.63% | 0.1063 |
| S1|fiat assetPurchase | +0.39% | +3.85% | 0.0993 |
| S1|fiat allFixes | -0.06% | +3.32% | 0.0844 |
| S1|bitcoin allFixes | -1.68% | -4.46% | 0.0275 |
| S3|fiat spendNewMoney1 | -1.62% | +3.36% | 0.1291 |
| S3|fiat governmentSpending | +3.28% | +0.63% | 0.0286 |
| S3|fiat newLoans | -0.66% | +3.04% | 0.0945 |
| S3|fiat assetPurchase | -0.08% | +3.99% | 0.0962 |
| S3|fiat allFixes | -0.05% | +4.04% | 0.0968 |
| S3|bitcoin allFixes | -1.76% | -4.42% | 0.0252 |
| M|fiat spendNewMoney1 | -0.13% | +3.48% | 0.1170 |
| M|fiat governmentSpending | +4.52% | +0.35% | 0.0253 |
| M|fiat newLoans | +0.72% | +6.66% | 0.1555 |
| M|fiat assetPurchase | -1.05% | +1.96% | 0.1008 |
| M|fiat allFixes | +1.84% | +8.41% | 0.1730 |
| M|bitcoin allFixes | -3.87% | -7.48% | 0.0261 |

### T7: posted vs paid household deposit rate (20-year averages)

| config | posted | paid | paid/posted | credit/GDP end |
|---|---|---|---|---|
| S0 fiat pass1 | +7.23% | +6.47% | 0.89 | 0.568 |
| S0 bitcoin pass1 | +4.67% | +2.27% | 0.49 | 0.247 |
| S0 fiat pass1 leverage1 | +7.23% | +6.47% | 0.89 | 0.568 |
| M fiat | +7.53% | +6.36% | 0.84 | 0.496 |
| M bitcoin | +4.25% | +1.91% | 0.45 | 0.207 |
| S0 fiat pass1 subsidy1 | +7.23% | +6.47% | 0.90 | 0.568 |
| M fiat subsidy1 | +7.07% | +6.17% | 0.87 | 0.504 |
| M fiat allFixes | +10.50% | +6.12% | 0.58 | 0.208 |

### T8 (new): where new fiat money first lands (S3 fiat, seed 1, centralBank phase)

| channel | households | firms | government | Q1 households | Q5 households | expanding ticks |
|---|---|---|---|---|---|---|
| proRataDeposits | 100% | 0% | 0% | 2.1% | 80.2% | 158 |
| governmentSpending | 0% | 2% | 98% | 0.0% | 0.0% | 155 |
| newLoans | 0% | 100% | 0% | 0.0% | 0.0% | 86 |
| assetPurchase | 100% | 0% | 0% | 1.8% | 81.3% | 77 |

### T10 (new): tenure flows and bank resolution, 5 seeds, per 20-year run

| config | renter→mortgage | mortgage→rent (foreclosure) | mortgage→owned | credit/GDP end | rent share end | min real agg. bank equity | share of ticks agg. equity < 0 | cumulative failures |
|---|---|---|---|---|---|---|---|---|
| S0+tenure fiat | 3.2 | 0.0 | 0.0 | 0.641 | 40.0% | 502.9 | 0% | 0.0 |
| S0+tenure bitcoin | 5.8 | 51.4 | 2.2 | 0.246 | 48.8% | 0.0 | 0% | 3.8 |
| S0+tenure fiat housingFix | 20.4 | 0.6 | 0.0 | 0.772 | 37.0% | 609.8 | 0% | 0.0 |
| S0+tenure bitcoin housingFix | 20.4 | 101.2 | 3.8 | 0.280 | 54.9% | 0.0 | 0% | 6.4 |
| M fiat | 10.8 | 2.0 | 0.0 | 0.518 | 38.9% | -316.2 | 0% | 2.8 |
| M bitcoin | 27.4 | 165.6 | 1.4 | 0.233 | 63.8% | -143.4 | 0% | 25.4 |
| M fiat resolution off | 10.8 | 1.6 | 0.0 | 0.386 | 38.9% | -126.2 | 1% | 2.8 |
| M bitcoin resolution off | 0.0 | 142.0 | 0.0 | 0.218 | 64.1% | -5343.9 | 91% | 3.0 |
| M bitcoin mortgageShare0 | 29.2 | 166.8 | 0.4 | 0.226 | 63.7% | -503.7 | 0% | 25.2 |

### T11 (new): one-step vs gradual (gradualWeight 1) transition, S0, length 12, hc 0.5

| month | one-step Gini | gradual Gini | one-step top-10% | gradual top-10% |
|---|---|---|---|---|
| 0 | 0.567 | 0.572 | 42.3% | 43.0% |
| 3 | 0.570 | 0.588 | 42.5% | 44.8% |
| 6 | 0.569 | 0.591 | 42.4% | 45.2% |
| 9 | 0.571 | 0.595 | 42.6% | 45.7% |
| 10 | 0.572 | 0.596 | 42.6% | 45.7% |
| 11 | 0.628 | 0.597 | 49.9% | 45.8% |
| 12 | 0.626 | 0.598 | 49.7% | 45.9% |
| 24 | 0.632 | 0.610 | 50.1% | 46.9% |
