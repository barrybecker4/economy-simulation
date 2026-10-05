# Model

Equations and behavioral rules. A section is not part of the simulation until the phase that implements it fills it in. Sources and guesses are named here, and slider status lives in the registry.

## Accounting

Implemented in Phase 1. See [ADR 0002](adr/0002-money-agents-prices-welfare.md).

A ledger holds one unit. Fiat amounts are integer cents, stored as integers and rejected above `Number.MAX_SAFE_INTEGER` (2^53 − 1). Bitcoin amounts are IEEE-754 doubles in satoshis and may be a fraction of a satoshi.

Each account is an asset, a liability, or equity. A debit increases an asset and decreases a liability or equity. A credit does the opposite. A transaction has at least two lines, and its debits equal its credits. The books update only after every line is valid, so a rejected transaction leaves balances unchanged.

Issuing base money credits a liability account and debits an asset account by the same amount. Redeeming reverses that. Moving money between holders credits one asset and debits another. Capitalizing credits an equity account and debits an asset.

The audit identity is:

```text
assets = liabilities + equity
```

For cents the identity is exact. For satoshis it holds within `max(1e-9, 1e-8 * scale)`, where `scale` is the largest absolute balance and at least 1. The relative term absorbs double rounding. The absolute term covers balances near zero. These tolerances are numerical guards, not economic parameters.

An empty ledger satisfies the identity. The phase 2 economy posts one sector journal at the start of the first tick and again during bookkeeping. Customer deposits, loans, reserves, and government bonds are each recorded as an asset and a matching liability, so a change in the stock stays inside the identity. Bank vault cash equals bank equity plus a private-equity residual. Equity may be negative after a loss. An asset balance may not.

## Time

One tick is one month. A scenario's `ticks` field sets the length of a run. The default is 600 ticks, which is 50 years. The maximum accepted value is 12,000 ticks, a guard against an accidental huge run, not an economic assumption. The core never reads the wall clock. The web charts place tick 0 on the first day of the month when the page is viewed, and each later tick on that day in a later month. The run itself still starts at month 0.

## Randomness

The seeded generator is sfc32. splitmix32 fills its four words from a FNV-1a mix of the seed and a stream id. The first 12 outputs are discarded so the first visible draw is mixed. That warmup is part of the stream definition.

`fork(id)` depends only on the root seed and the id. Using one stream does not change another. Calling `fork(id)` again restarts that stream; keep the returned object if later draws should continue it. Agent id `n` and the string `"n"` name the same stream.

Uniforms are on `[0, 1)`. Normal draws use Box–Muller. A standard deviation of zero returns the mean and does not consume a draw. Lognormal is the exponential of a normal draw. Poisson uses Knuth's product method and rejects a lambda above 10,000. Weighted choice uses the cumulative sum and skips zero weights.

## Scheduler

Each tick runs, in order: shocks, population mix, labor market, production, goods and asset markets, contract choice, credit, government, central bank, bookkeeping, welfare. The bookkeeping step records the audit. Welfare can read that audit. The result's audit is taken again after the tick. A caller of the scheduler can leave a step empty. The economy fills every step.

The ledger unit follows `regime.type`: fiat uses cents; bitcoin and hybrid use satoshis.

## Metrics

Every tick stores one row. Series that nothing has set are null. `auditOk` is 1 when the end-of-tick audit passes and 0 otherwise. JSON output is deterministic for a seed and scenario. Hashes use a second form of that output in which object keys are sorted and every number is written in exponential form with 12 digits after the decimal point.

`giniSkill` is the dispersion of skill. `realInvestment` is the sum of capital gaps installed that tick. Well-being is `log(max(real consumption, 0.01))` plus the housing-security term in the welfare section. AI shares and `tasksAutomated` stay at 0 when the automatable shares are equal and autonomy ends at 0.

## Agents

Each household draws a skill from a lognormal distribution with slider `household.skillSigma`, then skills are divided by their mean so the mean skill is 1. Time preference is a normal draw around `household.timePreferenceMean` with standard deviation `household.timePreferenceStd`, clamped to [0.01, 0.15]. Initial deposits are proportional to skill squared, so wealth starts more unequal than income. Households are assigned to banks round-robin.

## Production

A firm produces with Cobb–Douglas technology. Let `L*` be the headcount the firm would have at 94 percent of households, and `L_hat = L* × humanWeight`. Capacity is

```text
Y = A_firm * A * (1 + productivity impulse) * K^α * (L*)^(1−α) * aiFactor * (L / L_hat)^((1−α) × humanWeight)
```

When `humanWeight` is 1 this is the ordinary `K^α L^(1−α)` rule. When the firm is staffed at the AI-scaled hiring target, `L / L_hat` is 1, so fewer human workers do not cut output. A further shortfall still cuts capacity, with an elasticity that shrinks as humans become a smaller share of output.

