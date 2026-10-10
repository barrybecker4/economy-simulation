# Analysis Scripts

## Headline Suite

The headline suite runs a 20-seed paired bitcoin-vs-fiat comparison across all major structures and presets, reporting median real consumption, unemployment, and real GDP.

### Configuration

- **Seeds**: 20 (1-20)
- **Scale**: 500 households, 50 firms, 3 banks
- **Duration**: 240 months (20 years)
- **AI**: Off (fixed at 30% automatable)
- **Shocks**: None (calm path)

### Structures

The suite runs these configurations:

- **S0**: Trend prices, supply-side output (v1-v6 default)
- **S1**: Demand-driven prices, supply-side output
- **S2**: Trend prices, demand-constrained output + firm-level hiring
- **S3**: Demand-driven prices + demand-constrained output (v7 baseline)
- **D**: Pure v7 registry defaults

Each structure runs with:
- Fiat regime
- Bitcoin regime
- Additional variants for S3 and M with `realReturnSensitivity: 3` (hoarding 3)

### Monetary Preset

- **M**: Monetary preset from `scenarios/presets/monetary.json`
  - Includes endogenous credit, tenure choice, deposit pass-through, etc.
  - Runs with fiat, bitcoin, and hoarding 3 variants

### Usage

```bash
# Run the headline suite (builds core package automatically)
node scripts/headline-suite.mjs [output-dir]

# Example: custom output directory
node scripts/headline-suite.mjs ./my-results

# Default output: ./results-headline/
```

### Output

The script produces:

1. **headline-spec.json**: The specification file for the runner
2. **headline-results.jsonl**: Line-delimited JSON with all simulation results
3. **Console report**: Tables showing:
   - Median metrics for each configuration (years 2-20)
   - Bitcoin vs fiat gaps (consumption %, unemployment pp, GDP %)

### Example Output

```
=== HEADLINE SUITE RESULTS (Years 2-20) ===

Config                          | Median Real Consumption | Unemployment % | Real GDP
--------------------------------|------------------------|----------------|----------
S0|fiat                         |                 12.345 |           5.10 |   1250.0
S0|bitcoin                      |                 12.012 |           6.10 |   1252.5
...

=== Bitcoin vs Fiat Gaps ===

Config         | ΔConsumption % | ΔUnemployment pp | ΔGDP %
---------------|----------------|------------------|--------
S0             |           -2.7 |            +1.00 |   +0.2
S1             |           -1.9 |            +2.57 |   -1.5
S2             |           -2.7 |            +2.78 |  -17.1
S3             |           -2.0 |            +2.41 |   -2.0
...
```

### Implementation

The suite:

1. Builds the core package
2. Generates a spec file with all condition/seed combinations
3. Runs simulations via `runner.mjs` (the headless experiment runner)
4. Analyzes results and computes medians over the 20 seeds
5. Reports tables to the console

### Runner

The `runner.mjs` script is the headless experiment runner that:

- Loads the simulation from the built core package
- Runs each condition × seed combination
- Captures time-series metrics and snapshots
- Outputs results as line-delimited JSON

Spec format:

```json
{
  "name": "experiment-name",
  "ticks": 240,
  "seeds": [1, 2, 3, ...],
  "snapshotTicks": [0, 59, 119, 239],
  "seriesMetrics": ["unemployment", "inflation", ...],
  "base": { "sliders": { "scale.households": 500, ... } },
  "conditions": [
    { "id": "S0|fiat", "sliders": { "regime.type": "fiat", ... } },
    ...
  ]
}
```

Each run produces a JSON line with:

```json
{
  "spec": "headline",
  "cond": "S0|fiat",
  "seed": 1,
  "ticks": 240,
  "auditOk": true,
  "end": { "unemployment": 0.051, "inflation": 0.0175, ... },
  "series": { "unemployment": [...], ... },
  "snaps": { "0": {...}, "239": {...} }
}
```

### Validation

Before opening a PR, run the headline suite and compare the results with prior versions to confirm:

- No crashes (all runs have `auditOk: true`)
- No accounting residuals
- Calm unemployment matches expectations
- All regression checks pass

See `docs/PLAN.md` and the validation requirements for details.
