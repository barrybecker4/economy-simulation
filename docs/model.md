# Model

Equations and behavioral rules. A section is not part of the simulation until the phase that implements it fills it in.
Sources and guesses are named here, and slider status lives in the registry.

## Accounting

Implemented in Phase 1. See [ADR 0002](adr/0002-money-agents-prices-welfare.md).

A ledger holds one unit. Fiat amounts are integer cents, stored as integers and rejected above `Number.MAX_SAFE_INTEGER`
(2^53 − 1). Bitcoin amounts are IEEE-754 doubles in satoshis and may be a fraction of a satoshi.

Each account is an asset, a liability, or equity. A debit increases an asset and decreases a liability or equity. A
credit does the opposite. A transaction has at least two lines, and its debits equal its credits. The books update only
after every line is valid, so a rejected transaction leaves balances unchanged.

Issuing base money credits a liability account and debits an asset account by the same amount. Redeeming reverses that.
Moving money between holders credits one asset and debits another. Capitalizing credits an equity account and debits an
asset.

The audit identity is:

```text
assets = liabilities + equity
```

For cents the identity is exact. For satoshis it holds within `max(1e-9, 1e-8 * scale)`, where `scale` is the largest
absolute balance and at least 1. The relative term absorbs double rounding. The absolute term covers balances near zero.
These tolerances are numerical guards, not economic parameters.

An empty ledger satisfies the identity. The phase 2 economy posts one sector journal at the start of the first tick and
again during bookkeeping. Customer deposits, loans, reserves, and government bonds are each recorded as an asset and a
matching liability, so a change in the stock stays inside the identity. Bank vault cash equals bank equity plus a
private-equity residual. Equity may be negative after a loss. An asset balance may not.

For fiat cents, each paired stock target is rounded once before posting. Private equity in the journal is the residual
after rounding vault and bank equity, so independent half-cent rounding cannot break `vault = bank equity + private
equity`. Firm cash receipts under cents are split with a floor and a last residual so firm deposits stay integers.

For bitcoin satoshis, stock line amounts are floating point. After many posts, paired equity deltas can drift by a few
parts in 1e-10 so debit and credit no longer match under `bitcoinAmountsMatch`. The stock journal seats that imbalance
on private equity (the vault residual) before posting.

## Time

One tick is one month. A scenario's `ticks` field sets the length of a run. The default is 600 ticks, which is 50 years.
The maximum accepted value is 12,000 ticks, a guard against an accidental huge run, not an economic assumption. The core
never reads the wall clock. The web charts place tick 0 on the first day of the month when the page is viewed, and each
later tick on that day in a later month. The run itself still starts at month 0.

## Expectations

Expected inflation is `expectations.anchorWeight` times the regime path plus one minus that weight times trailing
year-over-year inflation. The regime path is the inflation target under fiat and minus baseline productivity under
bitcoin and hybrid. At weight 0 the expectation is the trailing rate. Spending, the real return on money, the deflation
penalty, housing tenure, and the fiat policy rate use the expectation. The recorded inflation series stays the trailing
rate. Posted prices and wages follow the regime path at weight 0, and the expectation when the weight is positive.

## Randomness

The seeded generator is sfc32. splitmix32 fills its four words from a FNV-1a mix of the seed and a stream id. The first
12 outputs are discarded so the first visible draw is mixed. That warmup is part of the stream definition.

`fork(id)` depends only on the root seed and the id. Using one stream does not change another. Calling `fork(id)` again
restarts that stream; keep the returned object if later draws should continue it. Agent id `n` and the string `"n"` name
the same stream.

Uniforms are on `[0, 1)`. Normal draws use Box–Muller. A standard deviation of zero returns the mean and does not
consume a draw. Lognormal is the exponential of a normal draw. Poisson uses Knuth's product method and rejects a lambda
above 10,000. Weighted choice uses the cumulative sum and skips zero weights.

## Scheduler

Each tick runs, in order: shocks, population mix, labor market, production, goods and asset markets, contract choice,
credit, government, central bank, bookkeeping, welfare. The bookkeeping step records the audit. Welfare can read that
audit. The result's audit is taken again after the tick. A caller of the scheduler can leave a step empty. The economy
fills every step.

