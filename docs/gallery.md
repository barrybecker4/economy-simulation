# Scenario gallery

Named files in `scenarios/presets/` are compositions of orthogonal category options from the catalog in
`packages/core/src/config/presets.ts`. Empty `sliders` means every registry default. Choosing one category on the page
rewrites only that category's sliders. Each parameter group starts collapsed with its preset visible; expand the group
to adjust the underlying sliders.

| File                                   | Composition                                                               |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `scenarios/baseline.json`              | Defaults, 600 months.                                                     |
| `scenarios/presets/neutral.json`       | Fiat; every category at its default option.                               |
| `scenarios/presets/no-ai.json`         | AI bullishness: none (start and end automatable shares both 0.3).         |
| `scenarios/presets/slow-adoption.json` | AI bullishness: modest (slow adoption, narrow reach, bullishness 0).      |
| `scenarios/presets/fast-adoption.json` | AI bullishness: high (fast adoption, bullishness 1.5, typical reach).     |
| `scenarios/presets/high-physical.json` | Same as modest / slow-adoption (kept for CLI name compatibility).         |
| `scenarios/presets/austrian.json`      | Bitcoin; credit: tight; public finance: small.                            |
| `scenarios/presets/keynesian.json`     | Fiat; public finance: deficit spending; central bank: employment-leaning. |

Compare two regimes of one preset:

```sh
pnpm sim compare --scenario scenarios/presets/neutral.json --seed 1 --left fiat --right bitcoin --out compare.json
```

The browser places each category preset at the top of its collapsible parameter group (central bank, public finance,
credit, AI bullishness), with the regime control on the monetary-regime group. Chart groups start with only Welfare
open; the rest stay collapsed until opened. Pin a run as the baseline, then run a scenario to overlay both on the
charts.