`A_firm` is a lognormal draw around 1, clamped to [0.8, 1.25]. `A` is economy-wide productivity and grows at `productivity.baseGrowth`. α is `production.alpha`. Capital starts equal to employment and depreciates at 0.5 percent a month. Real GDP is the sum of capacities, not inventory restocking. If inventories are away from one month of capacity, the firm also builds or sheds stock, up to half of capacity, and that adjustment is not counted as GDP.

## Labor market

Each month 2 percent of employed workers separate. Let `humanWeight = 1 / aiFactor`. Firms then hire until employment reaches `0.94 × households × humanWeight`, scaled by the demand impulse and clamped to [0.85, 1.15] times that target. A searcher applies to at most `labor.maxApplications` firms. The natural unemployment rate is `1 − 0.94 × humanWeight`. It starts at 6 percent when `aiFactor` is 1 and rises as AI capacity grows.

The money wage grows at the monthly inflation target plus monthly productivity growth. Tightness is `(natural unemployment − unemployment) × humanWeight`. A positive tightness adds a further wage term and a negative one subtracts. `wage.nominalRigidity` shrinks that gap, and it shrinks a negative gap by the square of the remaining flexibility, so wages are stickier downward. The contract wage at a firm is the money wage times the firm's productivity. Pay offered to a worker is that wage times the worker's skill.

## Goods and relative prices

There is one consumption good. A household's budget is a smoothed income, times a marginal propensity of `1 − government.spendingShareOfGDP` tilted by how impatient the household is, times one plus the demand impulse, plus a small spend out of deposits above 48 months of income. Smoothed income is 90 percent of its previous value plus 10 percent of this tick's income. The household visits up to `goods.sampleSize` firms and buys from those that have stock.

The government buys the remaining `government.spendingShareOfGDP` share of the same income base, starting with the firms that hold the most inventory. If tax revenue does not cover that purchase, the treasury issues bonds and the first bank holds them.

Wages and profits are paid from firm receipts after those sales. Profit shares use weights `skill^1.5`, so capital income is more concentrated than wages. Five percent of earned income is then moved to unemployed households. The sum of income does not change.

A firm's posted price grows at the monthly inflation target. A small nudge, at most 0.1 percent a month, pulls the price toward unit labor cost times `1 + firm.markup` times a tight inventory pressure term. A demand impulse adds to that growth and a productivity impulse subtracts. The basket price is the capacity-weighted average of firm prices. That basket price is the CPI. Twelve-month inflation uses it. The history is prefilled so the first year already sits on the target path.

The basket is nine categories whose expenditure-weighted average is the CPI. The shares follow the U.S. CPI-U relative importance for December 2024. Household energy is removed from housing and the rest of energy from transportation, so energy is its own category. Electronics is a one-percent slice. Education is tuition and childcare, not communication. Those shares are rescaled so the nine categories sum to one: food and beverages 0.153025, housing 0.431578, energy 0.065483, apparel 0.026126, transportation 0.143143, medical care 0.087152, education 0.027211, recreation 0.055749, and electronics 0.010533.

After t years a category's unscaled price relative to baseline productivity is `((1 + productivity.baseGrowth) / (1 + g))^t`, where g is that category's productivity slider. Housing uses supply instead: `((1 + productivity.baseGrowth) / (1 + goods.housingSupplyGrowth))^t` times one minus the deflation penalty. The nine prices are then scaled so their expenditure-weighted average equals the CPI. `priceGeneral` is that average with electronics removed. Setting every category productivity and housing supply growth equal to baseline productivity, with no deflation penalty, puts every category on the CPI. Households still buy one basket. The split does not open a separate shop.

## Credit and contracts

Firms start with loans equal to half of capital times the initial price. Bank equity is 1.5 times the regulatory multiple `capitalRatio / (1 − capitalRatio)` of those loans, which leaves room to lend. The capital rule constrains loans. Reserves are created by the central bank and do not use that room. Lending room is `equity / capitalRatio − loans`, and a positive credit impulse widens it.

Interest is the policy rate plus 2 percent, charged monthly when the firm can pay. The payment raises bank equity and lowers the private-equity residual. Equity above the target is paid out the other way, so interest does not quietly recapitalize a bank before a credit loss.

Routine investment replaces a year of depreciation in the month whose tick is divisible by 12. During a credit expansion, firms also borrow and raise desired capital. A firm whose equity (deposits plus capital at the posted price, minus loans) stays negative for 6 months is replaced. Its loan is written off against bank equity.

When expected deflation is positive and `deflation.sensitivity` is positive, a share of loans is repaid each month and the recorded profit-sharing and non-mortgage housing shares rise with the penalty. Those shares are accounting reports. There is no exchange for firm shares.

## Government and central bank

The income tax rate is `tax.incomeRate`. Households and AI agents both pay it from deposits. Revenue lands in the treasury's deposit.

After tax is collected, the treasury pays a household grant

```text
grant pool = government.ubiShare × AI share of output × price × real GDP
```

