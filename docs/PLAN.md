# Agent-based economy simulator

This is the specification for the repository. It starts from the design note at
<https://docs.google.com/document/d/12w2ni7WsYEOZ_c9pAwSWFjAKsSMPBAEgOaM7XEYCwDQ/edit>. Where that note and this file
disagree, this file wins. Those disagreements are recorded in [ADR 0002](adr/0002-money-agents-prices-welfare.md).

The simulation cannot show that one monetary system is better in the real world. It shows which assumptions a conclusion
depends on.

Give an implementer one phase at a time. Example: "Implement Phase 1 of docs/PLAN.md. Follow AGENTS.md. Do not start
Phase 2."

## Principles

- Determinism: the same seed and configuration produce the same output. `packages/core` never calls `Math.random`,
  `Date.now`, or any other source of nondeterminism.
- Stock-flow consistency: every movement of money or debt goes through a double-entry ledger. No agent creates or
  destroys money except through the active regime.
- Questions decide roles: a variable used to draw a conclusion is an output, never a slider. A variable the user wants
  to assume is a slider.
- Every slider is documented: units, range, default, justification, and a status of sourced, calibrated, or guess.
- Simple first: each phase adds one mechanism, validates it, and only then moves on. Each mechanism has a neutral
  setting that reproduces the previous phase.
- Core logic is independent of the user interface. The simulation runs in Node and in a browser worker with identical
  results on the same runtime.

## Technology and layout

- TypeScript strict, pnpm workspaces, Vitest, fast-check, Zod.
- Web application: Svelte and Vite, charts with uPlot, simulation in a Web Worker.
- Continuous integration: GitHub Actions runs lint, format check, typecheck, and tests.
- Deployment, in the last phase: manual upload of the static application build (`packages/app/dist`) to a static host.
  No server for the first release.
- Optional analysis notebooks live in `packages/analysis` when the experiment phase needs them.

Layout:

- `AGENTS.md` and `.cursor/rules/`
- `docs/PLAN.md`, `docs/model.md`, `docs/assumptions.md` (generated in Phase 1), `docs/adr/`
- `packages/core`: `rng`, `ledger`, `config`, `engine`, `agents`, `markets`, `goods`, `contracts`, `regimes`, `ai`,
  `shocks`, `metrics`
- `packages/cli`
- `packages/app`
- `scenarios/`
- `.github/workflows/ci.yml`

## Conventions

- Read this file and `docs/model.md` before changing simulation behavior.
- Write tests first for ledger, accounting, and regime logic.
- Fiat money is integer cents, checked for overflow. One balance stays inside 2^53 − 1. An aggregate ledger account
  may hold the sum up to 2^63 − 1. Bitcoin money is an IEEE-754 double in satoshis and may be fractional. The fiat audit
  is exact. The bitcoin audit uses a relative epsilon. Output hashes use a canonical decimal format. Ratios, rates,
  and productivity may be floating point.
- Use the seeded RNG and pass it explicitly. Iterate agents by numeric id. Give agents independent streams so one
  agent's draws do not move another's.
- Keep every tunable in the slider registry.
- Agents decide in `decide()` and act through the ledger and markets.
- Do not add a dependency without noting why.
- Do not start a later phase.

## Time and scale

- One tick is one month. A default run is 50 years (600 ticks). Both are configuration.
- Development population: 4,000 households, 200 firms, 4 banks, about 20 households per firm. Release target: 10,000 households and 500 firms.
- The agent count is a share of households, not a hard cap.
- Performance, measured and adjusted as phases land: a development run of 600 ticks finishes in about 7 seconds in Node. A release-size run stays under 15 seconds.

## Domain model

### Actors

A household is one human. An agent is an autonomous actor owned by one household. One household may own many agents, and
many households own none.

| Actor        | Role                                                                    | Main decisions                                                                      |
| ------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Household    | Supplies labor, consumes, saves, borrows, owns firms, homes, and agents | Consumption, saving, borrowing, which job to accept, which housing contract to use  |
| Firm         | Produces goods, employs households, rents or owns AI capacity           | Price, wage offers, hiring, investment, adoption of AI, profit-sharing versus loans |
| Bank         | Accepts deposits and makes loans                                        | Lending volume and interest rate, subject to the regime                             |
| Government   | Taxes, spends, and issues debt                                          | Spending, transfers, and borrowing                                                  |
| Central bank | Fiat and hybrid regimes only                                            | Policy rate by rule, optional asset purchases, lender of last resort in the hybrid  |
| Agent        | Sells compute and transacts on its own account                          | How to spend its compute budget                                                     |

### Markets

- Labor: firms post wages and vacancies, humans search, matching is random with a limit on applications per tick.
- Goods: buyers sample firms and prefer lower prices. Firms hold inventory. Categories gain their own prices in Phase 3.
- Credit: banks supply loans to firms and households, until the contract phase replaces some of that credit.
- Bonds, from the fiat economy onward: the government sells bonds and banks, households, or the central bank buy them.
- Compute, from the AI productivity phase: firms buy AI capacity at a price that falls over time.
- Property, from the relative-price phase: scarce real assets clear separately from the consumption basket.

### Behavioral rules to write into docs/model.md

These are starting rules. Mark each as sourced or as a guess when it is implemented.

- Production: output equals productivity A times capital K to the power alpha times effective labor L to the power one
  minus alpha. Alpha defaults to 0.33.
- Wage setting: the agreed wage is the price level times the opening real wage times productivity and labor-market
  tightness. Employees close a shortfall and employers close an excess. Nominal rigidity is the share of that gap left
  for next month, so a high rigidity means wages adjust slowly in both directions.
- Pricing: unit cost times one plus a markup, adjusted up when inventory is low and down when inventory is high.
- Consumption: a household consumes a fraction of expected income plus a smaller fraction of wealth. The fractions
  depend on time preference.
- Investment: firms invest when expected demand exceeds capacity, financed first from retained earnings and then by
  loans.
- Failure: a firm with negative equity for a set number of ticks goes bankrupt, its loans are written off against the
  bank's capital, and a new firm may enter.
- Central bank, fiat: policy rate equals the neutral real rate plus inflation plus a weight on the inflation gap plus a
  weight on the output gap.

### The same variable changes role by regime

| Variable           | Fiat                                               | Bitcoin standard                                                             |
| ------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Base money supply  | Set by the central bank rule                       | Fixed by the protocol schedule                                               |
| Interest rate      | Policy rule                                        | Output that clears loanable funds                                            |
| Credit expansion   | Output, limited by reserve and capital rules       | Output, limited by willingness to lend saved funds, and reduced by deflation |
| Price level        | Output                                             | Output, in fractional satoshis                                               |
| Government deficit | Slider, financed by bonds the central bank may buy | Slider, financed only by taxes or market borrowing                           |

### Relative prices

Phase 2 uses one consumption good. The current basket is the nine CPI categories in [docs/model.md](model.md): food and
beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics. Each has a
price in the regime's unit. Housing supply and the category productivity rates move those prices apart. The
expenditure-weighted average is the CPI.

Headline inflation is the change in that index. It can sit near the fiat target, or fall under bitcoin, while
electronics and apparel cheapen and housing, energy, medical care, and education rise.

### Deflation and contracts

Expected inflation is the recent change in the headline index. Deflation `d` is zero when that change is positive, and
the absolute value when it is negative. A sensitivity slider scales behavior by `d`:

- Loan demand, bank willingness to lend, and speculative bids for property fall as `d` rises.
- Nominal debt, including mortgages and tradeable equity, loses weight as `d` rises.
- Replacement contracts gain weight as `d` rises.

First contract families:

- Profit-sharing. A firm raises funds by promising a fraction of future profits. The claim is not a share with a
  speculative price. With sensitivity at zero, or with no deflation, firms use retained earnings and ordinary loans, and
  profit-sharing stays unused.
- Housing, chosen per household:
  - Nominal mortgage, in the fiat regime.
  - Bitcoin-collateralized loan, with a loan-to-value limit and liquidation if the collateral ratio breaks.
  - Targeted savings cooperative: members save toward a home and take turns drawing the pool.
  - Rent-to-own: rent accumulates a claim without a large nominal debt.

Agents choose the contract with the lowest expected real burden given `d`. These two families are the first entries. The
menu can grow later.

### How outcomes are judged

Every tick records level and distribution. Human metrics use human agents only. AI agents are reported through
composition metrics, not through well-being.

- Inequality: Gini of wealth, income, and consumption; top-decile wealth share; bottom-quintile wealth share; total real
  wealth (the pie those shares divide).
- Wealth and income: mean and median real wealth; mean and median real income.
- Consumption: mean and median real consumption; share of humans below a consumption floor.
- Well-being: log real consumption plus 0.5 times a housing-security score. Security is lowest when unhoused, higher
  when renting or waiting in a cooperative, higher as rent-to-own vests, and highest when the home is owned. Report
  mean, median, and the consumption-floor share.
- Composition: AI share of agents, wealth, output, and transactions.
- Stability: unemployment, defaults, bank failures, credit relative to GDP, boom and bust length.

The default comparison shows these side by side. There is no composite index.

Other outputs recorded every tick: real GDP and growth, productivity per human, price level and category prices,
inflation, interest rates, money supply, velocity, labor share, share of tasks automated.

### How AI enters

Three channels, each with its own sliders.

1. Productivity through task automation. The automatable share follows an S-curve from `ai.automatableShareStart` to
   `ai.automatableShareEnd`. A stored block `ai.physicalTaskShare` keeps part of that rise out of firm capacity until
   robotics. The control shows the reachable share, one minus the block. Effective labor is human hours plus AI
   labor-equivalents, limited by the automatable share.
2. AI capital, cost, and ownership. Compute cost falls at `ai.computeCostDeclineRate`. Firms adopt AI when its cost per
   task is below the wage. Returns go to owners. `ai.ownershipConcentration` sets how steeply those profits skew across
   owners.
3. AI agents as economic actors. Owner share and agents per owner follow the same adoption curve toward
   `ai.ownerShareCeiling` and `ai.agentsPerOwnerCeiling`. Earnings accrue to a household owner. Payment friction is
   `ai.paymentFrictionFiat` or `ai.paymentFrictionBitcoin`. Those friction defaults are guesses.

### Initial slider registry

The registry default is a 2026-trajectory baseline: money choice is on, most later mechanisms run at modest strength,
and fiat expands hard in a crisis. Setting a later mechanism to 0 (or `off`) still reproduces the feature-off path from
the phase that added it. Each slider also has a plain-language description and a status of sourced, calibrated, or
guess. The full list is generated into `docs/assumptions.md`.

