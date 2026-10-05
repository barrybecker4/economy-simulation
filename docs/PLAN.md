# Agent-based economy simulator

This is the specification for the repository. It starts from the design note at <https://docs.google.com/document/d/12w2ni7WsYEOZ_c9pAwSWFjAKsSMPBAEgOaM7XEYCwDQ/edit>. Where that note and this file disagree, this file wins. Those disagreements are recorded in [ADR 0002](adr/0002-money-agents-prices-welfare.md).

The simulation cannot show that one monetary system is better in the real world. It shows which assumptions a conclusion depends on.

Give an implementer one phase at a time. Example: "Implement Phase 1 of docs/PLAN.md. Follow AGENTS.md. Do not start Phase 2."

## Principles

- Determinism: the same seed and configuration produce the same output. `packages/core` never calls `Math.random`, `Date.now`, or any other source of nondeterminism.
- Stock-flow consistency: every movement of money or debt goes through a double-entry ledger. No agent creates or destroys money except through the active regime.
- Questions decide roles: a variable used to draw a conclusion is an output, never a slider. A variable the user wants to assume is a slider.
- Every slider is documented: units, range, default, justification, and a status of sourced, calibrated, or guess.
- Simple first: each phase adds one mechanism, validates it, and only then moves on. Each mechanism has a neutral setting that reproduces the previous phase.
- Core logic is independent of the user interface. The simulation runs in Node and in a browser worker with identical results on the same runtime.

## Technology and layout

- TypeScript strict, pnpm workspaces, Vitest, fast-check, Zod.
- Web application: Svelte and Vite, charts with uPlot, simulation in a Web Worker.
- Continuous integration: GitHub Actions runs lint, format check, typecheck, and tests.
- Deployment, in the last phase: Cloudflare Pages for the static application. No server for the first release.
- Optional analysis notebooks live in `packages/analysis` when the experiment phase needs them.

Layout:

- `AGENTS.md` and `.cursor/rules/`
- `docs/PLAN.md`, `docs/model.md`, `docs/assumptions.md` (generated in Phase 1), `docs/adr/`
- `packages/core`: `rng`, `ledger`, `config`, `engine`, `agents`, `markets`, `goods`, `contracts`, `regimes`, `ai`, `shocks`, `metrics`
- `packages/cli`
- `packages/app`
- `scenarios/`
- `.github/workflows/ci.yml`

## Conventions

- Read this file and `docs/model.md` before changing simulation behavior.
- Write tests first for ledger, accounting, and regime logic.
- Fiat money is integer cents, checked for overflow. Bitcoin money is an IEEE-754 double in satoshis and may be fractional. The fiat audit is exact. The bitcoin audit uses a relative epsilon. Output hashes use a canonical decimal format. Ratios, rates, and productivity may be floating point.
- Use the seeded RNG and pass it explicitly. Iterate agents by numeric id. Give agents independent streams so one agent's draws do not move another's.
- Keep every tunable in the slider registry.
- Agents decide in `decide()` and act through the ledger and markets.
- Do not add a dependency without noting why.
- Do not start a later phase.

## Time and scale

- One tick is one month. A default run is 50 years (600 ticks). Both are configuration.
- Development population: 1,000 agents, 100 firms, 3 banks. Release target: 10,000 agents and 500 firms.
- The AI share of agents is a slider path, not a hard cap.
- Performance, measured and adjusted as phases land: a development run of 600 ticks in under one second in Node, and a release-size run in under 15 seconds.

## Domain model

### Actors

Agents are one population. Each agent is a human or an AI agent.

| Actor        | Role                                                                        | Main decisions                                                                      |
| ------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Human        | Supplies labor, consumes, saves, borrows, owns firms, homes, and AI capital | Consumption, saving, borrowing, which job to accept, which housing contract to use  |
| Firm         | Produces goods, employs humans, rents or owns AI capacity                   | Price, wage offers, hiring, investment, adoption of AI, profit-sharing versus loans |
| Bank         | Accepts deposits and makes loans                                            | Lending volume and interest rate, subject to the regime                             |
| Government   | Taxes, spends, and issues debt                                              | Spending, transfers, and borrowing                                                  |
| Central bank | Fiat and hybrid regimes only                                                | Policy rate by rule, optional asset purchases, lender of last resort in the hybrid  |
| AI agent     | Performs tasks and, in a later phase, transacts on its own account          | Which tasks to take and how to spend its compute budget                             |

### Markets

