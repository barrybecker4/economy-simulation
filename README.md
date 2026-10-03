# economy-simulation

An agent-based simulation of an economy under different monetary regimes. People change assumptions, switch regimes, and compare results across random seeds. The model shows which assumptions a conclusion depends on.

Phase 1 runs the deterministic engine. It does not yet contain households, firms, or markets. The specification is [docs/PLAN.md](docs/PLAN.md). Working agreements are in [AGENTS.md](AGENTS.md).

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

Run a scenario. The phases are empty, so the output records the resolved configuration and an audit of an empty ledger:

```sh
pnpm sim run --scenario scenarios/baseline.json --seed 1 --out run.json
```

Regenerate the assumption list after a slider change, then check it in:

```sh
pnpm sim assumptions --out docs/assumptions.md
pnpm run assumptions:check
```

The web placeholder:

```sh
pnpm --filter @economy-simulation/app dev
```

## Dependencies added for the engine

- `zod` validates scenario files.
- `fast-check` generates the ledger property tests.

## Layout

- `packages/core` — simulation, with no dependency on the DOM
- `packages/cli` — command-line runner
- `packages/app` — Svelte application
- `docs/` — plan, model notes, and architecture decisions
- `scenarios/` — named presets, added in a later phase