| Group       | Slider id                              | Default         | Range                        |
| ----------- | -------------------------------------- | --------------- | ---------------------------- |
| Behavior    | household.timePreferenceMean (annual)  | 0.04            | 0.01 to 0.15                 |
| Behavior    | household.timePreferenceStd            | 0.02            | 0 to 0.08                    |
| Behavior    | household.inflationTimePreference      | 0.1             | 0 to 0.5                     |
| Behavior    | household.skillSigma                   | 0.7             | 0.1 to 1.2                   |
| Behavior    | firm.markup                            | 0.2             | 0.05 to 0.6                  |
| Behavior    | firm.priceAdjustSpeed                  | 0.3             | 0.05 to 1                    |
| Behavior    | wage.nominalRigidity                   | 0.9             | 0 to 0.95                    |
| Environment | productivity.baseGrowth (annual)       | 0.01            | 0 to 0.04                    |
| Environment | population.growth (annual)             | 0.005           | -0.01 to 0.02                |
| Environment | shock.frequency (per year)             | 0.1             | 0 to 1                       |
| Environment | shock.size                             | 0.05            | 0 to 0.3                     |
| Policy      | tax.incomeRate                         | 0.2             | 0 to 0.5                     |
| Policy      | government.spendingShareOfGDP          | 0.2             | 0 to 0.5                     |
| Policy      | government.ubiShare                    | 0.25            | 0 to 1                       |
| Policy      | centralBank.inflationTarget            | 0.02            | 0 to 0.06                    |
| Policy      | centralBank.inflationWeight            | 1.5             | 1 to 3                       |
| Policy      | centralBank.outputWeight               | 1               | 0 to 1.5                     |
| Policy      | bank.reserveRequirement                | 0.1             | 0 to 0.3                     |
| Policy      | bank.capitalRatio                      | 0.06            | 0.04 to 0.2                  |
| Regime      | regime.type                            | fiat            | fiat, bitcoin, hybrid        |
| Regime      | bitcoin.lendingModel                   | maturityMatched | maturityMatched, fullReserve |
| Goods       | goods.electronicsProductivity (annual) | 0.08            | 0 to 0.3                     |
| Goods       | goods.foodProductivity (annual)        | 0.01            | 0 to 0.3                     |
| Goods       | goods.housingSupplyGrowth (annual)     | 0.004           | -0.01 to 0.02                |
| Goods       | goods.energyProductivity (annual)      | 0.005           | 0 to 0.3                     |
| Goods       | goods.apparelProductivity (annual)     | 0.04            | 0 to 0.3                     |
| Goods       | goods.transportProductivity (annual)   | 0.02            | 0 to 0.3                     |
| Goods       | goods.medicalProductivity (annual)     | 0.003           | 0 to 0.3                     |
| Goods       | goods.educationProductivity (annual)   | 0.001           | 0 to 0.3                     |
| Goods       | goods.recreationProductivity (annual)  | 0.03            | 0 to 0.3                     |
| Contracts   | deflation.sensitivity                  | 1               | 0 to 5                       |
| AI          | ai.automatableShareStart               | 0.1             | 0 to 0.5                     |
| AI          | ai.automatableShareEnd                 | 0.9             | 0.3 to 1                     |
| AI          | ai.adoptionMidpointYear                | 8               | 1 to 40                      |
| AI          | ai.adoptionSteepness                   | 0.15            | 0.1 to 1.5                   |
| AI          | ai.computeCostDeclineRate (annual)     | 0.3             | 0 to 0.6                     |
| AI          | ai.physicalTaskShare                   | 0.7             | 0 to 0.7                     |
| AI          | ai.bullishness                         | 0.35            | 0 to 2                       |
| AI          | ai.roboticsStartYear                   | 15              | 0 to 50                      |
| AI          | ai.roboticsRampYears                   | 12              | 1 to 30                      |
| AI          | ai.ownershipConcentration              | 0.8             | 0.1 to 0.99                  |
| AI          | ai.ownerShareCeiling                   | 0.95            | 0 to 1                       |
| AI          | ai.agentsPerOwnerCeiling               | 20              | 0 to 50                      |
| AI          | ai.paymentFrictionFiat                 | 0.02            | 0 to 0.1                     |
| AI          | ai.paymentFrictionBitcoin              | 0.005           | 0 to 0.1                     |

Housing security enters well-being at a fixed weight of 0.5. It is not a slider.

### Hypotheses

| Id  | Hypothesis                                                                                                                                                                | Sweep                                                                 | Outputs                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| H1  | Under a fixed money supply, rapid AI productivity growth lowers the price level, and with rigid nominal wages this raises unemployment and debt burdens in the short run. | regime.type, ai.adoptionSteepness, wage.nominalRigidity               | Price level, unemployment, defaults, credit relative to GDP |
| H2  | A central bank that targets inflation smooths the transition to AI-driven growth more than a fixed supply does.                                                           | regime.type, centralBank.inflationWeight, shock.size                  | Output volatility, boom-bust amplitude                      |
| H3  | AI adoption raises capital share or productivity per human, and ownership concentration changes the wealth Gini.                                                           | ai.ownershipConcentration, regime.type                                | Capital share, productivity per human, wealth Gini          |
| H4  | Lower payment friction for AI agents increases their share of transactions.                                                                                               | ai.paymentFrictionFiat, ai.paymentFrictionBitcoin, regime.type        | AI transaction share, GDP growth                            |
| H5  | Credit-driven booms are smaller when lending is limited to saved funds.                                                                                                   | bitcoin.lendingModel, bank.reserveRequirement, regime.type            | Credit relative to GDP, bank failures, boom-bust amplitude  |
| H6  | A physical bottleneck limits how much AI raises growth, regardless of regime.                                                                                             | ai.physicalTaskShare, regime.type                                     | GDP growth, productivity per human                          |
| H7  | Stronger deflation reduces credit, borrowing, and speculation, and raises profit-sharing and non-mortgage housing.                                                        | deflation.sensitivity, regime.type, productivity.baseGrowth           | Credit relative to GDP, property turnover, contract shares  |
| H8  | Electronics get cheaper and housing gets more expensive inside either headline inflation path.                                                                            | goods.electronicsProductivity, goods.housingSupplyGrowth, regime.type | Relative prices, CPI                                        |
| H10 | Fiat crisis stimulus that props up insolvent firms can leave a deeper bitcoin trough that recovers sooner and ends with higher real GDP.                                   | regime.type, centralBank.zombieSupport, credit shock size 0.3, wage.nominalRigidity 0.9, stimulus 1, stimulusLag 3, 60 households | Peak unemployment, months to recover, end real GDP          |

## Phases

### Phase 0: Repository scaffolding

Goal: tests, lint, and continuous integration run. No simulation logic.

1. pnpm workspace with `packages/core`, `packages/cli`, and `packages/app` (the app may be a placeholder).
2. TypeScript strict, ESLint, Prettier, and Vitest.
3. `AGENTS.md`, `.cursor/rules`, this file, an outline `docs/model.md`, and `docs/adr/0001-record-decisions.md`.
4. GitHub Actions: install, lint, typecheck, test.
5. README with the project goal, how to run tests, and how to run the CLI placeholder.

Acceptance:

- A fresh clone runs `pnpm install` and `pnpm test`.
- Continuous integration passes on a pull request.
- A lint rule fails the build if `Math.random` or `Date.now` is used inside `packages/core`.

### Phase 1: Deterministic engine core

Goal: random numbers, the ledger, configuration, the scheduler, and metrics. No agents, markets, or regimes.

1. Seeded RNG (sfc32 or similar) with uniform, normal, lognormal, Poisson, and weighted choice. Support splitting into
   independent streams.
2. Double-entry ledger. Fiat uses integer cents and an exact audit. Bitcoin uses floating-point satoshis and a
   relative-epsilon audit.
3. Slider registry: id, label, group, unit, default, min, max, description, source, and status. Validate scenarios with
   Zod.
4. Scenario loader that merges a preset, overrides, and the seed, and records the resolved configuration.
5. Tick scheduler in a fixed order: shocks, population mix, labor market, production, goods and asset markets, contract
   choice, credit, government, central bank, bookkeeping, welfare metrics. Later phases fill the empty steps.
6. Metrics recorder for the welfare series and the other outputs, exportable to JSON and CSV.
7. CLI: `run --scenario file --seed n --out file`.
8. Generator for `docs/assumptions.md`. CI fails if the file is stale.

Acceptance:

- Two runs with the same seed and scenario produce identical output hashes.
- Property tests show that random transfers satisfy the audit, including fractional satoshi transfers.
- Changing one agent's behavior does not change the random draws used by other agents.
- `docs/assumptions.md` is generated and CI fails if it is out of date.

### Phase 2: Minimal fiat economy

Goal: a stable single-good fiat economy with human agents, firms, one commercial bank, a government, and a central bank.
AI share is fixed at zero.

1. Households with skill, time preference, wealth, labor supply, and consumption.
2. Firms with production, pricing, wages, hiring, investment, borrowing, and bankruptcy with entry.
3. Labor market with limited search and random matching.
4. Goods market with sampled shopping and inventories.
5. Commercial bank with deposit creation, a reserve requirement, and a capital ratio.
6. Government with income tax, spending, transfers, and bonds. Central bank with the rate rule and optional bond
   purchases.
7. Shocks: productivity, demand, and credit, from the seeded generator.
8. Write `docs/model.md` for every rule, with equations and the reason for each choice.
9. Record inequality, mean and median real wealth, mean and median real consumption, and consumption well-being.
10. Stylized-facts tests (see Validation).

Acceptance:

- The ledger audit passes at every tick.
- With the automatable start and end shares equal and no shocks, unemployment stays between 3 and 12 percent. With
  default sliders and no shocks, final unemployment sits above 6 percent as AI raises the natural rate, inflation stays
  within 2 points of the target, and no variable grows without bound over 600 ticks.
- The stylized-facts tests pass for fiat.
- Development-size runs meet the performance target.

Out of scope: bitcoin, relative prices, contract switching, and AI.

### Phase 3: Relative prices

Goal: different goods can inflate differently inside the fiat economy.

1. Split the CPI into food and beverages, housing, energy, apparel, transportation, medical care, education, recreation,
   and electronics.
2. CPI is the expenditure-weighted average of those categories. Housing security uses the housing price relative to the
   CPI.
3. A neutral setting with every category productivity and housing supply growth equal to baseline productivity
   reproduces one price.

Acceptance:

- Raising electronics productivity lowers that relative price.
- Tightening housing supply raises that relative price.
- Headline CPI can stay near target while those relative prices move in opposite directions.
- The ledger audit still passes.

### Phase 4: Bitcoin standard, hybrid, and contract shift

Goal: a second rule set selected by `regime.type`, plus financing that responds to deflation.

1. A regime interface for base-money creation, the lending constraint, the interest-rate mechanism, and government
   financing. Move fiat behind it without changing behavior when `deflation.sensitivity` is zero.
2. Bitcoin: base money follows a fixed schedule (zero growth by default), balances are fractional satoshis, no central
   bank, government borrows only at market rates.
3. Lending models: maturity-matched time deposits, and full-reserve loans from explicit savings.
4. Interest rate discovery: move the loan rate toward the level that equates supplied savings with loan demand.
5. Hybrid: a fixed-supply base asset and a central bank limited to lender of last resort.
6. Deflation penalty and the contract menu (profit-sharing, mortgage, bitcoin-collateralized loan, savings cooperative,
   rent-to-own).
7. CLI comparison of the same seeds under two regimes, including the welfare dashboard.
8. Extend `docs/model.md` and the stylized-facts tests where the facts apply.

Acceptance:

- The ledger audit passes in every regime.
- Fiat results from Phase 3 are unchanged when deflation sensitivity is zero.
- Total base money never exceeds the bitcoin schedule, and credit never exceeds savings made available to lend.
- With default productivity growth and no shocks, the CPI trends down under bitcoin and up under fiat, and both
  economies stay stable.
- Category prices still diverge inside that trend.
- A larger deflation rate lowers credit relative to GDP and property turnover, and raises the share of profit-sharing
  and non-mortgage housing.

Out of scope: AI mechanisms.

### Phase 5: AI productivity and ownership

Goal: channels 1 and 2. AI raises productivity and can displace workers. AI agents do not yet transact.

1. Task-based production and the S-curve automatable share.
2. AI capacity as an input with a falling compute cost, adopted when cost per task beats the wage.
3. AI capital income across owners, skewed by `ai.ownershipConcentration`.
4. Displaced workers search less effectively when their skills match automated tasks.
5. Outputs: labor share, AI share of output, share of tasks automated, Gini, top decile.
6. Presets as category compositions: no-AI (AI bullishness none), modest / slow adoption, high / fast adoption, and
   extreme.
   AI bullishness is one category that sets the productivity gain, the adoption curve, and the physical-task ceiling
   together.
7. Write the channel 1 and 2 sections of `docs/model.md`.

Acceptance:

- Setting `ai.automatableShareEnd` equal to `ai.automatableShareStart` matches Phase 4 for the same seeds.
- In the fast-adoption preset, productivity per human rises, the labor share falls, and unemployment rises without
  cutting real GDP, in both regimes.
- Raising `ai.physicalTaskShare` lowers the growth benefit of AI (monotonicity).
- The household grant is zero when the AI share of output is zero or `government.ubiShare` is zero, and positive under
  fast adoption.
- The ledger audit passes in all regimes with AI enabled.

### Phase 6: AI agents as economic actors

Goal: channel 3. An increasing share of the agent population transacts on its own account.

1. AI agents have an owner, a balance in the regime's unit, a compute budget, and a service price. They sell services to
   firms, buy goods, and pay income tax.
2. Owner share, agents per owner, and agent output follow the adoption curve toward their ceilings.
3. Each agent transaction pays the regime's friction slider. The fee goes to banks under fiat and to the network under
   bitcoin.
4. An agent-to-agent market discovers a price for services.
5. Outputs: AI transaction share, payment volume, fee revenue, and the share of GDP that is agent-to-agent trade.
6. After tax and shopping, earnings above a retained compute share sweep to human owners each tick.
7. Write the channel 3 section of `docs/model.md`. List which assumptions are guesses.

Acceptance:

- An owner-share ceiling of zero matches Phase 5 for the same seeds.
- Money is conserved on agent-to-agent trades, including fractional satoshi fees.
- Lower friction raises the AI transaction share (monotonicity).
- With a positive owner-share ceiling, agents pay income tax and buy goods.
- A high end share, at least half of agents, still meets the development performance target.

Out of scope: AI agents whose goals differ from their owners, and a market for firm shares.

### Phase 7: Experiment tooling

Goal: test hypotheses across seeds and parameter values.

1. CLI batch runner for a sweep file: sliders, regimes, and seed count, in worker threads.
2. Store JSON lines with the resolved configuration and git commit.
3. For every welfare series: mean, median, and 5th and 95th percentiles across seeds, and paired differences between
   regimes for the same seed.
4. Morris screening in TypeScript. Optional Python notebook for Sobol indices.
5. Presets as category compositions: Austrian-leaning (bitcoin, tight credit, small public finance), Keynesian-leaning
   (fiat, deficit spending, employment-leaning central bank), and neutral (every category at its default).
6. A hypothesis runner for H1–H8.

Acceptance:

- A sweep of 5 regime-and-preset combinations by 50 development-size seeds finishes in under 5 minutes.
- The same sweep file and commit give identical results on two machines, using the canonical money format.
- The runner writes a report for H1–H8 with no manual steps.

### Phase 8: Web application

Goal: change assumptions, run a scenario in the browser, and compare regimes.

1. Run the simulation in a Web Worker and stream results so the page stays responsive.
2. Slider panel generated from the registry, grouped, with a tooltip for description, source, and status.
3. Regime toggle and a pinned-baseline overlay of the same seed:
   freeze a run (one seed or a multi-seed median), edit the scenario,
   and draw both on each chart with a solid baseline and a dashed scenario in the same color.
   While a baseline is pinned, scale and population growth stay at the baseline values.
   The legend lists each series once. Hovering that item highlights the baseline and the scenario together.
   A pinned pair also draws the month payment diagram as baseline beside scenario, with edge amounts on hover instead of
   a legend,
   and stacks the scenario wealth-by-fifth and job-mix bars directly under the baseline bars.
   This month also shows total real wealth (the stock those shares divide) and real GDP (the output pie) side by side.
   Those legends read the baseline share, then the scenario. Under each comparison chart,
   a caption states how the scenario differs at the last month, mentions the rest of the path only when a strict
   majority of months disagrees,
   and calls the change an improvement or worse only for well-being, unemployment, inequality, total wealth, living
   standards, real GDP,
   and productivity per human. When a money chart's baseline and scenario use different units,
   dollars (or cents, at or below 1,000 cents) are the left axis and satoshis are the right axis, and the caption does
   not score that pair.
4. Charts with uPlot for the welfare dashboard and category prices.
   Hovering a legend item highlights that line.
   The horizontal axis labels each month of the run as a calendar month, starting at the month the page is viewed.
   Seed selector and a seed-count field beside months. One seed draws that path. More than one seed draws the median,
   and CPI also shows the 5th to the 95th percentile when no baseline is overlaid.
   The shocks chart is the exception: it draws the mean absolute impulse of each type, so a larger shock counts more
   than a smaller one, because the median impulse is zero whenever a shock is missing from half the seeds.
   Shaded bands and vertical rules mark demand, credit, and productivity shocks and a fiat-to-bitcoin transition;
   the cursor legend names the event under the pointer.
5. Shareable links encode the resolved configuration.
6. Assumption ledger: sliders that differ from the default, with guesses flagged.
7. Orthogonal category selectors on each collapsible parameter group (central bank, public finance, credit, AI
   bullishness), each rewriting only its owned sliders. Groups start collapsed so the presets are visible first.
8. Keyboard-operable controls and chart descriptions.

Acceptance:

- A development-size run finishes in the browser in under three seconds.
- A shared link reproduces the same series on another computer. Date labels follow the month when that computer views
  the page.
- The application works without a server.

### Phase 9: Calibration, documentation, and release

Goal: make the model credible enough to share.

1. For each slider, record a source, a calibrated target, or the label guess. Guesses are marked in the application.
2. Finish `docs/model.md`, including every equation, and write a one-page limits note: a few goods rather than every
   product, no international trade, no firm-share exchange, and well-being adds housing security at a fixed weight of
   0.5.
3. A methods note for each hypothesis.
4. A gallery of example scenarios.
5. Build the static application (`pnpm --filter @economy-simulation/app build`) and deploy `packages/app/dist` manually
   to a static host.
6. Contribution guide and an issue template for new assumptions, contract types, or hypotheses.

Acceptance:

- Every slider has a status and a source or an explicit guess.
- The deployed application matches the CLI for the same seed and scenario.
- A new contributor can run a sweep from the README alone.

### Phase 10: Spending and prices respond to deflation

Goal: expected deflation can cut discretionary spending, and prices can follow excess demand, without emptying the food
and housing floor.

1. Split each household's goods budget into a food and housing floor (the sum of those CPI weights) and a discretionary
   remainder.
2. `household.realReturnSensitivity` multiplies only the remainder by `max(0, 1 − sensitivity × real return)` when the
   real return on money is positive. The real return is the deposit rate minus year-over-year inflation. Deposits pay
   nothing until a later phase. At sensitivity 0 the budget is unchanged.
3. `prices.trendWeight` mixes the regime price trend with excess demand (desired goods spending relative to nominal
   capacity). At 1 the posted-price rule is unchanged.

Acceptance:

- Sensitivity 0 and trend weight 1 match the previous phase for the same seeds.
- Under deflation, a higher sensitivity cuts household goods spending, and spending stays at or above the food and
  housing floor.
- With trend weight 0, a negative demand impulse ends at a lower CPI than the same seed at trend weight 1.
- The ledger audit still passes.

Out of scope: household credit, wage-driven hiring, fiscal monetization, and a transition.

### Phase 11: The wage sets employment

Goal: sticky money wages can raise unemployment when prices fall.

1. `labor.wageElasticity` scales the hiring quota when the real wage is high or low relative to productivity. The
   default is 0.5. At 0 the quota is unchanged.

Acceptance:

- Elasticity 0 matches Phase 10 for the same seeds.
- Under a falling price level with high nominal wage rigidity and elasticity above 0, unemployment ends higher than in
  the flexible-wage run.

### Phase 12: Household debts and housing tenure

Goal: households choose tenure and borrow for discretionary spending; deflation raises the burden of nominal mortgages
and cuts new consumer credit without removing the food and housing floor.

1. `housing.tenureChoice` defaults to `off`. Off keeps the penalty formulas for profit-sharing, non-mortgage housing,
   and property turnover.