- Labor: firms post wages and vacancies, humans search, matching is random with a limit on applications per tick.
- Goods: buyers sample firms and prefer lower prices. Firms hold inventory. Categories gain their own prices in Phase 3.
- Credit: banks supply loans to firms and households, until the contract phase replaces some of that credit.
- Bonds, from the fiat economy onward: the government sells bonds and banks, households, or the central bank buy them.
- Compute, from the AI productivity phase: firms buy AI capacity at a price that falls over time.
- Property, from the relative-price phase: scarce real assets clear separately from the consumption basket.

### Behavioral rules to write into docs/model.md

These are starting rules. Mark each as sourced or as a guess when it is implemented.

- Production: output equals productivity A times capital K to the power alpha times effective labor L to the power one minus alpha. Alpha defaults to 0.33.
- Wage setting: a firm's target wage moves with labor-market tightness and its price level. The actual wage moves toward the target by an amount reduced by nominal rigidity, so a high rigidity means wages adjust slowly, especially downward.
- Pricing: unit cost times one plus a markup, adjusted up when inventory is low and down when inventory is high.
- Consumption: a household consumes a fraction of expected income plus a smaller fraction of wealth. The fractions depend on time preference.
- Investment: firms invest when expected demand exceeds capacity, financed first from retained earnings and then by loans.
- Failure: a firm with negative equity for a set number of ticks goes bankrupt, its loans are written off against the bank's capital, and a new firm may enter.
- Central bank, fiat: policy rate equals the neutral real rate plus inflation plus a weight on the inflation gap plus a weight on the output gap.

### The same variable changes role by regime

| Variable           | Fiat                                               | Bitcoin standard                                                             |
| ------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------- |
| Base money supply  | Set by the central bank rule                       | Fixed by the protocol schedule                                               |
| Interest rate      | Policy rule                                        | Output that clears loanable funds                                            |
| Credit expansion   | Output, limited by reserve and capital rules       | Output, limited by willingness to lend saved funds, and reduced by deflation |
| Price level        | Output                                             | Output, in fractional satoshis                                               |
| Government deficit | Slider, financed by bonds the central bank may buy | Slider, financed only by taxes or market borrowing                           |

### Relative prices

Phase 2 uses one consumption good. The current basket is the nine CPI categories in [docs/model.md](model.md): food and beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics. Each has a price in the regime's unit. Housing supply and the category productivity rates move those prices apart. The expenditure-weighted average is the CPI.

Headline inflation is the change in that index. It can sit near the fiat target, or fall under bitcoin, while electronics and apparel cheapen and housing, energy, medical care, and education rise.

### Deflation and contracts

Expected inflation is the recent change in the headline index. Deflation `d` is zero when that change is positive, and the absolute value when it is negative. A sensitivity slider scales behavior by `d`:

- Loan demand, bank willingness to lend, and speculative bids for property fall as `d` rises.
- Nominal debt, including mortgages and tradeable equity, loses weight as `d` rises.
- Replacement contracts gain weight as `d` rises.

First contract families:

- Profit-sharing. A firm raises funds by promising a fraction of future profits. The claim is not a share with a speculative price. With sensitivity at zero, or with no deflation, firms use retained earnings and ordinary loans, and profit-sharing stays unused.
- Housing, chosen per household:
  - Nominal mortgage, in the fiat regime.
  - Bitcoin-collateralized loan, with a loan-to-value limit and liquidation if the collateral ratio breaks.
  - Targeted savings cooperative: members save toward a home and take turns drawing the pool.
  - Rent-to-own: rent accumulates a claim without a large nominal debt.

Agents choose the contract with the lowest expected real burden given `d`. These two families are the first entries. The menu can grow later.

### How outcomes are judged

Every tick records level and distribution. Human metrics use human agents only. AI agents are reported through composition metrics, not through well-being.

- Inequality: Gini of wealth, income, and consumption; top-decile wealth share; bottom-quintile wealth share.
- Wealth and income: mean and median real wealth; mean and median real income.
- Consumption: mean and median real consumption; share of humans below a consumption floor.
- Well-being: log real consumption plus a housing-security score. Security is lowest when unhoused, higher when renting or waiting in a cooperative, higher as rent-to-own vests, and highest when the home is owned. Report mean, median, and the consumption-floor share. The housing weight is a slider.
- Composition: AI share of agents, wealth, output, and transactions.
- Stability: unemployment, defaults, bank failures, credit relative to GDP, boom and bust length.

