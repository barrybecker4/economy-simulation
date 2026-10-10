# Scenario gallery

Named files in `scenarios/presets/` are compositions of orthogonal category options from the catalog in
`packages/core/src/config/presets.ts`, except `monetary.json`, which is a hand-written comparison file. Empty `sliders`
means every registry default. Choosing one category on the page
rewrites only that category's sliders. Each parameter group starts collapsed with its preset visible; expand the group
to adjust the underlying sliders.

| File                                             | Composition                                                                                                                                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scenarios/baseline.json`                        | Defaults, 600 months.                                                                                                                                                                                                                                                                      |
| `scenarios/presets/neutral.json`                 | Fiat; every category at its default option.                                                                                                                                                                                                                                                |
| `scenarios/presets/no-ai.json`                   | AI bullishness: none (start and end automatable shares both 0.3).                                                                                                                                                                                                                          |
| `scenarios/presets/slow-adoption.json`           | AI bullishness: modest. Empty sliders, so the registry default: bullishness 0.35, midpoint year 8, robotics from year 15 over 12 years.                                                                                                                                                    |
| `scenarios/presets/fast-adoption.json`           | AI bullishness: high (fast adoption, bullishness 1.5, typical reach).                                                                                                                                                                                                                      |
| `scenarios/presets/high-physical.json`           | Same as modest / slow-adoption (kept for CLI name compatibility).                                                                                                                                                                                                                          |
| `scenarios/presets/austrian.json`                | Bitcoin; credit: tight; public finance: small.                                                                                                                                                                                                                                             |
| `scenarios/presets/keynesian.json`               | Fiat; public finance: deficit spending; central bank: employment-leaning.                                                                                                                                                                                                                  |
| `scenarios/presets/monetized-dividend.json`      | Fiat; monetizing; AI dividend; moderate credit; extreme AI.                                                                                                                                                                                                                                |
| `scenarios/presets/hawkish-dividend.json`        | Fiat; hawkish; AI dividend; moderate credit; extreme AI.                                                                                                                                                                                                                                   |
| `scenarios/presets/modest-dividend.json`         | Fiat; monetizing; AI dividend; moderate credit; modest AI.                                                                                                                                                                                                                                 |
| `scenarios/presets/private-surplus.json`         | Fiat; hawkish; private surplus; moderate credit; extreme AI.                                                                                                                                                                                                                               |
| `scenarios/presets/bitcoin-dividend.json`        | Bitcoin; balanced (ignored); AI dividend; moderate credit; extreme AI.                                                                                                                                                                                                                     |
| `scenarios/presets/bitcoin-private-surplus.json` | Bitcoin; balanced (ignored); private surplus; moderate credit; extreme AI.                                                                                                                                                                                                                 |
| `scenarios/presets/monetary.json`                | Not a category composition and not the page opening. Trend weight 0, demand weight 1, deposit pass-through 1, anchor weight 0.5, endogenous credit 1, leverage start 1, household mortgage share 0.25, mortgage LTV 0.95, capital ratio 0.04, opening deposits 12 months, skill sigma 1.1. |

Compare two regimes of one preset:

```sh
pnpm sim compare --scenario scenarios/presets/neutral.json --seed 1 --left fiat --right bitcoin --out compare.json
```

The browser places a Scenario select above the parameter groups for the six named worlds, then each category preset at
the top of its collapsible group (central bank, public finance, credit, AI bullishness), with the regime control on the
monetary-regime group. Chart groups start with only Welfare open; the rest stay collapsed until opened. Pin a run as
the baseline, then run a scenario to overlay both on the charts.