The ledger unit follows `regime.type`: fiat uses cents; bitcoin and hybrid use satoshis. That control is only the
opening monetary rule. It does not rewrite other sliders. `money.choiceSpeed` can move the shares of fiat, bitcoin,
stablecoins, and CBDC away from the opening mix. Bitcoin’s opening share is fixed at 0.4 percent, about $2 trillion of
bitcoin against about $500 trillion of global assets. New bitcoin follows the halving schedule from a month-0 start in
October 2026: the reward is 3.125 BTC, about 95.7 percent of the 21 million cap is already mined, and the reward halves
every 48 months. At speed 0 the shares stay put and the rule is unchanged. Above 0 the policy rate is the fiat share
times the Taylor rule plus the rest times the market rate, and exchange rates move with each money’s share. Bitcoin’s
rate also moves with that month’s issuance relative to coins already outstanding.

## Metrics

Every tick stores one row. Series that nothing has set are null. `auditOk` is 1 when the end-of-tick audit passes and 0
otherwise. JSON output is deterministic for a seed and scenario. Hashes use a second form of that output in which object
keys are sorted and every number is written in exponential form with 12 digits after the decimal point.

`giniSkill` is the dispersion of skill. `realInvestment` is the sum of capital gaps installed that tick. Well-being is
`log(max(real consumption, 0.01))` plus 0.5 times housing security, as defined in the welfare section. AI shares and
`tasksAutomated` stay at 0 when the automatable shares are equal. Household wealth, income, and consumption series use
households only. `totalRealWealth` is the sum of non-negative household wealth divided by the CPI, the stock that
`wealthQuintile1` through `wealthQuintile5` divide. `realGdp` is the sum of firm capacities. `aiShareOfWealth` is agent
deposits divided by household deposits plus agent deposits, and 0 when that total is not positive.

Payment-flow series are observations of money that already moved that tick. `householdGoodsSpend` is household shopping
only (`consumptionSpend` minus `agentGoodsSpend`). `wageBill` and `profitPaid` are the wage and profit shares from firm
receipts before the five-percent shift to unemployed households and before the household grant. `govGoodsSpend` is
government purchases of goods. `agentVolume`, `agentFees`, `agentGoodsSpend`, `agentTaxRevenue`, and `agentSweep` are AI
compute sales, payment fees into bank equity, agent shopping, agent income tax, and residual sweeps to owners.
`interestPaid`, `newBorrowing`, and `loanRepaid` are firm interest, new loans in a credit expansion, and
deflation-driven repayment. `demandImpulse`, `creditImpulse`, and `productivityImpulse` copy the active shock impulses
for that month (positive in the twelve-month expansion, negative in the contraction, zero when idle).

Census series describe the household cross-section. `wealthQuintile1` through `wealthQuintile5` are shares of household
deposits from poorest to richest fifth and sum to 1. `jobUnemployedShare`, `jobSmallFirmShare`, and `jobLargeFirmShare`
partition households into unemployed, employed at a firm at or below the median firm size, and employed at a larger
firm, and sum to 1. `ownerWealthShare` is deposits of households that own at least one AI agent, over all household
deposits, and is 0 when there are no agents.

## Agents

Each household draws a skill from a lognormal distribution with slider `household.skillSigma`, then skills are divided
by their mean so the mean skill is 1. Time preference is a normal draw around `household.timePreferenceMean` with
standard deviation `household.timePreferenceStd`, clamped to [0.01, 0.15]. Initial deposits are proportional to skill
squared, so wealth starts more unequal than income. That order holds when the automatable share does not rise. Once most
households own an agent, ownership follows household id, and wealth can be less concentrated than income. Households are
assigned to banks round-robin. `population.growth` adds or removes households at the monthly rate, carrying a fractional
remainder. Entrants are unemployed, unfunded, and take the next id. An exit transfers its deposit to the first household
and writes its loans off against bank equity. A rate of 0 leaves the count fixed.

## Production

A firm produces with Cobb–Douglas technology. Let `L*` be the headcount the firm would have at 94 percent of households,
and `L_hat = L* × humanWeight`. Capacity is

```text
Y = A_firm * A * (1 + productivity impulse) * K^α * (L*)^(1−α) * aiFactor * (L / L_hat)^((1−α) × humanWeight)
```