The default comparison shows these side by side. A composite index is optional. Its weights are sliders with status guess. Changing a weight changes the ranking and does not change the simulated economy.

Other outputs recorded every tick: real GDP and growth, productivity per human, price level and category prices, inflation, interest rates, money supply, velocity, labor share, share of tasks automated.

### How AI enters

Three channels, each with its own sliders.

1. Productivity through task automation. The automatable share follows an S-curve from `ai.automatableShareStart` to `ai.automatableShareEnd`. A share `ai.physicalTaskShare` cannot be automated. Effective labor is human hours plus AI labor-equivalents, limited by the automatable share.
2. AI capital, cost, and ownership. Compute cost falls at `ai.computeCostDeclineRate`. Firms adopt AI when its cost per task is below the wage. Returns go to owners. `ai.ownershipConcentration` sets how concentrated ownership is across humans.
3. AI agents as economic actors. The share of agents that transact on their own account grows toward `ai.agentAutonomyShareEnd` and may become most of the population. Earnings accrue to a human owner. Payment friction is `ai.paymentFrictionFiat` or `ai.paymentFrictionBitcoin`. Those friction defaults are guesses.

### Initial slider registry

Defaults are placeholders. The calibration phase sources them or labels them as guesses. Each slider also has a plain-language description and a status.

| Group       | Slider id                              | Default         | Range                        |
| ----------- | -------------------------------------- | --------------- | ---------------------------- |
| Behavior    | household.timePreferenceMean (annual)  | 0.04            | 0.01 to 0.15                 |
| Behavior    | household.timePreferenceStd            | 0.02            | 0 to 0.08                    |
| Behavior    | household.inflationTimePreference      | 0.1             | 0 to 0.5                     |
| Behavior    | household.skillSigma                   | 0.5             | 0.1 to 1.2                   |
| Behavior    | household.trustInBanks                 | 0.9             | 0 to 1                       |
| Behavior    | firm.markup                            | 0.2             | 0.05 to 0.6                  |
| Behavior    | firm.priceAdjustSpeed                  | 0.3             | 0.05 to 1                    |
| Behavior    | wage.nominalRigidity                   | 0.7             | 0 to 0.95                    |
| Environment | productivity.baseGrowth (annual)       | 0.01            | 0 to 0.04                    |
| Environment | population.growth (annual)             | 0.005           | -0.01 to 0.02                |
| Environment | shock.frequency (per year)             | 0.1             | 0 to 1                       |
| Environment | shock.size                             | 0.05            | 0 to 0.3                     |
| Policy      | tax.incomeRate                         | 0.2             | 0 to 0.5                     |
| Policy      | government.spendingShareOfGDP          | 0.2             | 0 to 0.5                     |
| Policy      | government.ubiShare                    | 0.25            | 0 to 1                       |
| Policy      | centralBank.inflationTarget            | 0.02            | 0 to 0.06                    |
| Policy      | centralBank.inflationWeight            | 1.5             | 1 to 3                       |
| Policy      | centralBank.outputWeight               | 0.5             | 0 to 1.5                     |
| Policy      | bank.reserveRequirement                | 0.1             | 0 to 0.3                     |
| Policy      | bank.capitalRatio                      | 0.08            | 0.04 to 0.2                  |
| Regime      | regime.type                            | fiat            | fiat, bitcoin, hybrid        |
| Regime      | bitcoin.lendingModel                   | maturityMatched | maturityMatched, fullReserve |
| Goods       | goods.electronicsProductivity (annual) | 0.08            | 0 to 0.3                     |
| Goods       | goods.foodProductivity (annual)        | 0.01            | 0 to 0.3                     |
| Goods       | goods.housingSupplyGrowth (annual)     | 0               | -0.01 to 0.02                |
| Goods       | goods.energyProductivity (annual)      | 0.005           | 0 to 0.3                     |
| Goods       | goods.apparelProductivity (annual)     | 0.04            | 0 to 0.3                     |
| Goods       | goods.transportProductivity (annual)   | 0.02            | 0 to 0.3                     |
| Goods       | goods.medicalProductivity (annual)     | 0.003           | 0 to 0.3                     |
| Goods       | goods.educationProductivity (annual)   | 0.001           | 0 to 0.3                     |
| Goods       | goods.recreationProductivity (annual)  | 0.03            | 0 to 0.3                     |
| Contracts   | deflation.sensitivity                  | 1               | 0 to 5                       |
| Welfare     | welfare.housingSecurityWeight          | 0.5             | 0 to 2                       |
| AI          | ai.automatableShareStart               | 0.1             | 0 to 0.5                     |
| AI          | ai.automatableShareEnd                 | 0.9             | 0.3 to 1                     |
| AI          | ai.adoptionMidpointYear                | 15              | 3 to 40                      |
| AI          | ai.adoptionSteepness                   | 0.4             | 0.1 to 1.5                   |
| AI          | ai.computeCostDeclineRate (annual)     | 0.3             | 0 to 0.6                     |
| AI          | ai.physicalTaskShare                   | 0.3             | 0 to 0.7                     |
| AI          | ai.ownershipConcentration              | 0.8             | 0.1 to 0.99                  |
| AI          | ai.agentAutonomyShareEnd               | 0.5             | 0 to 1                       |
| AI          | ai.paymentFrictionFiat                 | 0.02            | 0 to 0.1                     |
| AI          | ai.paymentFrictionBitcoin              | 0.005           | 0 to 0.1                     |

