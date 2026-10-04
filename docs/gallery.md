# Scenario gallery

Presets live in `scenarios/presets/`. Each file is a scenario the CLI accepts. Empty `sliders` means every registry default.

| File                                   | What it changes                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `scenarios/baseline.json`              | Defaults, 600 months.                                                                     |
| `scenarios/presets/neutral.json`       | Fiat, moderate shocks, deflation sensitivity 1, physical-task share 0.3.                  |
| `scenarios/presets/no-ai.json`         | Automatable share stays at 0.3, so AI does not raise productivity.                        |
| `scenarios/presets/fast-adoption.json` | Early, steep adoption and a low physical-task share.                                      |
| `scenarios/presets/slow-adoption.json` | Late, flat adoption.                                                                      |
| `scenarios/presets/high-physical.json` | Most tasks stay physical, so AI adds less output.                                         |
| `scenarios/presets/austrian.json`      | Bitcoin, higher capital ratio, smaller government, stronger deflation response.           |
| `scenarios/presets/keynesian.json`     | Fiat, higher public spending, stronger inflation and output weights, easier bank capital. |

Compare two regimes of one preset:

```sh
pnpm sim compare --scenario scenarios/presets/neutral.json --seed 1 --left fiat --right bitcoin --out compare.json
```

The browser preset menu covers neutral, no AI, fast adoption, Austrian-leaning, and Keynesian-leaning. Compare fiat and bitcoin uses the sliders on the page and the seed in the seed box.
