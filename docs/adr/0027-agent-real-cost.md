# ADR 0027: Falling real cost for household agents

## Status

Accepted

## Context

Agent compute was priced as adoption progress times 4 percent of the wage, and firms bought only while the ask stayed
under 4.2 percent of the wage. As more agents spawned, market depth pushed the ask through that cap and trade stopped
for the rest of the run. Output spiked, then collapsed. The cutoff scaled with the nominal wage, so inflation made
agents look permanently uneconomic even when real costs should have been falling. That path was a modeling artifact.

## Decision

- Real unit cost starts at `agent.initialCostShare` times the opening wage and halves every
  `agent.costHalvingMonths` months. An optional energy step multiplies cost by `1 − agent.energyStepSize` from
  `agent.energyStepMonth` onward. The registry default size is 0. Substantial, High, and Extreme set 0.5, 0.75, and 0.9.
- The nominal ask is that real cost scaled by the price level over the opening price level, marked up by payment friction
  and market depth. It is not tied to the current wage. The fee is paid into bank equity from the settled bill.
- Firms buy a smooth share of each agent's unit from the real ask relative to the wage. There is no hard wage-share
  cutoff. A fiat bill that would round below one cent while takeup is positive clears at one cent.
- Bought compute raises capacity with a slope that starts at `ai.computeProductivity` and grows with
  `agent.capabilityGrowth`, saturating at `agent.capabilityCeiling`.
- This path is separate from `ai.computeCostDeclineRate`, which still gates task adoption only.
- The 4 percent wage share and 4.2 percent cap in [ADR 0006](0006-adoption-curve-agents.md) no longer apply to pricing.

## Consequences

`docs/model.md`, `docs/limits.md`, `docs/PLAN.md`, and the AI-claims sliders follow this ADR. Agent-off runs (owner-share
or agents-per-owner ceiling at zero, or a flat automatable share) stay on the prior path. Agent-on runs no longer boom
and permanently shut off when crowding raises the ask.