Welfare composite weights, all defaulting to 0 so the index stays off until a user opts in, are sliders with status guess: `welfare.weightInequality`, `welfare.weightMedianWealth`, `welfare.weightWellbeing`, `welfare.weightStability`, each from 0 to 1.

### Hypotheses

| Id  | Hypothesis                                                                                                                                                                | Sweep                                                                 | Outputs                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| H1  | Under a fixed money supply, rapid AI productivity growth lowers the price level, and with rigid nominal wages this raises unemployment and debt burdens in the short run. | regime.type, ai.adoptionSteepness, wage.nominalRigidity               | Price level, unemployment, defaults, credit relative to GDP |
| H2  | A central bank that targets inflation smooths the transition to AI-driven growth more than a fixed supply does.                                                           | regime.type, centralBank.inflationWeight, shock.size                  | Output volatility, boom-bust amplitude                      |
| H3  | Labor share falls as AI is adopted in any regime, and the fall depends mainly on ownership concentration.                                                                 | ai.ownershipConcentration, regime.type                                | Labor share, Gini, top decile share                         |
| H4  | Lower payment friction for AI agents increases their share of transactions.                                                                                               | ai.paymentFrictionFiat, ai.paymentFrictionBitcoin, regime.type        | AI transaction share, GDP growth                            |
| H5  | Credit-driven booms are smaller when lending is limited to saved funds.                                                                                                   | bitcoin.lendingModel, bank.reserveRequirement, regime.type            | Credit relative to GDP, bank failures, boom-bust amplitude  |
| H6  | A physical bottleneck limits how much AI raises growth, regardless of regime.                                                                                             | ai.physicalTaskShare, regime.type                                     | GDP growth, productivity per human                          |
| H7  | Stronger deflation reduces credit, borrowing, and speculation, and raises profit-sharing and non-mortgage housing.                                                        | deflation.sensitivity, regime.type, productivity.baseGrowth           | Credit relative to GDP, property turnover, contract shares  |
| H8  | Electronics get cheaper and housing gets more expensive inside either headline inflation path.                                                                            | goods.electronicsProductivity, goods.housingSupplyGrowth, regime.type | Relative prices, CPI                                        |

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

1. Seeded RNG (sfc32 or similar) with uniform, normal, lognormal, Poisson, and weighted choice. Support splitting into independent streams.
2. Double-entry ledger. Fiat uses integer cents and an exact audit. Bitcoin uses floating-point satoshis and a relative-epsilon audit.
3. Slider registry: id, label, group, unit, default, min, max, description, source, and status. Validate scenarios with Zod.
4. Scenario loader that merges a preset, overrides, and the seed, and records the resolved configuration.
5. Tick scheduler in a fixed order: shocks, population mix, labor market, production, goods and asset markets, contract choice, credit, government, central bank, bookkeeping, welfare metrics. Later phases fill the empty steps.
6. Metrics recorder for the welfare series and the other outputs, exportable to JSON and CSV.
7. CLI: `run --scenario file --seed n --out file`.
8. Generator for `docs/assumptions.md`. CI fails if the file is stale.

Acceptance:

- Two runs with the same seed and scenario produce identical output hashes.
- Property tests show that random transfers satisfy the audit, including fractional satoshi transfers.
- Changing one agent's behavior does not change the random draws used by other agents.
- `docs/assumptions.md` is generated and CI fails if it is out of date.

### Phase 2: Minimal fiat economy