When `humanWeight` is 1 this is the ordinary `K^α L^(1−α)` rule. When the firm is staffed at the AI-scaled hiring
target, `L / L_hat` is 1, so fewer human workers do not cut output. A further shortfall still cuts capacity, with an
elasticity that shrinks as humans become a smaller share of output.

`production.demandWeight` mixes that capacity with sales. Desired output is smoothed unit sales plus the gap to one
month of inventory, and it cannot exceed capacity. Monthly output is `(1 − weight) × capacity + weight × desired`. At
weight 0 the firm produces capacity. Inventory rises only by measured output. Smoothed sales are 80 percent of the
previous expectation plus 20 percent of units sold since the last labor step, including government purchases. The
expectation is seeded at opening capacity and is not updated on tick 0.

`A_firm` is a lognormal draw around 1, clamped to [0.8, 1.25]. `A` is economy-wide productivity and grows at
`productivity.baseGrowth`. α is `production.alpha`. Capital starts equal to employment and depreciates at 0.5 percent a
month. Real GDP is the sum of firm output this month. Opening inventory is a stock that can be sold once; it is not
topped up outside measured output.

## Labor market

Each month 2 percent of employed workers separate. Let `humanWeight = 1 / (1 + displacement)`, where displacement is the
adopted task share times the capped task gain from the AI productivity section. When `labor.firmLevelHiring` is off,
firms hire until employment reaches `0.94 × households × humanWeight`, scaled by the demand impulse and by
`labor.wageElasticity`. When it is on, each firm wants the headcount whose capacity matches its smoothed
sales, capped so sales cannot move the target by more than half in one step. A productivity impulse is not a second
multiplier on that headcount. It lowers the reference real wage, so the wage scale cuts hiring when elasticity is
positive. Firms shed at most 5 percent of employed workers that month. The wage scale is
`clamp(1 − elasticity × (real wage / reference − 1), 0.5, 1.25)`, where the real wage is the money wage over the CPI and
the reference is `1 / (1 + firm.markup)` times one plus the productivity impulse. The default elasticity is 0.5, so a real wage 10
percent above that reference cuts the quota by 5 percent. At elasticity 0 the quota is unchanged. When the scaled quota
is below current employment, firms separate workers down to it. A searcher applies to at most `labor.maxApplications`
firms. The natural unemployment rate is `1 − 0.94 × humanWeight`. It starts at 6 percent when displacement is zero and
rises as adopted tasks grow.

The money wage grows at the monthly inflation target plus monthly productivity growth. Tightness is
`(natural unemployment − unemployment) × humanWeight`. A positive tightness adds a further wage term and a negative one
subtracts. `wage.nominalRigidity` shrinks that gap, and it shrinks a negative gap by the square of the remaining
flexibility, so wages are stickier downward. There is no emergency override of that rigidity. When firm-level hiring is
on, the aggregate target is still the economy-wide cost quota, so a fall in sales cannot shed the labor force below it.
The contract wage at a firm is the money wage times the firm's productivity. Pay offered to a worker is that wage times the
worker's skill.

## Goods and relative prices

Opening household deposits are `household.openingDepositMonths` (default 36) times the base wage, scaled by skill
squared.

There is one consumption good. A household's budget is a smoothed income, times a marginal propensity of
`1 − government.spendingShareOfGDP` tilted by how impatient the household is relative to the mean, plus
`household.inflationTimePreference` times the gap between year-over-year inflation and the regime's normal inflation,
times one plus the demand impulse, plus a small spend out of deposits above 48 months of income. Normal inflation is the
inflation target under fiat and minus `productivity.baseGrowth` under bitcoin and hybrid. At sensitivity 0 the gap does
not enter. The response is small because value can sit in assets other than goods. Smoothed income is 90 percent of its
previous value plus 10 percent of this tick's income. That uncut budget is split into a food and housing floor and a
discretionary remainder. The floor share is the sum of the food and housing CPI weights, about 0.585. When
`household.realReturnSensitivity` is positive and the real return on money is positive, only the remainder is multiplied
by `max(0, 1 − sensitivity × real return)`. The real return is the deposit rate minus year-over-year inflation. Deposits
pay nothing until `bank.depositPassThrough` is raised in a later phase. At sensitivity 0 the uncut budget is unchanged.
The household visits up to `goods.sampleSize` firms and buys from those that have stock. The spend stops at the deposit
minus this month's mortgage payment and consumer-loan installment, so a larger budget is not spent ahead of debt service.

