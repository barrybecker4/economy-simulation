# Working agreements

Read [docs/PLAN.md](docs/PLAN.md) and [docs/model.md](docs/model.md) before changing simulation behavior. [docs/adr/](docs/adr/) records decisions that override the original design notes.

## Phase discipline

- Implement only the phase named in the task. Do not start a later phase.
- Each phase ends when its acceptance criteria pass.
- When a design decision changes, update `docs/PLAN.md` and `docs/model.md` in the same change, and add an ADR if the choice is hard to reverse.

## Simulation rules

- Write tests first for ledger, accounting, and regime logic.
- Fiat money is integer cents. Bitcoin money is a floating-point number of satoshis and may be a fraction of a satoshi. Ratios, rates, and productivity may be floating point.
- Do not call `Math.random` or `Date.now` in `packages/core`. Pass the seeded RNG explicitly. Iterate agents by numeric id.
- Every movement of money or debt goes through the double-entry ledger.
- Keep every tunable number in the slider registry. No unexplained constants in agent code.
- Agents decide in `decide()` and act through the ledger and markets. They do not modify other agents directly.
- Keep functions small.
- Do not add a dependency without noting why.

## Layout

- `packages/core`: simulation, no DOM.
- `packages/cli`: runs and, later, sweeps.
- `packages/app`: Svelte application. A placeholder until the web phase.
- `scenarios/`: named presets. Empty until a later phase adds them.