Goal: a stable single-good fiat economy with human agents, firms, one commercial bank, a government, and a central bank. AI share is fixed at zero.

1. Households with skill, time preference, wealth, labor supply, and consumption.
2. Firms with production, pricing, wages, hiring, investment, borrowing, and bankruptcy with entry.
3. Labor market with limited search and random matching.
4. Goods market with sampled shopping and inventories.
5. Commercial bank with deposit creation, a reserve requirement, and a capital ratio.
6. Government with income tax, spending, transfers, and bonds. Central bank with the rate rule and optional bond purchases.
7. Shocks: productivity, demand, and credit, from the seeded generator.
8. Write `docs/model.md` for every rule, with equations and the reason for each choice.
9. Record inequality, mean and median real wealth, mean and median real consumption, and consumption well-being.
10. Stylized-facts tests (see Validation).

Acceptance:

- The ledger audit passes at every tick.
- With the automatable start and end shares equal and no shocks, unemployment stays between 3 and 12 percent. With default sliders and no shocks, final unemployment sits above 6 percent as AI raises the natural rate, inflation stays within 2 points of the target, and no variable grows without bound over 600 ticks.
- The stylized-facts tests pass for fiat.
- Development-size runs meet the performance target.

Out of scope: bitcoin, relative prices, contract switching, and AI.

### Phase 3: Relative prices

Goal: different goods can inflate differently inside the fiat economy.

1. Split the CPI into food and beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics.
2. CPI is the expenditure-weighted average of those categories. Housing security uses the housing price relative to the CPI.
3. A neutral setting with every category productivity and housing supply growth equal to baseline productivity reproduces one price.

Acceptance:

- Raising electronics productivity lowers that relative price.
- Tightening housing supply raises that relative price.
- Headline CPI can stay near target while those relative prices move in opposite directions.
- The ledger audit still passes.

### Phase 4: Bitcoin standard, hybrid, and contract shift

Goal: a second rule set selected by `regime.type`, plus financing that responds to deflation.

1. A regime interface for base-money creation, the lending constraint, the interest-rate mechanism, and government financing. Move fiat behind it without changing behavior when `deflation.sensitivity` is zero.
2. Bitcoin: base money follows a fixed schedule (zero growth by default), balances are fractional satoshis, no central bank, government borrows only at market rates.
3. Lending models: maturity-matched time deposits, and full-reserve loans from explicit savings.
4. Interest rate discovery: move the loan rate toward the level that equates supplied savings with loan demand.
5. Hybrid: a fixed-supply base asset and a central bank limited to lender of last resort.
6. Deflation penalty and the contract menu (profit-sharing, mortgage, bitcoin-collateralized loan, savings cooperative, rent-to-own).
7. CLI comparison of the same seeds under two regimes, including the welfare dashboard.
8. Extend `docs/model.md` and the stylized-facts tests where the facts apply.

Acceptance:

- The ledger audit passes in every regime.
- Fiat results from Phase 3 are unchanged when deflation sensitivity is zero.
- Total base money never exceeds the bitcoin schedule, and credit never exceeds savings made available to lend.
- With default productivity growth and no shocks, the CPI trends down under bitcoin and up under fiat, and both economies stay stable.
- Category prices still diverge inside that trend.
- A larger deflation rate lowers credit relative to GDP and property turnover, and raises the share of profit-sharing and non-mortgage housing.

Out of scope: AI mechanisms.

### Phase 5: AI productivity and ownership

Goal: channels 1 and 2. AI raises productivity and can displace workers. AI agents do not yet transact.

1. Task-based production and the S-curve automatable share.
2. AI capacity as an input with a falling compute cost, adopted when cost per task beats the wage.
3. AI capital ownership across humans, concentrated by `ai.ownershipConcentration`.
4. Displaced workers search less effectively when their skills match automated tasks.
5. Outputs: labor share, AI share of output, share of tasks automated, Gini, top decile.
6. Presets as category compositions: no-AI (AI bullishness none), modest / slow adoption, high / fast adoption, and extreme. AI bullishness is one category that sets the productivity gain, the adoption curve, and the physical-task ceiling together.
7. Write the channel 1 and 2 sections of `docs/model.md`.

Acceptance:

- Setting `ai.automatableShareEnd` equal to `ai.automatableShareStart` matches Phase 4 for the same seeds.
- In the fast-adoption preset, productivity per human rises, the labor share falls, and unemployment rises without cutting real GDP, in both regimes.
- Raising `ai.physicalTaskShare` lowers the growth benefit of AI (monotonicity).
- The household grant is zero when the AI share of output is zero or `government.ubiShare` is zero, and positive under fast adoption.
- The ledger audit passes in all regimes with AI enabled.