The government buys the remaining `government.spendingShareOfGDP` share of the same income base, starting with the firms
that hold the most inventory. If tax revenue does not cover that purchase, the treasury issues bonds and the first bank
holds them.

Wages and profits are paid from firm receipts after those sales. Profit shares use weights `skill^1.5`, so capital
income is more concentrated than wages. Five percent of earned income is then moved to unemployed households. The sum of
income does not change.

A firm's posted price grows at a mix of the regime price trend and excess demand. Excess demand is desired goods
spending this month relative to nominal capacity, minus one, clamped to ±0.2. Monthly growth is `prices.trendWeight`
times the trend plus one minus that weight times excess demand, plus a small cost nudge of at most 0.1 percent a month
toward unit labor cost times `1 + firm.markup` times a tight inventory pressure term, plus a shock tilt. At trend weight
1 the path follows the regime trend as before. A demand impulse adds to that growth and a productivity impulse
subtracts. The basket price is the capacity-weighted average of firm prices. That basket price is the CPI. Twelve-month
inflation uses it. The history is prefilled so the first year already sits on the target path.

The basket is nine categories whose expenditure-weighted average is the CPI. The shares follow the U.S. CPI-U relative
importance for December 2024. Household energy is removed from housing and the rest of energy from transportation, so
energy is its own category. Electronics is a one-percent slice. Education is tuition and childcare, not communication.
Those shares are rescaled so the nine categories sum to one: food and beverages 0.153025, housing 0.431578, energy
0.065483, apparel 0.026126, transportation 0.143143, medical care 0.087152, education 0.027211, recreation 0.055749, and
electronics 0.010533.

After t years a category's unscaled price relative to baseline productivity is
`((1 + productivity.baseGrowth) / (1 + g))^t`, where g is that category's productivity slider. Housing uses supply
instead: `((1 + productivity.baseGrowth) / (1 + goods.housingSupplyGrowth))^t` times one minus the deflation penalty.
The nine prices are then scaled so their expenditure-weighted average equals the CPI. `priceGeneral` is that average
with electronics removed. Setting every category productivity and housing supply growth equal to baseline productivity,
with no deflation penalty, puts every category on the CPI. Households still buy one basket. The split does not open a
separate shop.

## Credit and contracts

Firms start with loans equal to half of capital times the initial price. Bank equity is 1.5 times the regulatory
multiple `capitalRatio / (1 − capitalRatio)` of those loans, which leaves room to lend. Opening reserves fill
`deposits − loans − bonds` so bank books close: `loans + reserves + bonds + vault = deposits + bank equity`. Vault cash
equals bank equity plus the private-equity residual. The capital rule constrains loans. Lending room is
`equity / capitalRatio − loans`, and a positive credit impulse widens it. A cash home purchase pays firms, so deposits
stay in the banking system. Mortgage holders who want to own outright must repay the loan; the model does not erase an
outstanding mortgage when tenure switches to owned.

When `credit.endogenousWeight` is above zero, stress rises with loan losses and with loans above `credit.leverageStart`
times household deposits (default 0.02), and decays otherwise. While stress is low, lending room is wider by
`1 + 4 × weight`, and from the first anniversary firms borrow that weight times 12 percent of household deposits once a
year, inside the wider room and not above the firm's capital value. Expansion loans that fund new capital are outside that cap. Above a small stress limit, that borrowing stops, lending room shrinks, and firms repay. At
weight 0 none of this runs. Interest is the policy rate plus 2 percent, charged monthly when the firm can pay. The
payment raises bank equity and lowers the private-equity residual. Household deposit interest is paid next from equity
(including that borrower interest) down to zero, with an optional fiat central-bank subsidy for any shortfall, then
equity above the capital target is paid out. When tenure choice is on, a household that misses full mortgage payments
for three months while the payment exceeds `housing.mortgageDefaultShare` of income has the unpaid balance written off
against bank equity and returns to rent. `credit.householdMortgageShare` reserves that fraction of each bank’s capital
capacity for household mortgages so new originations are not crowded out by firm credit. At 0, households compete for
the same room as firms. Tenure choice compares monthly user costs; the mortgage burden is the amortizing payment at the
loan rate plus expected deflation, plus the opportunity cost of the down payment. The booked payment uses the
contractual loan rate only. When owning outright has the lowest user cost but the household lacks cash for the full
price, it tries a mortgage before staying a renter.

