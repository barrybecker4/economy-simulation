# ADR 0029: Labor replacement and subagent swarms

## Status

Accepted

## Context

AI bullishness presets capped agent scale at 20 ledger agents per owner and kept hiring on the Phase 17 displacement
formula, `adopted × min(taskGain, 1)`. Unbounded bullishness raised capacity without driving unemployment toward one.
That was deliberate so Extreme did not empty the labor market. Stronger bullish worlds now need hiring to follow the
automated share toward zero jobs, and they need each ledger agent to stand for a swarm without creating millions of
accounts.

## Decision

- `ai.laborReplacement` (default 0) blends the Phase 17 human-weight formula with the residual human-task share
  `1 − inForce`. `inForce` is the automatable-share level reached so far, after robotics and the compute-cost gate,
  including the opening share. At replacement 0 the path stays bit-identical. At 1, a finished curve that ends at 1 can
  leave almost no human jobs. The cost gate is zero in month zero, so replacement does not jump unemployment on the
  first tick.
- Substantial, High, and Extreme set replacement to 0.35, 0.7, and 1. None and Modest leave it at 0.
- Extreme also ends the automatable share at 1, clears the physical block, adopts by year 1, and declines compute cost
  at 0.6 a year, so the hiring target is near full unemployment by about year 4. Measured unemployment still follows the
  structural 5 percent monthly shed; the claim is the target, not a month-60 reading of 99 percent.
- Each agent carries a `subagents` field that rises along the adoption curve from 1 to `agent.subagentCeiling`
  (default 1, max 1,000). The compute bill and capacity units sold are `takeup × subagents`. Market depth still counts
  ledger rows. The capability ceiling is not multiplied by the swarm; a large count saturates `1 + agent.capabilityCeiling`.
- `agent.capabilityCeiling` max rises from 4 to 100. The default stays 1. Extreme sets 50 and a subagent ceiling of
  1,000.

## Consequences

H1 stays the short-run sticky-wage claim. Phase 17's rule that unbounded gain must not drive unemployment to one
becomes: unbounded gain raises capacity only; labor replacement is what lets the natural rate follow the automated
share. When labor replacement is positive, firm capacity counts AI seats in effective labor as
`L + L* × (1 − humanWeight)`, so a firm with no human workers still produces once automation has opened those seats.
At replacement 0 the prior Phase 17 staffing path is unchanged. Hiring, wages, and unemployment stay human-only.
`docs/model.md`, `docs/PLAN.md`, `docs/limits.md`, and the AI bullishness presets follow this ADR.