### Phase 6: AI agents as economic actors

Goal: channel 3. An increasing share of the agent population transacts on its own account.

1. AI agents have an owner, a balance in the regime's unit, a compute budget, and a service price. They sell services to firms, buy goods, and pay income tax.
2. The autonomy share grows toward `ai.agentAutonomyShareEnd`.
3. Each agent transaction pays the regime's friction slider. The fee goes to banks under fiat and to the network under bitcoin.
4. An agent-to-agent market discovers a price for services.
5. Outputs: AI transaction share, payment volume, fee revenue, and the share of GDP that is agent-to-agent trade.
6. After tax and shopping, earnings above a retained compute share sweep to human owners each tick.
7. Write the channel 3 section of `docs/model.md`. List which assumptions are guesses.

Acceptance:

- An autonomy share of zero matches Phase 5 for the same seeds.
- Money is conserved on agent-to-agent trades, including fractional satoshi fees.
- Lower friction raises the AI transaction share (monotonicity).
- With autonomy above zero, agents pay income tax and buy goods.
- A high end share, at least half of agents, still meets the development performance target.

Out of scope: AI agents whose goals differ from their owners, and a market for firm shares.

### Phase 7: Experiment tooling

Goal: test hypotheses across seeds and parameter values.

1. CLI batch runner for a sweep file: sliders, regimes, and seed count, in worker threads.
2. Store JSON lines with the resolved configuration and git commit.
3. For every welfare series: mean, median, and 5th and 95th percentiles across seeds, and paired differences between regimes for the same seed.
4. Morris screening in TypeScript. Optional Python notebook for Sobol indices.
5. Presets as category compositions: Austrian-leaning (bitcoin, tight credit, small public finance), Keynesian-leaning (fiat, deficit spending, employment-leaning central bank), and neutral (every category at its default).
6. A hypothesis runner for H1–H8.

Acceptance:

- A sweep of 5 regime-and-preset combinations by 50 development-size seeds finishes in under 5 minutes.
- The same sweep file and commit give identical results on two machines, using the canonical money format.
- The runner writes a report for H1–H8 with no manual steps.

### Phase 8: Web application

Goal: change assumptions, run a scenario in the browser, and compare regimes.

1. Run the simulation in a Web Worker and stream results so the page stays responsive.
2. Slider panel generated from the registry, grouped, with a tooltip for description, source, and status.
3. Regime toggle and a pinned-baseline overlay of the same seed: freeze a single run, edit the variant, and draw both on each chart with a solid baseline and a dashed variant in the same color. The legend lists each series once. Hovering that item highlights the baseline and the variant together. A pinned pair also draws the month payment diagram as baseline beside variant, with edge amounts on hover instead of a legend.
4. Charts with uPlot for the welfare dashboard and category prices. The horizontal axis labels each month of the run as a calendar month, starting at the month the page is viewed. Seed selector. Many-seeds mode shows the median and a band from the 5th to the 95th percentile.
5. The composite welfare index stays off until the user moves a weight.
6. Shareable links encode the resolved configuration.
7. Assumption ledger: sliders that differ from the default, with guesses flagged.
8. Orthogonal category selectors on each collapsible parameter group (central bank, public finance, credit, AI bullishness), each rewriting only its owned sliders. Groups start collapsed so the presets are visible first.
9. Keyboard-operable controls and chart descriptions.

Acceptance:

- A development-size run finishes in the browser in under three seconds.
- A shared link reproduces the same series on another computer. Date labels follow the month when that computer views the page.
- The application works without a server.

### Phase 9: Calibration, documentation, and release

Goal: make the model credible enough to share.

1. For each slider, record a source, a calibrated target, or the label guess. Guesses are marked in the application.
2. Finish `docs/model.md`, including every equation, and write a one-page limits note: a few goods rather than every product, no international trade, no firm-share exchange, and welfare weights are assumptions.
3. A methods note for each hypothesis.
4. A gallery of example scenarios.
5. Deploy to Cloudflare Pages from GitHub Actions on each merge to `master`.
6. Contribution guide and an issue template for new assumptions, contract types, or hypotheses.

Acceptance:

- Every slider has a status and a source or an explicit guess.
- The deployed application matches the CLI for the same seed and scenario.
- A new contributor can run a sweep from the README alone.

