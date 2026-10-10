# ADR 0006: Adoption-curve agents

## Status

Accepted

## Context

Agent counts used to rise in a straight line for five years toward half the households, then stop, while task adoption
was still centered on year 15.
Ownership concentration both picked how many households owned an agent and skewed profit shares, so raising
concentration meant fewer owners.
Agent output was a flat 4 percent of the wage from the first month.

## Decision

- Owner share, agents per owner, and agent output follow the adoption curve. That curve is the logistic set by the
  adoption midpoint and steepness. Its progress is zero when the start and end automatable shares are equal.
- `ai.ownerShareCeiling` defaults to 0.95. `ai.agentsPerOwnerCeiling` defaults to 20. The lowest household ids become
  eligible first. New agents go to the eligible owner with the fewest agents. An existing agent keeps its owner and its
  deposit. Counts only rise.
- Agent output is the same progress times 4 percent of the wage. The 4.2 percent cap still applies to the ask after
  payment friction.
- `ai.ownershipConcentration` only steepens profit shares. It no longer sets the owner count. The autonomy slider is
  removed.
- The adoption midpoint defaults to year 8, with a minimum of 1. Preset midpoints are none 10, modest 8, substantial 5,
  high 3, and extreme 3.
- Robotics defaults are start year 15 and a 12-year ramp, matching the modest preset. Preset robotics years are none
  10/10, modest 15/12, substantial 8/12, high 4/8, and extreme 1/4.
- Extreme ends the automatable share at 0.99. Other presets and a fresh run still end at 0.9.
- The control shows reachable share, one minus the stored physical-task block. Saved scenarios still store the block, so
  an old file keeps its meaning.

## Consequences

A default run can hold on the order of 76,000 agents once the curve saturates (0.95 of 4,000 households, 20 agents each).
Aggregate agent activity grows through that count. The price of one agent's compute unit still levels off at 4 percent
of the wage. `docs/model.md` and `docs/PLAN.md` follow this ADR.