2. On: each household picks rent, mortgage, or owned by expected real burden. Shelter payments stay inside the Phase 10
   floor. Consumer loans fund only discretionary spending and fall as expected deflation rises.
3. Measured shares and debt-service series replace the penalty formulas when the switch is on. Household loans join
   `totalLoans`.
4. On, households open already housed. `housing.openingOwnerShare` defaults to 0.655 and
   `housing.openingMortgageShareOfOwners` defaults to 0.62, about the 2026 U.S. split of owners, mortgagors, and
   renters. The highest-skill households own outright. Opening mortgages are outstanding principal, scaled per bank so
   reserves still cover the reserve requirement. Off still opens with no household loans.

Acceptance:

- `off` matches Phase 11, and H7 still holds.
- `on` opens near a 65.5 percent owner share and a 34.5 percent renter share.
- `on`, stronger expected deflation lowers the mortgage share and new consumer borrowing, keeps goods spending at or
  above the floor, and raises debt service for existing mortgages.
- Household loan creation and repayment pass the ledger audit.

### Phase 13: Investment clears a hurdle

Goal: firms invest only when expected return beats the real return on money plus a premium.

1. `firm.investmentHurdle` defaults to `off`. Off keeps the scheduled capital rule and the profit-sharing formula.
2. On: install capital only when expected profit clears the hurdle; otherwise fund with a profit-sharing claim.
   `profitSharingShare` becomes the measured finance share.

Acceptance:

- `off` matches Phase 12.
- `on`, higher expected deflation cuts real investment and new firm borrowing and raises the measured profit-sharing
  share.
- Bitcoin credit still cannot exceed unused savings.

### Phase 14: Fiscal policy has different constraints

Goal: fiat can monetize bonds and stabilize spending; bitcoin cannot; the policy rate can pull discretionary spending
through deposit interest.

1. `bank.depositPassThrough` pays a fraction of the policy rate on deposits. It can cut discretionary spending and new
   consumer credit, not the food and housing floor.
2. `centralBank.bondPurchaseShare` lets the fiat central bank buy a share of new bonds with new reserves. Bitcoin and
   hybrid ignore it.
3. `government.stabilizer` raises the fiat spending share with the unemployment gap. Under bitcoin, spending is limited
   to tax revenue plus bonds banks can hold without new base money.

Acceptance:

- All three at 0 match Phase 13.
- Under fiat, a demand shock with higher stabilizer and bond purchases ends with a smaller output drop and higher base
  money.
- The same shock under bitcoin does not raise base money, and spending does not rise with the stabilizer.
- Pass-through above 0 lets a higher fiat policy rate cut discretionary spending and new consumer credit while leaving
  the floor in place.

### Phase 15: A one-time transition

Goal: a separate scenario rebases a fiat economy into bitcoin over a window, including existing debts and the
distribution of new base-money holdings.

1. `transition.lengthMonths` defaults to 0 (no transition). A positive length starts on fiat and rebases into satoshis
   over those months.
2. Nominal debts convert at the same rate as deposits unless `transition.debtHaircut` writes part of them off.
   `transition.holderConcentration` assigns new base-money balances.
3. After the window the regime is bitcoin and Phase 14 monetization is off. There is no second goods price.

Acceptance:

- Length 0 matches steady fiat and bitcoin from Phase 14.
- A positive length conserves the ledger at conversion ticks, puts base money on the bitcoin schedule afterward, and
  raises wealth Gini when holder concentration is higher.
- A methods note compares 120-month runs across steady fiat, steady bitcoin, and the transition, with seed bands.

### Phase 16: Inflation raises impatience a little

Goal: goods spending rises slightly when inflation is above the regime's normal path, while the time-preference slider
and the fiat policy rate stay fixed.

1. `household.inflationTimePreference` defaults to 0.1. The goods spending share rises by this coefficient times
   (year-over-year inflation minus normal inflation).
2. Normal inflation is the inflation target under fiat and minus `productivity.baseGrowth` under bitcoin and hybrid. At
   sensitivity 0 the spending share ignores inflation.
3. Household draws of time preference and the fiat policy rate still use `household.timePreferenceMean` alone. AI agents
   shop at the mean plus the same common addend.

Acceptance:

- Sensitivity 0 matches Phase 15 spending for the same seeds.
- When measured inflation equals normal inflation, the addend is zero.
- A positive inflation gap raises the spending share by sensitivity times the gap.
- The fiat policy rate rule still uses `household.timePreferenceMean` alone.

### Phase 17: AI bullishness and mass robotics

Goal: the size of the AI productivity gain is a slider, and mass robotics later opens the physical-task ceiling.

1. `ai.bullishness` defaults to 0 (Modest). At 0 the gain on each adopted task is one tenth of the unit reference and
   saturates with the adoption curve. At 1 the AI factor is `1 + adopted`, matching Phase 16 when robotics has not
   started. Above 1 the task gain compounds at `0.15 × (bullishness − 1)` per year with no ceiling.
2. `ai.roboticsStartYear` defaults to 20 and `ai.roboticsRampYears` defaults to 16. From the start year the effective
   physical-task block falls in a straight line to zero. A start year at or past the last year of the run leaves the
   block intact.
3. Hiring follows displacement, `adopted × min(taskGain, 1)`, so unbounded gain does not drive unemployment to one. The
   AI share of output and the household grant track `1 − 1 / AI factor`.

Acceptance:

- Bullishness 1 with robotics delayed past the run matches Phase 16 for the same seeds.
- Bullishness 0 ends with a smaller productivity and unemployment gap than bullishness 1.
- Bullishness 2 keeps productivity per human rising after adoption and the robotics ramp have flattened.
- Equal automatable shares still ignore bullishness and robotics.
- With robotics delayed, a higher physical-task share still lowers the gain. After a finished ramp that gap shrinks
  sharply.
- The ledger audit passes at bullishness 2 with the default ramp.
- A 1,200-month run at bullishness 1.5 keeps the ledger finite. Profit-share weights stay finite when `skill` raised to
  the ownership exponent overflows.

### Phase 18: Demand sets output and firms hire

Goal: a demand shortfall lowers output and hours, not just inventory and bankruptcies.

1. `production.demandWeight` defaults to 0. At 0 every firm produces capacity. Above 0, desired output is smoothed sales
   plus the inventory gap, capped at capacity, and output mixes that quantity with capacity.
2. `labor.firmLevelHiring` defaults to `off`. Off keeps the economy-wide hiring quota. On, each firm posts vacancies
   from smoothed sales versus capacity, and sheds at most 5 percent of employed workers in a month.

Acceptance:

- Demand weight 0 and firm-level hiring off match Phase 17 for the same seeds.
- Under a demand contraction, demand weight 1 ends that window with lower real GDP than demand weight 0.
- With demand weight 1, firm-level hiring ends the same contraction with higher unemployment than the economy-wide
  quota.
- The ledger audit still passes.

### Phase 19: Anchored expectations

Goal: expected inflation can sit on the regime path instead of the last year of prices.

1. `expectations.anchorWeight` defaults to 0. Expected inflation is that weight times the regime path plus the rest
   times trailing inflation. Spending, the real return, the deflation penalty, tenure choice, and the fiat policy rate
   use it. At 0 they keep using the trailing rate, and posted prices and wages keep the regime path.

Acceptance:

- Anchor weight 0 matches Phase 18 for the same seeds.
- Under a demand-led price decline, a higher anchor weight ends with a higher price level than a purely trailing
  expectation.
- The ledger audit still passes.

### Phase 20: Endogenous credit and government debt service

Goal: credit booms and busts can come from balance sheets, and government bonds pay a coupon.

1. `credit.endogenousWeight` defaults to 0. Above 0, calm periods lend a share of household deposits and stress from
   leverage or defaults cuts lending and repays loans.
2. `government.bondRate` defaults to 0. Above 0, the treasury pays that annual rate on bank-held bonds. The coupon goes
   through the ledger. At 0 no coupon is paid.

Acceptance:

- Both sliders at 0 match Phase 19 for the same seeds.
- With the endogenous weight at 1 and no credit shock, credit rises and later falls.
- A positive bond rate raises interest paid once the treasury has issued bonds, and the ledger audit passes.

### Phase 21: A housing market

Goal: housing scarcity can clear against tenure demand and supply, instead of only a time formula.

1. `housing.marketClearing` defaults to `off`. Off keeps the formula category price and a home price of 48 months of
   income.
2. On: a scarcity index starts at 1 and moves with the share of owners and mortgage holders and with housing supply
   growth. It multiplies the housing category price and the home price. Tenure choice off holds demand at the neutral
   share.

Acceptance:

- Market clearing off matches Phase 20 housing prices for the same seeds.
- With tenure choice on, market clearing ends with a higher housing price relative to the CPI than the formula path.
- The ledger audit still passes.

### Phase 22: Demographics and productive compute

Goal: population growth changes the household count, and agent compute can raise the buyer’s capacity.

1. `population.growth` now changes the number of households. The default is 0, which holds the count fixed. The previous
   default of 0.005 was stored and not applied.
2. `ai.computeProductivity` defaults to 0. Above 0, each compute unit a firm buys multiplies next month’s capacity by
   one plus that rate times the units.

Acceptance:

- Population growth 0 and compute productivity 0 match Phase 21 for the same seeds.
- A positive population growth ends with higher real GDP than a fixed population.
- With agents trading, a higher compute productivity ends with higher real GDP.
- The ledger audit still passes.

### Phase 23: Multi-unit ledger

Goal: several monies can be posted and audited separately. A run that still uses one money is unchanged.

1. `MultiLedger` holds one ledger per money. Fiat books stay integer cents. Other books use fractional satoshis. An
   exchange posts both sides, so neither money is created by the trade.
2. The economy’s existing stock journal stays on its single ledger. This phase does not move household deposits.

Acceptance:

- A one-money book matches a single ledger.
- Random exchanges keep every money’s audit passing, including fractional satoshi amounts.
- Existing economy tests are unchanged.

### Phase 24: Money kinds, exchange rates, and money choice

Goal: fiat, bitcoin, stablecoins, and CBDC can coexist, and their shares can move.

1. Bitcoin’s opening share is fixed at 0.4 percent of assets. `money.stablecoinStart` and `money.cbdcStart` default to 0. Fiat is the residual.
2. `money.choiceSpeed` defaults to 0. Above 0, shares step toward a score of legal tender, trust, friction, and the real
   return, and exchange rates move with each digital share. The policy-rate rule still follows `regime.type`. Bitcoin
   issuance is the halving schedule, not a slider.

Acceptance:

- Choice speed 0 matches Phase 23 for the same seeds, and the fiat share stays 1.
- A higher bitcoin trust raises the bitcoin share and, with no issuance, its exchange rate.
- The main ledger audit still passes.

### Phase 25: Regime labels are opening conditions

Goal: a conclusion about money can depend on emergent shares. `regime.type` still selects the opening rule set so the
existing comparisons keep running. It does not freeze the mix once `money.choiceSpeed` is positive.

1. Hypothesis H9 runs the same trust and legal-tender settings from a fiat opening and from a bitcoin opening.
2. Both runs are supported when the bitcoin share rises above its start. The opening label does not decide the share.

Acceptance:

- The hypothesis runner reports H1–H9.
- H9 is supported for the bundled settings.
- Choice speed 0 still leaves H1–H8 on their previous regime rules.

### Phase 26: AI capital and equity wealth

Goal: capital income can show up as wealth, not only as a flow of profit.

1. `equity.marketOn` defaults to `on`. Off counts only deposits.
2. On: firm capital at posted prices, scaled by a wealth valuation multiplier, is split by the profit weights, including
   the extra concentration from AI ownership. Wealth Gini uses deposits plus those claims. Capital share is profits over
   wages plus profits.
3. Desired capital tracks reference staffing times productivity and the AI factor, not current headcount, so AI
   displacement does not shrink the capital stock and stronger AI raises measured wealth. Investment tops up every
   month. Default total real wealth rises over a decade.

Acceptance:

- Equity market off is deterministic for the same seeds.
- Equity market on ends with a higher wealth Gini than off under concentrated AI ownership.
- Default sliders raise total real wealth and real GDP over 120 months.
- The ledger audit still passes. Claims do not move deposits.

### Phase 27: Agent market depth

Goal: the price of agent compute can rise when agents crowd firms.

1. `agent.marketDepth` defaults to 0. At 0 the ask is adoption progress times 4 percent of the wage, marked up by
   payment friction.
2. Above 0 the ask is multiplied by one plus depth times agents per firm. Firms still refuse an ask at or above 4.2
   percent of the wage.

Acceptance:

- Depth 0 matches Phase 26 agent volume for the same seeds.
- Enough crowding ends with a lower agent volume than depth 0.
- The ledger audit still passes.

### Phase 28: Conservation

Goal: money is not destroyed by tenure choice, inventory matches measured output, satoshi dust does not crash the stock
journal, and bank books close.

1. Bitcoin stock lines inside the audit absolute epsilon are dropped. A one-line stock journal is dropped instead of
   posted.
2. Cash home purchase requires a full home price and pays firms, so total deposits are unchanged.
3. Firms add only measured output to inventory.
4. Opening reserves fill `deposits − loans − bonds` so `loans + reserves + bonds + vault = deposits + bank equity`. The
   tick fails when that identity is outside the unit tolerance.

Acceptance:

- A one-line satoshi dust journal does not throw.
- With tenure choice on, bitcoin deposits do not collapse at tick 0, and the ledger audit passes.
- Bank books close at the open and after cash home purchases.

### Phase 29: Housing user cost

Goal: tenure choice compares monthly user costs with interest and a down payment, so rent is sometimes chosen.

1. Rent cost is the monthly rent rate times the home price.
2. Owned cost is the home price times the loan rate plus expected deflation, as a monthly opportunity cost.
3. Mortgage cost is the amortizing payment on the LTV loan at the loan rate, plus the opportunity cost of the down
   payment. The down payment is cash paid to firms.

Acceptance:

- With tenure choice on, bitcoin deposits do not collapse at tick 0.
- The rent share is not zero in both regimes.
- Stronger expected deflation still lowers the mortgage share.

### Phase 30: Rates that match cash

Goal: deposit interest is paid before equity dividends, the paid rate enters the real return, and the bitcoin loan rate
is a level around time preference.

1. Household deposit interest is paid after firm loan interest and before bank dividends, funded by borrower interest
   plus equity above the capital target.
2. The annualized paid deposit rate enters goods spending’s real return.
3. Bitcoin and hybrid set the policy rate to `max(0, timePrefMean + LOAN_SPREAD × pressure)` with pressure clamped, not
   a ratchet toward zero.

Acceptance:

- With loans near the savings stock, the bitcoin interest rate is positive.
- Pass-through above 0 can cut discretionary spending while leaving the floor in place.

### Phase 31: Endogenous fiat broad money

Goal: fiat broad money grows with the inflation target and productivity by default.

1. `centralBank.moneyGrowth` defaults to 1. Fiat deposits and reserves change together by that weight times
   `(inflationTarget + productivity.baseGrowth + inflation gap) / 12` times deposits. A contraction draws reserves in
   bank id order, starting with the first, and stops when those reserves are used up.
2. Bitcoin and hybrid ignore the slider. Phase 64 raises the minimum above 0 so the stock cannot be frozen.

Acceptance:

- Default fiat deposits are higher after 10 years than the same seed at the money-growth floor.
- Bitcoin deposits do not follow the slider.

### Phase 32: Monetary comparison preset

Goal: the web app opens on settings where spending can move prices and output.

1. `scenarios/presets/monetary.json` sets trend weight 0, demand weight 1, deposit pass-through 1, anchor weight 0.5,
   tenure choice on, `money.choiceSpeed` 0, and `labor.firmLevelHiring` on. Money growth stays at its default of 1.
   Firm-level hiring keeps an aggregate employment floor so demand-led bitcoin runs do not shed into mass unemployment.
2. The app’s default page overrides match that preset. 3. The preset's 12-month opening deposits sit under the spending
   buffer, so with trend weight 0 the new money would otherwise sit idle and pull every category price down. That new
   money is blended into smoothed income and spent. Energy, medical care, and education then rise over a decade, and
   apparel and electronics fall, while the money stock rises.

Acceptance:

- A 50 percent helicopter raise in deposits raises the CPI by more than 1 percent within two years under the preset.
- Fiat broad money ends higher when the inflation target is higher.
- Fiat and bitcoin shock unemployment paths differ.
- The ledger identity holds with tenure choice on. - On the preset, after 10 years, the money stock is higher, energy,
  medical care, and education cost more, and apparel and electronics cost less.

### Phase 33: Credit stock and foreclosure

Goal: calm lending can reach a larger loan book, and unpaid mortgages can be written off.

1. `credit.leverageStart` defaults to 0.02. The monetary preset sets it to 1 with endogenous credit weight 1 and a 4
   percent capital ratio.
2. `housing.mortgageDefaultShare` defaults to 0.4. After three missed full payments while the payment exceeds that share
   of income, the unpaid mortgage is written off against bank equity and the household returns to rent.

Acceptance:

- On the monetary preset, credit to GDP rises above 8 percent without a credit shock.
- Pass-through can cut discretionary spending when the real-return sensitivity is positive.

### Phase 34: Remeasure residuals

Goal: fix the supply-shock hiring sign and remeasure unemployment, velocity, and inequality on the monetary preset.

1. The employment quota scales with the productivity impulse so an adverse supply shock raises unemployment.
2. `household.openingDepositMonths` defaults to 36. The monetary preset uses 12.

Acceptance:

- A negative productivity shock raises unemployment relative to the calm path.
- With shocks off, unemployment stays within 8 points of the natural rate on the preset.
- Shorter opening deposits raise velocity.

### Phase 35: Integer-safe stock journal

Goal: fiat stock posts never fail from independent cent rounding of half-cent balances.

1. Firm cash receipts under cents split with a floor and a residual so firm deposits stay integers.
2. Stock targets round each paired stock once. Private equity is the residual after rounding vault and bank
   equity, so vault equals bank equity plus private equity in the journal.
3. Satoshi stock posts seat float drift on private equity so debit equals credit after gradual transition.

Acceptance:

- A half-cent vault residual posts without throwing.
- A monetary fiat run that previously crashed on seed 5 finishes with a passing audit.
- A fiat gradual-transition run that previously threw `Debits must equal credits` after rebasing to satoshis finishes
  with a passing audit.
- Phase 28 neutral settings are unchanged.

### Phase 36: Deposit interest pays the posted rate

Goal: solvent banks pay nearly the posted deposit rate so the real-return channel is not starved.

1. After firm loan interest, household deposit interest is due at the posted rate.
2. Funding order: borrower interest, then equity above the capital target, then an optional fiat central-bank
   interest subsidy (`bank.depositInterestSubsidy`, default 0).
3. Dividends still wait until after deposit interest. Insolvent banks are left to Phase 38.

Acceptance:

- With pass-through 1 and a solvent bank, the paid deposit rate is at least 90 percent of the posted rate over a
  calm 24-month window.
- Pass-through 0 still matches Phase 35.

### Phase 37: Mortgage origination ladder

Goal: renters can originate new mortgages when banks have room, so credit is not only a run-off book.

1. `credit.householdMortgageShare` reserves a fraction of lending room for household mortgages (default 0; monetary
   preset 0.25).
2. Tenure choice still compares monthly user costs. Originations and tenure transitions are recorded separately.
3. Fiat mortgage draws still create matching deposits and loans through the ledger.

Acceptance:

- On the monetary preset, the median rent-to-mortgage count across five seeds is positive over 600 ticks.
- Credit to GDP can rise after year 5 on a calm path.
- Stronger expected deflation still lowers new mortgage originations.

### Phase 38: Bank insolvency resolution

Goal: failed banks no longer hold deposits forever. Fiat merges; hybrid keeps lender of last resort; bitcoin has no
central-bank backstop.

1. `bank.resolution` is `off` or `merge` (default `off`; monetary preset `merge`).
2. `bank.depositHaircut` (default 0) optionally writes off a share of transferred deposits.
3. On failure under merge: move deposits and loans to a surviving bank by id, wipe the failed bank's equity, and apply
   the haircut. Hybrid still injects capital when equity is negative unless resolution is merge-only.
4. A failed bank stops lending the same tick.

Acceptance:

- After a merge, deposits remain spendable and the ledger audit passes.
- Aggregate bank equity stays non-negative far more often on the monetary fiat seed band.
- Hybrid still differs from bitcoin under credit shocks (lender of last resort versus none).

### Phase 39: Supply shock and firm-level hiring

Goal: an adverse productivity shock raises unemployment on both hiring paths.

1. Firm-level hiring scales labor demand with the productivity impulse the same way the economy-wide quota does.
2. A negative productivity impulse raises unemployment while the shock is active.

Acceptance:

- Phase 34 acceptance tests still pass.
- With firm-level hiring on, a negative productivity shock raises unemployment relative to the calm path.
- The ledger audit still passes.