### Phase 10: Spending and prices respond to deflation

Goal: expected deflation can cut discretionary spending, and prices can follow excess demand, without emptying the food and housing floor.

1. Split each household's goods budget into a food and housing floor (the sum of those CPI weights) and a discretionary remainder.
2. `household.realReturnSensitivity` multiplies only the remainder by `max(0, 1 − sensitivity × real return)` when the real return on money is positive. The real return is the deposit rate minus year-over-year inflation. Deposits pay nothing until a later phase. At sensitivity 0 the budget is unchanged.
3. `prices.trendWeight` mixes the regime price trend with excess demand (desired goods spending relative to nominal capacity). At 1 the posted-price rule is unchanged.

Acceptance:

- Sensitivity 0 and trend weight 1 match the previous phase for the same seeds.
- Under deflation, a higher sensitivity cuts household goods spending, and spending stays at or above the food and housing floor.
- With trend weight 0, a negative demand impulse ends at a lower CPI than the same seed at trend weight 1.
- The ledger audit still passes.

Out of scope: household credit, wage-driven hiring, fiscal monetization, and a transition.

### Phase 11: The wage sets employment

Goal: sticky money wages can raise unemployment when prices fall.

1. `labor.wageElasticity` scales the hiring quota when the real wage is high or low relative to productivity. At 0 the quota is unchanged.

Acceptance:

- Elasticity 0 matches Phase 10 for the same seeds.
- Under a falling price level with high nominal wage rigidity and elasticity above 0, unemployment ends higher than in the flexible-wage run.

### Phase 12: Household debts and housing tenure

Goal: households choose tenure and borrow for discretionary spending; deflation raises the burden of nominal mortgages and cuts new consumer credit without removing the food and housing floor.

1. `housing.tenureChoice` defaults to `off`. Off keeps the penalty formulas for profit-sharing, non-mortgage housing, and property turnover.
2. On: each household picks rent, mortgage, or owned by expected real burden. Shelter payments stay inside the Phase 10 floor. Consumer loans fund only discretionary spending and fall as expected deflation rises.
3. Measured shares and debt-service series replace the penalty formulas when the switch is on. Household loans join `totalLoans`.

Acceptance:

- `off` matches Phase 11, and H7 still holds.
- `on`, stronger expected deflation lowers the mortgage share and new consumer borrowing, keeps goods spending at or above the floor, and raises debt service for existing mortgages.
- Household loan creation and repayment pass the ledger audit.

### Phase 13: Investment clears a hurdle

Goal: firms invest only when expected return beats the real return on money plus a premium.

1. `firm.investmentHurdle` defaults to `off`. Off keeps the scheduled capital rule and the profit-sharing formula.
2. On: install capital only when expected profit clears the hurdle; otherwise fund with a profit-sharing claim. `profitSharingShare` becomes the measured finance share.

Acceptance:

- `off` matches Phase 12.
- `on`, higher expected deflation cuts real investment and new firm borrowing and raises the measured profit-sharing share.
- Bitcoin credit still cannot exceed unused savings.

### Phase 14: Fiscal policy has different constraints

Goal: fiat can monetize bonds and stabilize spending; bitcoin cannot; the policy rate can pull discretionary spending through deposit interest.

1. `bank.depositPassThrough` pays a fraction of the policy rate on deposits. It can cut discretionary spending and new consumer credit, not the food and housing floor.
2. `centralBank.bondPurchaseShare` lets the fiat central bank buy a share of new bonds with new reserves. Bitcoin and hybrid ignore it.
3. `government.stabilizer` raises the fiat spending share with the unemployment gap. Under bitcoin, spending is limited to tax revenue plus bonds banks can hold without new base money.

Acceptance:

- All three at 0 match Phase 13.
- Under fiat, a demand shock with higher stabilizer and bond purchases ends with a smaller output drop and higher base money.
- The same shock under bitcoin does not raise base money, and spending does not rise with the stabilizer.
- Pass-through above 0 lets a higher fiat policy rate cut discretionary spending and new consumer credit while leaving the floor in place.

### Phase 15: A one-time transition

Goal: a separate scenario rebases a fiat economy into bitcoin over a window, including existing debts and the distribution of new base-money holdings.

