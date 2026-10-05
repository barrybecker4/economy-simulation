# Scenario gallery

Named files in `scenarios/presets/` are compositions of orthogonal category options from the catalog in `packages/core/src/config/presets.ts`. Empty `sliders` means every registry default. Choosing one category on the page rewrites only that category's sliders.

| File                                   | Composition                                                                |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `scenarios/baseline.json`              | Defaults, 600 months.                                                      |
| `scenarios/presets/neutral.json`       | Fiat; every category at its default option.                                |
| `scenarios/presets/no-ai.json`         | AI adoption: none (start and end automatable shares both 0.3).             |
| `scenarios/presets/slow-adoption.json` | AI adoption: slow (midpoint year 30, steepness 0.15).                      |
| `scenarios/presets/fast-adoption.json` | AI adoption: fast (midpoint year 5, steepness 1.2). Does not change reach. |
| `scenarios/presets/high-physical.json` | AI reach: narrow (physical-task share 0.7, robotics start year 50).        |
| `scenarios/presets/austrian.json`      | Bitcoin; credit: tight; public finance: small.                             |
| `scenarios/presets/keynesian.json`     | Fiat; public finance: deficit spending; central bank: employment-leaning.  |

Compare two regimes of one preset:

```sh
pnpm sim compare --scenario scenarios/presets/neutral.json --seed 1 --left fiat --right bitcoin --out compare.json
```

The browser has one selector per category (central bank, public finance, credit, AI bullishness, AI adoption, AI reach) plus the regime control. Compare fiat and bitcoin uses the sliders on the page and the seed in the seed box.