where the AI share of output is `1 − humanWeight` once compute is adopted, and zero otherwise. The pool is split equally across households, added to deposits, and counted in income after wages so it enters smoothed income and is taxable next month. Tax is the first source of funds. If the treasury deposit cannot cover the grant, it issues bonds to the first bank. Agents do not receive the grant. See [ADR 0003](adr/0003-ubi-and-agent-tax.md).

The central bank sets

```text
policy rate = max(0, time preference + inflation + inflationWeight * (inflation − target) + outputWeight * (natural unemployment − unemployment) * humanWeight)
```

If bank reserves are below `bank.reserveRequirement` times deposits, the central bank issues the gap to the first bank. That accommodation is a fiat rule. Bitcoin and hybrid do not create reserves to meet the requirement. The hybrid lender of last resort is described under regimes.

## Welfare

Real wealth and real income divide nominal stocks by the CPI. Real consumption is goods bought by households. The Gini of wealth, income, and skill uses the standard sorted-share formula. Negative wealth is shifted before the Gini so the measure stays defined. The consumption floor share is the fraction of households below one quarter of median real consumption. Housing security for a household is its real income divided by median real income and by `1 + housing/CPI`, clamped to [0, 1]. Well-being is the log of real consumption, floored at 0.01, plus `welfare.housingSecurityWeight` times that household's housing security. A composite of inequality, median wealth, well-being, and stability is computed only when the user sets one of those weights away from zero. The stability term is `clamp(1 − unemployment + naturalUnemployment − 0.06, 0, 1)`, so resting at a rising natural rate scores like full employment. The weights are assumptions. Human metrics ignore AI agents. Labor share is the wage bill over nominal GDP.

## Regimes

Fiat keeps the central-bank rule above. The price and wage trends follow the inflation target, and the bank creates reserves when the reserve requirement binds. Bitcoin and hybrid use satoshis, including fractions. Their price trend is minus baseline productivity, because base money does not grow. The loan rate moves toward the gap between loans and savings. Savings are 25 percent of household deposits under maturity-matched lending and 10 percent under full reserve. New bitcoin credit cannot exceed the unused savings. The government still finances a shortfall by selling bonds to banks, not by central-bank money. A hybrid central bank does not target inflation. If a bank's equity is negative it injects enough reserves and vault cash to make that equity positive. That is the only base-money growth in the hybrid regime. Expected deflation is `max(0, −inflation)`. `deflation.sensitivity` times that rate, capped at 0.9, repays loans, cuts housing demand, and raises the recorded shares of profit-sharing and non-mortgage housing. The penalty is zero when sensitivity is zero or inflation is positive, so the fiat path is unchanged.

## AI productivity

The automatable share follows a logistic from `ai.automatableShareStart` to `ai.automatableShareEnd`. The midpoint is `ai.adoptionMidpointYear` and the slope is `ai.adoptionSteepness`. When the two shares are equal the share does not move and AI does not change production, hiring, or ownership. Compute cost starts at the wage and falls at `ai.computeCostDeclineRate`. Firms adopt only once that cost is below the wage. Adopted tasks are the gain in the automatable share times `1 − ai.physicalTaskShare`. The AI factor is `1 + adopted`, and `humanWeight = 1 / aiFactor`. Capacity follows the production section. Hiring, wages, and the fiat policy rate scale with `humanWeight` as in the labor and government sections. A displaced worker, one whose skill is below the automated share while adoption is underway, makes only one job application a month. Profit shares use `skill` raised to `1.5 + ownershipConcentration * (AI factor − 1)`, so the AI capital income is more concentrated.

## AI agents

The autonomous share rises linearly from zero to `ai.agentAutonomyShareEnd` over five years. An agent has an owning household, a deposit in the regime's unit, an income, a smoothed income, and a service price of 4 percent of the wage. It sells one unit of compute to a firm when that price times one plus payment friction is below 4.2 percent of the wage. Friction is `ai.paymentFrictionFiat` in the fiat regime and `ai.paymentFrictionBitcoin` otherwise. The fee is paid into bank equity. The agent then shops with the household budget rule at mean time preference, reserving enough deposit to pay income tax. It pays `tax.incomeRate` on its income. After tax it keeps 1 percent of the wage for compute and sweeps the residual to its owner. Agent purchases count in goods demand and in the AI transaction share. Human well-being, income, and wealth use households only. When the autonomy share ends at zero, no agents are created and the rest of the economy is unchanged.

## Shocks

From tick 24, every 12th tick draws a shock with probability `shock.frequency`. The kind is credit, demand, or productivity with equal weight. A shock lasts 24 months: 12 of expansion and 12 of contraction. Credit expansion raises the lending impulse. At the turn of the year, 10 percent of firm loans are written off. The contraction then removes the impulse. Demand expansion adds `shock.size` to spending and hiring; the contraction subtracts half of that. Productivity expansion multiplies capacity by `1 + shock.size` and slows price growth. A test can force one shock at a chosen tick. The credit series records a boom and a bust of 12 months when a 24-month window rises by at least 2 percent and then falls.