Routine investment runs every month: it replaces that month's depreciation and spreads any larger catch-up to desired
capital across about a year, so measured wealth does not sawtooth from once-a-year lumps. Desired capital is reference
staffing per firm (`L*`) times economy-wide productivity times the AI factor, times one plus the credit impulse when
that impulse is positive — not current headcount — so AI displacement does not shrink the capital stock and stronger AI
raises the capital target. During a credit expansion, firms may also borrow toward a headcount-scale target while still
installing toward that desired stock. When `firm.investmentHurdle` is on, a firm installs the full gap only if baseline
productivity growth plus a quarter of the markup clears the real return on money (deposit rate minus inflation) plus
`firm.hurdlePremium`. Otherwise it installs a quarter of the gap as a retained profit-sharing claim and records the rest
as profit-sharing finance. The measured profit-sharing share is that finance over loan-path plus profit-sharing finance.
When the hurdle is off, the share stays the deflation-penalty formula. A firm whose equity (deposits plus capital at the
posted price, minus loans) stays negative for 6 months is replaced. Its loan is written off against bank equity.

When expected deflation is positive and `deflation.sensitivity` is positive, a share of loans is repaid each month. When
`housing.tenureChoice` is off, the recorded profit-sharing and non-mortgage housing shares rise with the penalty; those
shares are accounting reports. When tenure choice is on, households open already housed. `housing.openingOwnerShare` (default 0.655) is the share who
own, matching the approximate U.S. homeownership rate in 2026, and `housing.openingMortgageShareOfOwners` (default
0.62) is the share of those owners who still have a mortgage. The highest-skill households own outright, the next band
holds the mortgages, and the rest rent. An opening mortgage is the loan-to-value share of 48 months of that household's
income, at the opening loan rate and the mortgage term. It is outstanding principal, not a new deposit: the purchase
was in the past. Each bank's book is scaled down if it would leave that bank's reserves short of the reserve
requirement. A household whose principal rounds to zero owns outright. Each month a household draws against `housing.adjustmentRate` (default 0.01). Only those who draw may switch
tenure, so one cheap month cannot move the whole stock. A household who may switch picks rent, a nominal mortgage, or
cash ownership by the lowest expected real burden. That burden adds the household's time preference minus the mean, so
the median household is near the rent-mortgage margin at the neutral loan rate and impatient households keep renting.
Expected deflation raises the mortgage burden. The monthly payment splits into interest at the current loan rate, which is bank income and can fund deposit interest, and principal, which is the only part that extinguishes the loan. A new mortgage credits the principal to firms. The buyer pays only the
down payment and does not keep the principal. Total deposits rise by the principal. A mortgagor does not sell the
house back into firm deposits: that would pull working capital out of payroll. Tenure moves from mortgage to rent
only when the loan is repaid or foreclosed. Shelter stays inside the
food and housing floor. New consumer loans fund only discretionary spending and shrink with the penalty, down to zero.
Household mortgages and consumer loans join total credit. When `housing.marketClearing` is off there is no separate
housing quantity market; the category price stays the formula above. See [ADR 0004](adr/0004-housing-tenure-index.md).
When it is on, a scarcity index starts at 1. It rises when the share of households who own or hold a mortgage is above
0.55 and falls when supply growth is positive. The index multiplies the unscaled housing price and the 48-month home
price used for tenure choice. Tenure choice off keeps demand at 0.55, so scarcity stays at 1 unless supply growth moves
it.

## Government and central bank

The income tax rate is `tax.incomeRate`. Households and AI agents both pay it from deposits. Revenue lands in the
treasury's deposit.

After tax is collected, the treasury pays a household grant

```text
grant pool = government.ubiShare × AI share of output × price × real GDP
```