### Phase 40: Money injection channel

Goal: how new fiat money enters is a choice, so Cantillon effects can be tested.

1. `centralBank.injectionChannel`: `proRataDeposits` (default), `governmentSpending`, `newLoans`, or `assetPurchase`.
2. Neutral `proRataDeposits` matches Phase 39 money growth. Other channels keep the same annual growth rate but change
   who first holds the new money.

Acceptance:

- `proRataDeposits` matches the previous fiat money-growth path.
- Another channel changes wealth Gini or sector deposits at the same growth rate.
- A helicopter raise still moves the CPI under the monetary preset.

### Phase 41: Defaults, idle money, and inflation pursuit

Goal: demand-led prices can chase the inflation target without hoarding every new dollar.

1. Document that the registry default `prices.trendWeight` is 1 (money-irrelevant) while the app and monetary preset
   use 0.
2. `centralBank.spendNewMoney` (default 0) blends a share of new fiat into smoothed income when trend weight is below 1,
   even with thick opening deposits.
3. Recheck fiat inflation near target on the monetary preset with shocks off.

Acceptance:

- A 50 percent helicopter raise still lifts the CPI by more than 1 percent within two years on the monetary preset.
- Velocity is higher than under the thick registry-default opening stock.
- Bitcoin is unchanged by the fiat-only blend slider.

### Phase 42: Extreme sticky-wage guard

Goal: very sticky wages no longer drive near-total unemployment under routine shocks.

1. `wage.emergencyFlex` (default 0) temporarily lowers effective nominal rigidity when unemployment sits above the
   natural rate plus a gap for several months.
2. At 0 the Phase 41 path is unchanged.

Acceptance:

- With rigidity 0.95 and emergency flex 0.3, unemployment stays below 50 percent on an E6-style demand-shock scenario.
- Emergency flex 0 leaves the flexible-wage and sticky-wage Phase 41 paths unchanged.

### Phase 43: Monetary transmission

Goal: the policy rate affects spending and investment beyond deposit pass-through alone.

1. Optional sliders scale firm investment and consumer credit with the real policy rate.
2. Neutral settings match Phase 42.

Acceptance:

- A higher policy rate cuts new borrowing or investment when the transmission weight is positive.
- Weight 0 matches Phase 42.

### Phase 44: Gradual dual-currency transition

Goal: a multi-month transition is not a one-step rebase delayed by the window length.

1. Conversion and any debt haircut apply month by month over `transition.lengthMonths`.
2. Lengths 1, 12, and 60 produce meaningfully different paths.

Acceptance:

- Length 0 still matches steady fiat or bitcoin.
- Length 12 differs from length 1 in wealth Gini or credit within seed bands.
- The ledger conserves at each conversion tick.

### Phase 45: Bitcoin market price

Goal: bitcoin can have an exchange rate against goods or fiat that is not identical to the satoshi CPI path.

1. A market price for bitcoin is recorded separately from category goods prices in satoshis.
2. Neutral settings keep today's single index.

Acceptance:

- Neutral settings match Phase 44.
- A positive market-price channel moves the bitcoin exchange rate without breaking the ledger audit.

### Phase 46: Durable purchases and money demand

Goal: households time durable purchases with the real return on money and expected deflation.

1. A durable budget sits beside nondurable goods spending.
2. Neutral sensitivity 0 matches Phase 45.

Acceptance:

- Higher real returns delay durables when sensitivity is positive.
- Sensitivity 0 matches Phase 45 spending.

### Phase 47: Endogenous productivity

Goal: productivity can respond to utilization or R&D effort instead of only `productivity.baseGrowth`.

1. A slider mixes endogenous growth with the baseline path.
2. Neutral weight 0 matches Phase 46.

Acceptance:

- Weight 0 matches Phase 46.
- A positive weight raises productivity when utilization is high relative to a calm path.

### Phase 48: Life cycle and bequests

Goal: exits transfer wealth on purpose, and age or tenure cohorts can shape saving.

1. Bequest rules on household exit replace the ad-hoc transfer to the first household when enabled.
2. Neutral off matches Phase 47.

Acceptance:

- Off matches Phase 47.
- On, exits raise recipient wealth and the ledger audit passes.

### Phase 49: Inequality and velocity calibration

Goal: opening distributions and equity claims can target higher wealth Gini and higher velocity without one magic knob.

1. Calibrate opening wealth, equity valuation, and bequests against stated targets on the monetary preset.
2. Morris screening reports which sliders move Gini and velocity.

Acceptance:

- Wealth Gini on the monetary preset can exceed 0.6 under concentrated ownership settings.
- Velocity rises relative to the Phase 34 thick-deposit baseline when opening deposits are thin.

### Phase 50: Design symmetry cleanup

Goal: reduce fiat-only and opening-tenure asymmetries that block fair regime comparisons.

1. Document or soft-enable bitcoin/hybrid fiscal limits as the counterpart to the fiat stabilizer.
2. Optional endogenous opening tenure; payment-friction defaults stay labeled guesses.
3. Hybrid versus bitcoin differences are documented when there is no bank failure.

Acceptance:

- Stabilizer 0 and friction defaults still match Phase 49 when untouched.
- A methods note lists remaining asymmetries.

### Phase 51: Deposit interest is a flow

Goal: banks pay deposit interest from this tick's asset income. The capital buffer is not the funding source, and the
fiat subsidy does not break the vault identity.

1. Household deposit interest is limited to borrower interest plus, under fiat, interest on reserves at the policy rate.
2. That reserve interest is subtracted from the same tick's fiat money-growth injection.
3. `bank.depositInterestSubsidy` still tops up a shortfall under fiat. The credit lowers private equity by the same
   amount and does not raise vault.
4. The anniversary firm draw cannot push a loan above the firm's capital value. Expansion loans that fund new capital
   stay outside that cap, so living banks do not lever every firm into replacement.

Acceptance:

- When borrower interest covers the coupon, the bank pays at least 90 percent of it and equity stays at or above the
  capital target.
- A shortfall is not funded by spending equity. Both regimes stay failure-free through the opening year with resolution
  off. Calm monetary fiat stays failure-free for 120 months.
- Subsidy 1 with pass-through 1 completes S0, S3, and monetary fiat. Pass-through 0 does not pay the subsidy.

### Phase 52: Resolution once, and every depositor

Goal: a sole-bank bail-in restores the capital target once, and the treasury deposit is not exempt. Hybrid is not
exempt after lender-of-last-resort support.

1. Treasury deposits at bank 0 take the same proportional write-down as household deposits.
2. A bail-in restores `equityFor`, not a token of equity. A bank already at that target is left alone.
3. Hybrid waits for lender-of-last-resort injection. If equity is still negative, it uses the same merge or bail-in.

Acceptance:

- Treasury and household deposits fall by the same share.
- One forced insolvency does not repeat on the next calm tick.
- A calm monetary run does not record on the order of 82 or 228 failures, and new borrowing is still positive after
  month 12.
- Bitcoin bail-in does not destroy broad money beyond the credit losses already present with resolution off.

### Phase 53: Treasury surplus is spent next month

Goal: the treasury cannot hoard the gap between tax and the goods it actually buys. The rebate is next month's demand,
not a claim that inflation is on target.

1. `government.treasuryBufferMonths` defaults to 1. Cash above that many months of this tick's outlays is rebated.
2. The rebate is credited to household deposits and added to income after tax, in proportion to that tick's income.
3. Bitcoin uses the same rebate. A shortfall still issues bonds. The spending share does not rise.

Acceptance:

- Calm fiat and bitcoin runs keep the treasury well below half of deposits.
- The rebate shows up in next month's smoothed-income demand base.
- The ledger audit passes.
- Goods spending leaves this month's debt service in the deposit.
- Firm-level hiring on a mild productivity shock no longer has to raise unemployment once sales are funded. The
  economy-wide hiring path still does. Bitcoin new lending can sit at zero while the opening mortgage book exceeds a
  quarter of household deposits.

### Phase 54: The policy rate cannot whipsaw at the open

Goal: one capped monthly price move cannot swing the published policy rate from 0 to the mid-teens in the opening
months. Smoothing is not a freeze.

1. `centralBank.rateSmoothing` is the weight on last month's rate. The default is 0.5, not 0.
2. Fiat Taylor settings and the bitcoin market rate both pass through that smoother.

Acceptance:

- On the monetary preset, fiat and bitcoin rates over ticks 0–6 do not include both 0 and a print above 10 percent.
- A sustained inflation gap still lifts the published rate.

### Phase 55: Mortgages are a housing trade

Goal: a new mortgage pays the seller, the buyer does not keep the principal, and one cheap month cannot flip the
whole tenure stock.

1. The principal is credited to firms. The buyer pays the down payment.
2. User cost includes the household's time preference relative to the mean.
3. `housing.adjustmentRate` (default 0.01) is the share of households who may switch tenure in a month. A mortgagor
   stays until the loan is repaid or foreclosed. Reselling into firm deposits pulls working capital out of payroll
   and spikes unemployment. A value near 0.04 lets a decade of cheap-rate months move the renter share by more than
   10 points, because those months convert renters and they do not switch back.

Acceptance:

- The buyer's deposit falls by the down payment. Firm deposits rise by the home price. Total deposits rise by the
  principal.
- Originations continue after the opening months, and the end renter share stays within 10 points of the opening share.
- A higher expected deflation rate raises the contractual mortgage payment. Bitcoin foreclosures are not several times
  the fiat count unless bitcoin debt service is higher.

### Phase 56: Injection channels do different things

Goal: `newLoans`, `assetPurchase`, and `governmentSpending` move different stocks, and a contraction withdraws from the
sector that was credited.

1. `newLoans` books firm loans and firm deposits. It does not create reserves. The loan is repaid before that cash is
   paid out as wages.
2. `assetPurchase` credits firm deposits and a bond claim. The loan stock stays put.
3. `governmentSpending` credits the treasury and buys goods from firms in the same tick.
4. A contraction withdraws from the credited sector, and only up to the balances that exist.

Acceptance:

- At the same amount, only `newLoans` raises firm loans, only `assetPurchase` raises bonds, and a government-spending
  injection is spent on firms in that tick.
- A `newLoans` contraction reduces firm deposits and firm loans.
- Demand-led fiat with `newLoans` does not finish near 25 percent inflation, including when real-return sensitivity is 3. `spendNewMoney` on the default channel stays under 10 percent inflation.

### Phase 57: Inflation after inside-money runoff

Goal: calm fiat ends near the inflation target, and bitcoin does not destroy the deposit stock by treating mortgage interest as principal.