1. `transition.lengthMonths` defaults to 0 (no transition). A positive length starts on fiat and rebases into satoshis over those months.
2. Nominal debts convert at the same rate as deposits unless `transition.debtHaircut` writes part of them off. `transition.holderConcentration` assigns new base-money balances.
3. After the window the regime is bitcoin and Phase 14 monetization is off. There is no second goods price.

Acceptance:

- Length 0 matches steady fiat and bitcoin from Phase 14.
- A positive length conserves the ledger at conversion ticks, puts base money on the bitcoin schedule afterward, and raises wealth Gini when holder concentration is higher.
- A methods note compares 120-month runs across steady fiat, steady bitcoin, and the transition, with seed bands and no composite ranking.

### Phase 16: Inflation raises impatience a little

Goal: goods spending rises slightly when inflation is above the regime's normal path, while the time-preference slider and the fiat policy rate stay fixed.

1. `household.inflationTimePreference` defaults to 0.1. The goods spending share rises by this coefficient times (year-over-year inflation minus normal inflation).
2. Normal inflation is the inflation target under fiat and minus `productivity.baseGrowth` under bitcoin and hybrid. At sensitivity 0 the spending share ignores inflation.
3. Household draws of time preference and the fiat policy rate still use `household.timePreferenceMean` alone. AI agents shop at the mean plus the same common addend.

Acceptance:

- Sensitivity 0 matches Phase 15 spending for the same seeds.
- When measured inflation equals normal inflation, the addend is zero.
- A positive inflation gap raises the spending share by sensitivity times the gap.
- The fiat policy rate rule still uses `household.timePreferenceMean` alone.

### Phase 17: AI bullishness and mass robotics

Goal: the size of the AI productivity gain is a slider, and mass robotics later opens the physical-task ceiling.

1. `ai.bullishness` defaults to 1. At 0 the gain on each adopted task is one tenth of the default and saturates with the adoption curve. At 1 the AI factor is `1 + adopted`, matching Phase 16 when robotics has not started. Above 1 the task gain compounds at `0.15 × (bullishness − 1)` per year with no ceiling.
2. `ai.roboticsStartYear` defaults to 5 and `ai.roboticsRampYears` defaults to 8. From the start year the effective physical-task share falls in a straight line to zero. A start year at or past the last year of the run leaves the ceiling intact.
3. Hiring follows displacement, `adopted × min(taskGain, 1)`, so unbounded gain does not drive unemployment to one. The AI share of output and the household grant track `1 − 1 / AI factor`.

Acceptance:

- Bullishness 1 with robotics delayed past the run matches Phase 16 for the same seeds.
- Bullishness 0 ends with a smaller productivity and unemployment gap than bullishness 1.
- Bullishness 2 keeps productivity per human rising after adoption and the robotics ramp have flattened.
- Equal automatable shares still ignore bullishness and robotics.
- With robotics delayed, a higher physical-task share still lowers the gain. After a finished ramp that gap shrinks sharply.
- The ledger audit passes at bullishness 2 with the default ramp.

## Validation

Before testing a new idea in a regime, the model should reproduce facts economists broadly accept. These are automated tests on a fixed set of seeds. Each test states a tolerance. Failures report the seed.

- Credit-driven expansions are followed by contractions of comparable duration.
- Wealth is more unequally distributed than income, and income is more unequally distributed than skill.
- In the fiat regime, there is a short-run negative relationship between unemployment and inflation under sticky wages.
- Output is more volatile than consumption, and investment is more volatile than output.
- A positive productivity shock raises output and lowers prices in the short run.
- Higher bank capital ratios lower the frequency of bank failures.

## Risks

- Results may reflect the builder's assumptions more than the economy. Mitigations: the assumption ledger, presets from different views, seed sweeps, and sensitivity analysis.
- The model may become too complex to test. Mitigation: one mechanism per phase, with a neutral setting that reproduces the previous phase.
- Interactions may be unstable. Mitigation: the ledger audit every tick, replayable seeds, and logging of failing ticks.
- AI sliders have little history. Mitigation: label them as guesses, sweep wide ranges, and report where conclusions change.
- Floating-point satoshis can drift. Mitigation: a relative audit tolerance and canonical output formatting.
- Performance may miss the release target. Mitigation: measure each phase, use typed arrays for agent state, and run sweeps on Node worker threads.

## Still deferred

- A market for firm shares. Profit-sharing is the substitute in this release, measured from finance flows when the investment hurdle is on.
- AI agents whose goals differ from their owners.
- Several countries or currency areas.
- A bitcoin price separate from goods prices in satoshis.
- Hypotheses beyond H1–H8.