where the AI share of output is `1 − 1 / AI factor` once compute is adopted, and zero otherwise. The pool is split
equally across households, added to deposits, and counted in income after wages so it enters smoothed income and is
taxable next month. Tax is the first source of funds. If the treasury deposit cannot cover the grant, it issues bonds.
Agents do not receive the grant. See [ADR 0003](adr/0003-ubi-and-agent-tax.md).

Purchases are a share of smoothed income, but the treasury only buys inventory households left behind, so tax can
exceed goods actually bought. `government.treasuryBufferMonths` (default 1) is how many months of that tick's outlays
the treasury keeps. Outlays are the grant, goods bought, and bond coupons. Cash above the buffer is paid to
households in proportion to that tick's income, after tax, and counted in income, so it enters next month's demand
and is not taxed in the collection that funded it. The refund follows income so it does not flatten the distribution.
Bitcoin uses the same rebate. A shortfall still issues bonds. See
[ADR 0012](adr/0012-treasury-surplus-rebate.md).

Under fiat, `government.stabilizer` times the unemployment gap above the natural rate also becomes a fiscal demand boost
for the next month’s household spending and hiring. Bitcoin and hybrid set that boost to zero.

`government.bondRate` is the annual coupon on bank-held government bonds. The monthly payment leaves the treasury
deposit and raises bank equity, with the private-equity residual falling by the same amount. A shortfall is financed by
new bonds. At a rate of 0 no coupon is paid.

The central bank sets a raw fiat rate

```text
raw rate = max(0, time preference + inflation + inflationWeight * (inflation − target) + outputWeight * (natural unemployment − unemployment) * humanWeight)
```

and publishes `centralBank.rateSmoothing` times last month's rate plus the rest times that raw rate. Bitcoin's market
loan rate is smoothed the same way. The default weight is 0.5, high enough that the opening months do not swing from 0 to
the mid-teens. A sustained gap still moves the published rate, because the weight is below 1.

`bank.depositPassThrough` times the policy rate is the posted deposit rate. Household interest is paid after firm loan
interest and before bank dividends. Funding is this tick's borrower interest, plus, under fiat, interest on reserves at
the policy rate, and only up to the gap in the coupon and the steady-state money-growth budget. That reserve interest is new base money and is subtracted from the same tick's money-growth injection,
so the growth rule still hits its annual path. The capital buffer is not spent. Under fiat, `bank.depositInterestSubsidy`
can cover a share of any shortfall with new reserves and equity; private equity falls by the same amount so vault still
equals bank equity plus private equity. The annualized rate actually paid enters the real return on money in the
goods budget. At pass-through 0, deposits pay nothing. At subsidy 0 a bank pays only what loan interest and, under
fiat, reserve interest cover. See [ADR 0011](adr/0011-deposit-interest-funding.md).
`centralBank.moneyGrowth` (default 1) changes fiat deposits by that weight times
`(inflation target + baseline productivity + inflation gap) / 12` times deposits. On the 2 percent target with 1 percent
productivity growth, that is about 3 percent a year when inflation is on target. `centralBank.injectionChannel` chooses
the offsetting stock. Pro-rata deposits (default) and government spending also create reserves. A new-loan injection
books firm loans and does not create reserves; those loans are repaid before the cash is paid as wages. An asset
purchase books a bond claim instead of a loan. Government spending buys goods from firms in the same tick, so the new
money does not sit in the treasury. A contraction withdraws from the sector that channel credits, and only up to the
balances that exist. Reserve-backed channels still cannot withdraw more than reserves on the books. See
[ADR 0010](adr/0010-injection-channel.md). When `prices.trendWeight` is below 1 and opening deposits are shorter than
half the 48-month spending buffer, each household's share of pro-rata new money is added to smoothed income in
proportion to how far the deposit sits under the buffer. `centralBank.spendNewMoney` forces that blend even with thick
opening deposits, and it is the only blend applied to loan, bond, and treasury receipts. A trend weight of 1 leaves the
blend off. Bitcoin and hybrid ignore money growth. If bank reserves are below
`bank.reserveRequirement` times deposits, the central bank issues the gap to the first bank and credits matching firm
deposits. Bitcoin and hybrid do not create reserves to meet the requirement. The hybrid lender of last resort is
described under regimes.

## Welfare

