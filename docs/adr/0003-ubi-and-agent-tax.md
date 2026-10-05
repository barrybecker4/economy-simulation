# ADR 0003: UBI and agent tax

## Status

Accepted

## Context

As AI raises the share of output and the hiring target shrinks, unemployment rises. The existing transfer of 5 percent of employed income to the unemployed shrinks with the wage bill, just when jobless households need money to buy goods. AI agents sold compute and swept almost all of it to owners without paying tax or shopping, so they were outside the tax base and the goods market.

## Decision

- The household grant each month is `government.ubiShare × AI share of output × nominal GDP`, split equally across households. It phases in with AI adoption and scales with the size of the economy. It is not a fixed stipend.
- The default `government.ubiShare` is 0.25. At zero, or when no AI capacity is adopted, the grant is off and the rest of the path matches the previous phase.
- Tax, including tax on AI agents, is collected first. Any shortfall for the grant is bond-financed like a government purchase shortfall.
- AI agents pay the income tax rate, shop with the household budget rule at mean time preference, and sweep only the residual after tax and a compute retain to their owners.
- Well-being, inequality, and related human metrics stay household-only.

## Consequences

`docs/model.md` and the Phase 5–6 acceptance lines follow this ADR. A slider of 1 can outrun the income-tax take once the AI share is large; the default is set so the 600-tick fiat path stays near the inflation target with bounded money and output.