1. A mortgage payment pays interest at the current loan rate into bank equity. Only the remainder reduces the principal.
2. That interest counts as borrower interest, so it can be paid on deposits. `centralBank.spendNewMoney` stays off.

Acceptance:

- The principal falls by less than the payment when the loan rate is positive, and bank equity rises by the interest.
- Calm monetary fiat, with trend weight 0, ends the decade above the 2 percent target and under 5 percent. The index is the capacity-weighted average of posted prices, so a shortfall in output does not inflate it. Demand-led fiat stays within 2 points above the target.
- Calm monetary bitcoin keeps broad money above half of its opening level. The old runoff repaid the whole coupon as principal and left money near 0.27×.
- The channels still do not print the same price level.
- With the default nominal rigidity, bitcoin inflation is still below minus productivity growth. Flexible wages reach that path, so the remainder is the labor market, not a missing money stock.

### Phase 58: Productivity shock through costs

Goal: a productivity impulse changes hiring through the real-wage reference, not through a second multiplier on the quota.

1. Neither hiring target is scaled by `clamp(1 + productivityImpulse, 0.5, 1.5)`.
2. The reference real wage is the opening real wage times one plus the impulse. Default elasticity then cuts the quota
   when the impulse is negative. Elasticity 0 does not.

Acceptance:

- Elasticity 0 leaves the economy-wide quota unchanged when the impulse changes.
- Default elasticity lowers the quota while a negative impulse is active.
- A positive productivity shock raises output, and after the window a flexible-wage fiat run is closer to the calm path
  than it was during the shock.

### Phase 59: Sticky wages stay sticky

Goal: remove the emergency flexibility override, and stop firm-level hiring from shedding the labor force when sales fall.

1. `wage.emergencyFlex` is gone. Downward wage gaps stay scaled by the square of `1 − rigidity`.
2. Firm-level hiring's aggregate target is the sales headcount clamped so it cannot rise above the cost quota or fall
   more than one month's shed below it. The quota still falls when the real wage is above the productivity-adjusted
   reference. Phase 62 restores the live sales target inside that band.

Acceptance:

- After the same demand shock, rigidity 0.95 has higher unemployment than rigidity 0, and that unemployment stays above
  the natural rate. It does not finish near 0.3 percent, and it does not finish near 80 percent with median consumption
  at 0.

### Phase 60: Inequality and velocity on the preset

Goal: the monetary preset itself is unequal and spends faster than the slow baseline, and a skill-weighted bequest does
not flatten wealth.

1. Skill-weighted bequests use skill to the 16th, so the estate goes to the highest-skill heirs.
2. The monetary preset sets `household.skillSigma` to 1.1. Opening deposits are still skill squared times that wider
   draw. There is no extra slider.

Acceptance:

- A skill-weighted exit does not lower the deposit Gini.
- On the monetary preset, wealth Gini exceeds 0.6 and the top 10 percent exceeds 36 percent.
- Velocity with 12 months of opening deposits stays above the slow baseline's velocity.

### Phase 61: Transition circulates bitcoin

Goal: a gradual fiat-to-bitcoin window holds both balances, and a debt haircut changes credit.

1. Each month of `transition.lengthMonths`, when `transition.gradualWeight` is positive, convert
   `weight / months remaining` of every deposit and the same fraction of firm and household debt into bitcoin units at
   the current bitcoin price.
2. Goods can be paid from either balance. The haircut writes off that share of the slice converted that month.
3. `transition.gradualWeight` 0 keeps the one-step rebase at the end of the window.

Acceptance:

- In the middle of a 12-month window both the fiat balance and the bitcoin balance are positive.
- A household can buy goods with either balance.
- A debt haircut of 0.3 moves credit by more than 2 points versus a haircut of 0.
- The ledger balances on each conversion tick.
- Gradual weight 0 does not create a bitcoin balance before the last month.

### Phase 62: Review fixes for satoshi books, hiring, shocks, and mortgages

Goal: satoshi deposit-interest journals stay balanced; firm-level hiring binds; a productivity shock does not flip the
unemployment gap after the impulse; the deposit subsidy stays inside the money-growth budget; mortgage choice uses a
real buy-or-wait cost.

1. Satoshi stock targets set private equity as the vault residual. Seating creates a private-equity line when dust
   dropped it. Each bank's deposit coupon pays with a last-household residual.
2. Firm-level hiring's aggregate target is the sales headcount clamped to
   `[costQuota × (1 − monthly shed), costQuota]`. Vacancies go to understaffed firms.
3. The hiring real-wage reference glides the productivity impulse to zero with nominal rigidity after the raw impulse
   ends, and cannot raise the hiring scale above 1 while that glided impulse is negative.
4. Fiat deposit-interest subsidy draws on the same money-growth budget as reserve interest and is netted from the same
   tick's injection.
5. Mortgage and ownership burdens use the real loan rate and expected capital loss. The offered term shortens until the
   nominal payment fits income after expected inflation. Liquid mortgagors may prepay under expected deflation.

Acceptance:

- Monetary bitcoin seeds 5, 7, 14, and 19, and S3 bitcoin with pass-through 1 at skill sigma 0.5 and 1.1, finish with a
  passing audit.
- Under a demand contraction with demand weight 1, firm-level hiring on ends the window with higher unemployment than
  off, and unemployment stays under 0.5.
- Over a 24-month adverse productivity window with sticky wages, the unemployment gap versus calm stays positive.
- S3 fiat with subsidy 1 and pass-through 1 ends 120 months under 10 percent inflation.
- Under −8 percent expected inflation a long mortgage loses to rent; a liquid mortgagor prepays; an illiquid one does
  not; monetary bitcoin originates fewer than eight new mortgages in 120 months.

### Phase 63: Wage negotiation under inflation and deflation

Goal: employees and employers close the gap to a productivity-consistent agreed wage at the same speed, so calm
unemployment stays near the natural rate in every regime, and the lag's sign does the distributional work.

1. The agreed wage is the price level times `1 / (1 + firm.markup)` times economy-wide productivity times one plus
   `0.4` times labor-market tightness.
2. `wage.nominalRigidity` is the share of the posted-to-agreed gap left for next month. Employees close a shortfall and
   employers close an excess at rate `1 − rigidity`, capped by the monthly wage move. The default moves from 0.7 to 0.9.
   Squared downward rigidity is gone.
3. `labor.wageElasticity` compares the real wage with the hiring reference
   (`1 / (1 + firm.markup)` times productivity). Phase 68 drops tightness and the impulse from that reference. The
   default stays 0.5.

Acceptance:

- Calm 120-month runs at the defaults end with unemployment within 3 points of the natural rate in fiat, bitcoin, and
  hybrid.
- Under rising fiat prices, rigidity 0.9 ends with a lower real wage than rigidity 0.
- Under demand-driven bitcoin deflation, rigidity 0.9 ends with a higher real wage during the shock than rigidity 0, the
  money wage falls from its start, and peak unemployment sits between rigidity 0 and rigidity 0.95.
- After a demand shock, rigidity 0.95 still peaks above rigidity 0, stays under 50 percent, and stays above the natural
  rate.

### Phase 64: Fiat growth floor and lagged crisis stimulus

Goal: fiat broad money cannot be frozen, and a demand or credit contraction draws extra money only after a lag so prices
can fall first.

1. `centralBank.moneyGrowth` keeps the secular rule
   `weight × (inflation target + productivity growth + inflation gap) / 12` times deposits. Its minimum rises from 0 to
   0.05. A value of 0 fails validation. High inflation can still slow or shrink the stock.
2. `centralBank.stimulus` (default 1, minimum 0.05) times lagged contraction pressure adds to that annual rate.
   Pressure is `max(0, −demandImpulse, −creditImpulse)`. A productivity shock does not create pressure.
3. `centralBank.stimulusLag` (default 6, minimum 1) is how many months before that extra growth starts and how many months
   it continues after the contraction ends. Same-month stimulus is not allowed.
4. The sum still uses the existing injection channel and nets reserve interest and the deposit subsidy. Bitcoin and
   hybrid ignore both new sliders. Unemployment does not trigger this injection.

Acceptance:

- Loading money growth 0 or stimulus 0 throws.
- A calm fiat run has the same money-supply path at stimulus 1 and at the 0.05 floor.
- A forced demand contraction with posted prices following demand has a lower CPI at the end of the lag than when the
  contraction starts.
- After the lag, through the rest of that contraction, money supply is higher at stimulus 1 than at the floor, and the
  ledger audit passes.
- Bitcoin money supply ignores both sliders.

### Phase 65: Housing monetary premium

Goal: homes lose their inflation-hedge bid when holding money itself protects purchasing power, so bitcoin and hybrid
home prices fall in months of income relative to fiat.

1. `housing.monetaryPremium` defaults to 0. It is the share of the current 48-month home price that exists because
   housing is held as an inflation hedge. Zero reproduces Phase 64.
2. The hedge follows the regime price path (`normalInflation`): the inflation target under fiat, and minus baseline
   productivity under bitcoin and hybrid. Hedge share is that path over the inflation target, clamped to [0, 1], and 0
   when the target is 0. The price multiple is `1 − premium × (1 − hedge)`.
3. The multiple multiplies the tenure purchase price, opening mortgage principal, rent and user-cost home price, and the
   unscaled CPI housing line. Market-clearing scarcity still multiplies after it. `homePriceMonths` records
   `48 × scarcity × multiple`.

Acceptance:

- Premium 0 matches Phase 64 home-price months and `priceHousing` for the same seeds in fiat and bitcoin.
- Premium 0.5 keeps fiat homes at 48 months of income and cuts bitcoin homes to 24 months with market clearing off.
- The same premium lowers bitcoin `priceHousing / CPI` and raises housing security relative to premium 0.
- The ledger audit still passes.

### Phase 66: Real mortgage at the rebase

Goal: a transition can restate inherited mortgages as a real claim so the satoshi payment scales with the price level
and creditors keep today's real burden instead of a growing one under bitcoin deflation.

1. `transition.realMortgage` defaults to `off`. Off leaves mortgages fixed in satoshis after the flip, matching Phase 65.
2. On: at the end of the transition window, after any debt haircut and after bitcoin loan units fold back, every positive
   household mortgage is stamped. From the next month, principal and payment multiply by this month's price level over
   the last stamped price. Scheduled amortization still reduces the balance. Mortgages originated after the flip stay
   nominal. Firm loans and consumer loans stay nominal.