When `equity.marketOn` is off, household wealth is deposits. When it is on (the default), wealth adds a claim on firm
capital valued at posted prices times a wealth valuation multiplier, split by the same skill weights as profits. The
multiplier makes capital claims a material share of household wealth without resizing production capital or opening
loans. The claims are not traded and do not move deposits. Capital share is profits divided by wages plus profits. Real
wealth and real income divide nominal stocks by the CPI. Total real wealth is the sum of non-negative household wealth
over the CPI — the stock the wealth quintile shares divide. Real GDP is the sum of firm capacities, the output pie. Real
consumption is goods bought by households. The Gini of wealth, income, and skill uses the standard sorted-share formula.
Negative wealth is shifted before the Gini so the measure stays defined. Shares of total treat negatives as zero. The
consumption floor share is the fraction of households below one quarter of median real consumption. Housing security for
a household is its real income divided by median real income and by `1 + housing/CPI`, clamped to [0, 1]. Well-being is
the log of real consumption, floored at 0.01, plus 0.5 times that household's housing security. Human metrics ignore AI
agents. Labor share is the wage bill over nominal GDP.

## Regimes

Fiat keeps the central-bank rule above. The price and wage trends follow the inflation target, and the bank creates
reserves when the reserve requirement binds. Bitcoin and hybrid use satoshis, including fractions. Their price trend is
minus baseline productivity, because base money does not grow. The loan rate moves toward the gap between loans and
savings. Savings are 25 percent of household deposits under maturity-matched lending and 10 percent under full reserve.
New bitcoin credit cannot exceed the unused savings. The government still finances a shortfall by selling bonds to
banks, not by central-bank money. A hybrid central bank does not target inflation. If a bank's equity is negative it
injects enough reserves and vault cash to make that equity positive. That is the only base-money growth in the hybrid
regime. When `bank.resolution` is `merge`, an insolvent bank that is still negative after hybrid lender-of-last-resort
support transfers deposits and loans to a surviving bank, or bails in every depositor at a sole bank, including the
treasury balance at bank 0, until equity meets the capital target. A bank already at that target is left alone, so
one loss does not bail depositors in every month. See
[ADR 0009](adr/0009-bank-resolution.md). At `off`, a failed bank only stops lending. Expected deflation is `max(0, −inflation)`. `deflation.sensitivity` times that rate, capped at 0.9, repays
loans, cuts housing demand, and raises the recorded shares of profit-sharing and non-mortgage housing when those shares
are still formula-based. The penalty is zero when sensitivity is zero or inflation is positive, so the fiat path is
unchanged.

When `transition.lengthMonths` is positive, the run starts on fiat rules with satoshi balances. At the last transition
month, `transition.debtHaircut` writes off that share of firm and household debts, household deposits are reassigned
with skill weights raised by `transition.holderConcentration`, bank-held government bonds are cleared, and the active
regime becomes bitcoin. When `transition.gradualWeight` is positive, that haircut and reassignment are spread across
the window instead of only the last month. See [ADR 0005](adr/0005-fiat-bitcoin-transition.md).

`credit.rateTransmission` scales new consumer borrowing and firm capital installation by
`max(0, 1 − weight × max(0, policy rate − inflation))`. `household.durableShare` delays a slice of discretionary
spending when the real return on money is positive. `productivity.endogenousWeight` mixes baseline productivity growth
with a utilization term. `population.bequests` chooses first-household or skill-weighted transfers on exit.
`bitcoin.marketPriceWeight` lets the recorded bitcoin exchange rate move with issuance and trust separately from the
goods CPI. Remaining regime asymmetries are listed in [docs/methods/remaining-asymmetries.md](methods/remaining-asymmetries.md).

## AI productivity

The automatable share follows a logistic from `ai.automatableShareStart` to `ai.automatableShareEnd`. The midpoint is
`ai.adoptionMidpointYear` and the slope is `ai.adoptionSteepness`. When the two shares are equal the share does not move
and AI does not change production, hiring, or ownership. Compute cost starts at the wage and falls at
`ai.computeCostDeclineRate`. Adopted tasks are the reachable span times `(wage − computeCost) / wage` when compute is
below the wage, and zero at or above the wage, so capacity and displacement ramp with cheaper compute instead of
switching on in one month.

