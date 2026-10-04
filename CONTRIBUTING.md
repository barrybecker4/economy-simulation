# Contributing

## Setup

Node.js 22 or newer and pnpm 9.15.9.

```sh
pnpm install
pnpm run check
```

## Run a sweep

A sweep repeats a small economy across seeds and regimes and writes one JSON object per line. The line includes the git commit and the resolved sliders. `--preset` reads `scenarios/presets/<name>.json`. `--regimes` replaces that file's regime. The command keeps the population small.

```sh
pnpm sim sweep --seeds 4 --ticks 24 --regimes fiat,bitcoin --preset neutral --out sweep.jsonl
```

Hypotheses:

```sh
pnpm sim hypotheses --out hypotheses.json
```

The development-size economy is 1,000 households, 100 firms, and 3 banks. The sweep command above uses a smaller scale so it finishes quickly. Raise seeds only when you mean to wait. Fifty development-size seeds across several regimes can take several minutes.

## Assumptions

Slider defaults, ranges, status, and sources live in `packages/core/src/config/registry.ts`. After a change:

```sh
pnpm sim assumptions --out docs/assumptions.md
pnpm run assumptions:check
```

Status is `sourced`, `calibrated`, or `guess`. A guess must say that no external series was fitted. The web app marks guesses in the assumption ledger.

## New ideas

Open an issue with the template for a new assumption, contract type, or hypothesis. A new mechanism needs a neutral setting that reproduces the previous behavior, a test of that setting, and a section in `docs/model.md`.

Do not add a firm-share exchange, a second country, or AI agents whose goals differ from their owners without a new decision record in `docs/adr/`.