3. Each month the principal change `d` seats `bank.capitalRatio × d` on bank equity and the rest on deposits at that bank,
   pro rata. The mark is not a default. The ledger stays closed and the bank does not fail from the mark alone.

Acceptance:

- Slider off: a price fall leaves principal, payment, equity, and deposits unchanged.
- A 10 percent price fall scales an indexed principal and payment by 0.9. Equity moves by the capital-ratio share,
  deposits by the rest, the ledger audit passes, and the bank does not fail. A price rise scales the other way.
- An illiquid mortgagor whose payment starts inside `housing.mortgageDefaultShare` is not foreclosed when prices and
  income fall and the claim is indexed. The same household, unindexed, still trips the three-month rule once the payment
  share is high enough.
- A short transition with the slider on stamps only mortgages that exist at the flip. A mortgage originated afterward
  stays fixed in satoshis.

### Phase 67: Zombie support in a crisis

Goal: fiat crisis stimulus can keep insolvent firms from being replaced, so a bitcoin contraction can trough deeper,
recover sooner, and finish with higher real GDP when that support is on.

1. `centralBank.zombieSupport` (default 0, range 0 to 1) is the share of each month's crisis-stimulus injection that
   may spare negative-equity firms from the 6-month replacement rule. Zero reproduces Phase 66.
2. After the usual fiat growth amount is computed, the notional budget is the crisis-stimulus share of that positive
   injection times this slider. If the 5 percent monthly cap binds, the stimulus share scales with it. Secular money
   growth is not part of the budget. The full injection still goes out through `centralBank.injectionChannel` before
   `accommodateReserves`.
3. In the firm loop, in id order, a firm that would be replaced is spared when the remaining budget covers its equity
   shortfall. The budget falls by that shortfall. Workers, loans, and capital stay. The failure clock is not reset, so
   the firm is replaced on the first month the budget no longer covers it. A shortfall the budget cannot cover still
   replaces that firm; later firms are still considered. Unspent budget is discarded; it is not a second payment.
4. Bitcoin and hybrid ignore the slider. Hypothesis H10 compares a forced credit shock under fiat with support at 1
   against the same seed and shock under bitcoin (60 households, rigidity 0.9, stimulus 1, lag 3): peak unemployment
   higher under bitcoin, fewer months from that peak back to the pre-shock unemployment level under bitcoin, and higher
   real GDP at a fixed horizon under bitcoin.

Acceptance:

- Support 0 matches Phase 66 replacements and money path on a forced contraction.
- A firm held negative for 6 months is replaced when support is 0, and kept with the same workers, loan, and capital when
  the budget covers the shortfall. The ledger audit passes.
- A budget smaller than the first firm's shortfall still replaces that firm.
- After the lagged stimulus ends, a still-insolvent spared firm is replaced.
- Bitcoin replacement ignores the slider.
- The hypothesis runner reports H10. Support is recorded from the three legs; it is not forced. Under the bundled credit
  shock the depth and speed legs hold while end real GDP stays higher under fiat, so H10 is unsupported.

### Phase 68: Hiring reference without tightness or impulse

Goal: the hiring quota no longer amplifies a slump through labor-market tightness or a supply shock through the
productivity impulse, while the wage bargain still responds to tightness.

1. The agreed money wage is the price level times `1 / (1 + firm.markup)` times economy-wide productivity times one plus
   `0.4` times tightness. It does not include the productivity impulse.
2. The hiring real-wage reference is `1 / (1 + firm.markup)` times economy-wide productivity. It omits tightness and the
   impulse. Capacity still multiplies by one plus the impulse.
3. The hiring-impulse glide is removed. While the productivity impulse is negative, the hiring scale cannot rise above 1.

Acceptance:

- A productivity impulse alone does not change the employment quota.
- Bitcoin with demand-led prices, firm-level hiring on, and real-return sensitivity 3 averages under 20 percent
  unemployment over 240 months and ends under 25 percent.
- A 24-month adverse productivity window cuts real GDP and does not boom hiring (unemployment gap at or above −2 points)
  under sticky wages, in the recovery, and at rigidity 0.
- With firm-level hiring off, fiat and bitcoin real-GDP losses over that window stay within 4 points of each other.

### Phase 69: Crisis stimulus from observed unemployment

Goal: fiat crisis stimulus responds to the unemployment gap both ways, including endogenous slumps, and can be turned
off.

1. Each month records unemployment minus the natural rate. Gaps inside two points are treated as zero. `centralBank.stimulus`
   times that gap from `stimulusLag` months ago adds to the annual fiat growth rate. A tight labor market withdraws
   through the same channel cap.
2. `centralBank.stimulus` minimum is 0. Default stays 1.75. `centralBank.moneyGrowth` still cannot be 0.
3. Deflation stays only in the secular inflation-gap term. Zombie support still uses the positive stimulus slice.

Acceptance:

- Loading stimulus 0 succeeds; loading money growth 0 still throws.
- A calm fiat run has the same money-supply path at stimulus 0 and at stimulus 1.
- After the lag, a forced demand contraction and an unemployment-only slump both raise the money stock at stimulus 1
  versus 0.
- A lagged negative unemployment gap with stimulus 1 ends with a smaller deposit change than stimulus 0.
- Bitcoin money supply ignores the slider.

### Phase 70: Monetary-preset deposit decomposition

Goal: measure which deposit-flow bucket offsets fiat injection (and bitcoin money) in a demand slump
before retuning the growth rule.

1. Each tick records `fiatInjection`, `netCredit`, `interestRetained`, `writeDowns`, and
   `reserveAccommodation` on the economy.
2. A monetary-preset test compares calm and forced demand slumps in fiat and bitcoin.
3. Findings are written into `docs/methods.md`. No growth-rule change unless the trace shows a bug
   beyond later channel and dividend fixes.

Acceptance:

- Flow history has one entry per tick.
- Fiat slump: the dominant deposit drag versus calm is `fiatInjection` (negative); ending money stays within 2× calm.
- Bitcoin slump ending money is below calm; with write-downs ignored, the drag is `netCredit` or
  `interestRetained`.

### Phase 71: Rate cap and real injection channels

Goal: the Taylor rate cannot runaway, and named injection channels behave like loans, purchases, and spending.

1. Cap the raw Taylor rate at 20 percent before smoothing.
2. `governmentSpending` buys firm inventory; unspent injection stays in the treasury.
3. `newLoans` books only up to credit room and stops the same-tick clawback.
4. `assetPurchase` buys existing bank bonds, pays households, and adds one reserve; the retired bond seats on vault
   cash (see ADR 0024).

Acceptance:

- A Taylor input that would set 100 percent publishes 20 percent.
- Government spending leaves unspent cash in the treasury when inventory runs out.
- New-loan injections book less than an oversized request when credit room binds, and stay on the books that tick.
- Asset purchase with no bonds places nothing; with bonds, household deposits and reserves rise by the purchase, vault
  and private equity rise by the same amount, and bonds fall.
- Under hoarding, mean unemployment on `newLoans` and `governmentSpending` stays within 8 points of `proRataDeposits`.

### Phase 72: Mortgage user cost once

Goal: expected inflation enters the tenure decision once, and affordability is two-sided against current income.

1. Buy-versus-rent uses the real loan rate only. Drop the separate capital-loss term.
2. Affordability uses the contractual nominal payment against current income.
3. Prepay under expected deflation stays.

Acceptance:

- Under −8 percent expected inflation a long mortgage loses to rent on the real rate alone.
- Affordability returns the same max term under ±8 percent expected inflation when the nominal payment fits.
- A payment that exceeds the income share still originates zero years.

### Phase 73: Bank dividends to depositors

Goal: excess bank equity returns to depositors instead of destroying vault cash with no recipient.

1. Pay equity above the capital target to the bank's depositors, pro rata, with a last-household residual.
2. Equity down, private equity up, vault unchanged. Do not limit by vault.
3. Do not add the dividend to `paidDepositRate`.

Acceptance:

- A forced excess-equity payout raises household deposits by the same amount and leaves vault unchanged.
- With pass-through 0, a 120-month fiat run ends with money supply between 0.85× and 1.5× its opening stock.

### Phase 74: Bond cap and replacement employment

Goal: a fiat bond runaway crashes instead of spilling past the safe integer, and firm replacement does not clear the
workforce for one month.

1. `addBonds` throws when the balance would exceed `Number.MAX_SAFE_INTEGER`. Aggregate ledger `MAX_CENT` stays.
2. `replaceFirm` keeps the current workers while writing off the loan and resetting capital.

Acceptance:

- Adding bonds past the safe integer throws.
- A replaced firm keeps its worker list and household employer links.
- A monetary fiat demand shock does not jump unemployment by 20 points or more in one month.

## Validation

Before testing a new idea in a regime, the model should reproduce facts economists broadly accept. These are automated
tests on a fixed set of seeds. Each test states a tolerance. Failures report the seed.

- Credit-driven expansions are followed by contractions of comparable duration.
- When the automatable share does not rise, wealth is more unequally distributed than income, and income is more
  unequally distributed than skill. After the adoption curve finishes, agent ownership follows household id, so wealth
  can be less concentrated than income.
- In the fiat regime, there is a short-run negative relationship between unemployment and inflation under sticky wages.
- Output is more volatile than consumption, and investment is more volatile than output.
- A positive productivity shock raises output and lowers prices in the short run.
- Higher bank capital ratios lower the frequency of bank failures.

## Risks

- Results may reflect the builder's assumptions more than the economy. Mitigations: the assumption ledger, presets from
  different views, seed sweeps, and sensitivity analysis.
- The model may become too complex to test. Mitigation: one mechanism per phase, with a neutral setting that reproduces
  the previous phase.
- Interactions may be unstable. Mitigation: the ledger audit every tick, replayable seeds, and logging of failing ticks.
- AI sliders have little history. Mitigation: label them as guesses, sweep wide ranges, and report where conclusions
  change.
- Floating-point satoshis can drift. Mitigation: a relative audit tolerance and canonical output formatting.
- Performance may miss the release target. Mitigation: measure each phase, use typed arrays for agent state, and run
  sweeps on Node worker threads.

## Still deferred

- A market for firm shares. Profit-sharing is the substitute in this release, measured from finance flows when the
  investment hurdle is on.
- AI agents whose goals differ from their owners.
- Several countries or currency areas.
- Mechanisms sketched in Phases 43–50 until those phases land: rate transmission beyond deposits, a gradual dual-currency
  transition, a bitcoin market price separate from goods prices in satoshis, durable purchase timing, endogenous
  productivity, life-cycle bequests, inequality and velocity calibration, and design-symmetry cleanup.