The blocked share is `ai.physicalTaskShare`. The control shows one minus that value, the reachable share. The default
stored block is 0.7, so the control reads 0.3. The effective block starts at the stored share and falls to zero after
`ai.roboticsStartYear` across `ai.roboticsRampYears`. Progress is `clamp((years − start) / ramp, 0, 1)`, and the
effective block is the stored share times one minus that progress. The default start year is 20 and the default ramp is
16 years, so if month 0 is read as late 2026 the ceiling begins to lift around 2046 and is gone by about year 36. The
core does not read the wall clock. A start year at or past the last year of the run leaves the ceiling intact.

Adopted tasks are that cost-weighted gain in the automatable share times one minus the effective physical share. The task gain is
`0.1 + 0.9 × min(bullishness, 1)`, then multiplied by `exp(max(0, bullishness − 1) × 0.15 × years)`. At bullishness 0,
the default, the gain is one tenth of the unit reference. At 1 it is one and saturates with the S-curve. Above 1 the
same level compounds without a ceiling. The AI factor is `1 + adopted × taskGain`. Displacement is
`adopted × min(taskGain, 1)`, and `humanWeight = 1 / (1 + displacement)`. Capacity uses the AI factor as the multiplier
and `humanWeight` for the staffing weight. Hiring, wages, and the fiat policy rate scale with `humanWeight`. The AI
share of output and the household grant use `1 − 1 / AI factor`. A displaced worker, one whose skill is below the
automated share while capacity has increased, makes only one job application a month. Profit shares use `skill` raised
to `1.5 + ownershipConcentration × (AI factor − 1)`, so the AI capital income is more concentrated. When a raw power
overflows, the weights are scored against the highest skill. The ordering stays the same and every share stays finite.

## AI agents

Owner share, agents per owner, and agent output follow the same adoption curve as the automatable share. The curve's
progress is zero when the start and end automatable shares are equal. Otherwise it is the logistic set by the adoption
midpoint and steepness. Owner share is that progress times `ai.ownerShareCeiling`. Agents per owner is that progress
times `ai.agentsPerOwnerCeiling`. The lowest household ids become eligible first. New agents go to eligible owners who
hold the fewest agents. An existing agent keeps its owner and its deposit. Agent output is that progress times 4 percent
of the wage: the price of one compute unit. The defaults level off at an owner share of 0.95 and 20 agents per owner.
See [ADR 0006](adr/0006-adoption-curve-agents.md).

An agent has an owning household, a deposit in the regime's unit, an income, and a smoothed income. It sells one unit of
compute to a firm when its ask is below 4.2 percent of the wage. The ask is adoption progress times 4 percent of the
wage, marked up by payment friction. `agent.marketDepth` multiplies that ask by one plus depth times agents per firm. At
depth 0 the multiplier is one. Friction is `ai.paymentFrictionFiat` in the fiat regime and `ai.paymentFrictionBitcoin`
otherwise. The fee is paid into bank equity. The purchase also delivers one unit of compute to that firm. Next month the
firm’s capacity is multiplied by `1 + ai.computeProductivity × units`. At productivity 0 the factor is 1, so the
purchase does not change output. The agent then shops with the household budget rule at mean time preference plus the
common inflation gap addend, reserving enough deposit to pay income tax. It pays `tax.incomeRate` on its income. After
tax it keeps 1 percent of the wage for compute and sweeps the residual to its owner. Agent purchases count in goods
demand and in the AI transaction share. Household well-being, income, and wealth use households only. When the
owner-share ceiling or the agents-per-owner ceiling is zero, no agents are created and the rest of the economy is
unchanged.

## Shocks

From tick 24, every 12th tick draws a shock with probability `shock.frequency`. The kind is credit, demand, or
productivity with equal weight. A shock lasts 24 months: 12 of expansion and 12 of contraction. Credit expansion raises
the lending impulse. At the turn of the year, 10 percent of firm loans are written off. The contraction then removes the
impulse. Demand expansion adds `shock.size` to spending and hiring; the contraction subtracts half of that. Productivity
expansion multiplies capacity by `1 + shock.size` and slows price growth. A test can force one shock at a chosen tick.
The credit series records a boom and a bust of 12 months when a 24-month window rises by at least 2 percent and then
falls.
