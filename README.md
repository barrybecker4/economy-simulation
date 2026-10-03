# economy-simulation

An agent-based simulation of an economy under different monetary regimes. People change assumptions, switch regimes, and compare results across random seeds. The model shows which assumptions a conclusion depends on.

Phase 0 is scaffolding. There is no simulation yet. The specification is [docs/PLAN.md](docs/PLAN.md). Working agreements are in [AGENTS.md](AGENTS.md).

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

The command-line runner is a placeholder until Phase 1:

```sh
pnpm sim
```

The web placeholder:

```sh
pnpm --filter @economy-simulation/app dev
```

## Layout

- `packages/core` — simulation, with no dependency on the DOM
- `packages/cli` — command-line runner
- `packages/app` — Svelte application
- `docs/` — plan, model notes, and architecture decisions
- `scenarios/` — named presets, added in a later phase
