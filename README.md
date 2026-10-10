# economy-simulation

An agent-based simulation of an economy under different monetary regimes. People change assumptions, switch regimes, and
compare results across random seeds. The model shows which assumptions a conclusion depends on.

The economy has households, firms, banks, a government, and a central bank. You can run it as fiat, bitcoin, or a hybrid
with a lender of last resort. Category prices split the CPI into food and beverages, housing, energy, apparel,
transportation, medical care, education, recreation, and electronics, so some of those prices can cheapen while others
rise. AI adoption and autonomous agents are sliders. Equal start and end automatable shares turn the productivity
channel off, and an owner-share ceiling of zero creates no agents. The registry default is the modest path, bullishness
0.35. The specification is
[docs/PLAN.md](docs/PLAN.md). The equations are in [docs/model.md](docs/model.md). Limits are in
[docs/limits.md](docs/limits.md). Working agreements are in [AGENTS.md](AGENTS.md).

## Requirements

- Node.js 22 or newer
- pnpm 9.15.9 (`corepack enable` then `corepack prepare pnpm@9.15.9 --activate`, or install pnpm directly)

## Commands

```sh
pnpm install
pnpm test
pnpm run typecheck
pnpm run lint
pnpm run check
```

`pnpm run check` runs lint, format check, typecheck, and tests.

Run a scenario. The output records the resolved configuration, the metric series, and the ledger audit:

```sh
pnpm sim run --scenario scenarios/baseline.json --seed 1 --out run.json
```

Compare fiat and bitcoin for one scenario and seed:

```sh
pnpm sim compare --scenario scenarios/baseline.json --seed 1 --left fiat --right bitcoin --out compare.json
```

Sweep seeds and regimes. This uses a small population so it returns quickly. The line format and the hypothesis checks
are described in [CONTRIBUTING.md](CONTRIBUTING.md).

```sh
pnpm sim sweep --seeds 4 --ticks 24 --regimes fiat,bitcoin --preset neutral --out sweep.jsonl
pnpm sim hypotheses --out hypotheses.json
```

Regenerate the assumption list after a slider change, then check it in:

```sh
pnpm sim assumptions --out docs/assumptions.md
pnpm run assumptions:check
```

The web app runs the same simulation in a worker. Presets, the assumption ledger, and the scenario gallery are in
[docs/gallery.md](docs/gallery.md). Methods for H1–H8 are in [docs/methods.md](docs/methods.md).

```sh
pnpm --filter @economy-simulation/app dev
```

A production build is static. GitHub Pages can host it. There is no server to run.

```sh
pnpm --filter @economy-simulation/app build
pnpm --filter @economy-simulation/app preview
```

The build writes `packages/app/dist`. Asset paths are relative to that directory, so the same files work at the root of
a site or in a subdirectory. Copy the contents of `dist` into the website repository, including `assets/` and
`favicon.svg` alongside `index.html`, then commit and push. Files placed in `economy/` are served at
`https://example.github.io/economy/`.

Open the page on the site, or use `preview`. The app is an ES module, so opening `index.html` as a file will not run it.
A link keeps the seed and sliders in the query string. A query parameter whose name starts with `_` is ignored,
including `_ijt`, which an editor adds when it opens the page.

## Dependencies added for the engine

- `zod` validates scenario files.
- `fast-check` generates the ledger property tests.

## Layout

- `packages/core` — simulation, with no dependency on the DOM
- `packages/cli` — command-line runner
- `packages/app` — Svelte application
- `docs/` — plan, model notes, and architecture decisions
- `scenarios/` — baseline and named presets
