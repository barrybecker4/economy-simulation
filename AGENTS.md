# Working agreements

## Overview

An agent-based economy simulator that shows which assumptions a conclusion depends on. TypeScript, pnpm workspaces, Vitest, and Zod. `packages/core` is the simulation, `packages/cli` runs it, and `packages/app` is the Svelte application.

Read [docs/PLAN.md](docs/PLAN.md) and [docs/model.md](docs/model.md) before changing simulation behavior. Decisions that override the original design notes are recorded in `docs/adr/`.

## Phase discipline

- Implement only the phase named in the task. Do not start a later phase.
- Each phase ends when its acceptance criteria pass.
- When a design decision changes, update `docs/PLAN.md` and `docs/model.md` in the same change, and add an ADR if the choice is hard to reverse.

## Simulation rules

- Write tests first for ledger, accounting, and regime logic.
- Fiat money is integer cents. Bitcoin money is a floating-point number of satoshis and may be a fraction of a satoshi. Ratios, rates, and productivity may be floating point.
- Pass the seeded RNG into `packages/core` explicitly, and iterate agents by numeric id. That package stays free of Math.random and Date.now.
- Every movement of money or debt goes through the double-entry ledger.
- Keep every tunable number in the slider registry. No unexplained constants in agent code.
- Agents decide in `decide()` and act through the ledger and markets. They do not modify other agents directly.
- Keep functions small.
- Record why when adding a dependency.

## Layout

- `packages/core`: simulation, no DOM.
- `packages/cli`: runs and, later, sweeps.
- `packages/app`: Svelte application. A placeholder until the web phase.
- `scenarios/`: named presets. Empty until a later phase adds them.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default role labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: the glossary and ADRs live at the repo root. See `docs/agents/domain.md`.
