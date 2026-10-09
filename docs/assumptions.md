# Assumptions

Generated from the slider registry. Do not edit by hand.

Regenerate with `pnpm sim assumptions --out docs/assumptions.md`.

Registry version: 13.

## agent.marketDepth

- Label: Agent market depth
- Group: aiClaims
- Unit: coefficient
- Default: 0.25
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How much crowding raises the price of agent compute. The ask starts at the adoption progress times 4 percent of the wage, marked up by payment friction. Above 0 it is multiplied by one plus this depth times agents per firm. Firms still buy only when the ask is under 4.2 percent of the wage, so enough crowding stops the sales. The default of 0.25 is a modest crowding markup. At 0 the ask is unchanged.

## ai.adoptionMidpointYear

- Label: AI adoption midpoint
- Group: ai
- Unit: years
- Default: 8
- Range: 1 to 40
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Year when the automatable share is halfway from the start share to the end share. The default of 8 is earlier than a decade-long midpoint. The curve is flat, and this year does nothing, when the start and end shares are equal.

## ai.adoptionSteepness

- Label: AI adoption steepness
- Group: ai
- Unit: 1/year
- Default: 0.15
- Range: 0.1 to 1.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How sharply the automatable share climbs through its S-curve, per year. A higher value bunches the change around the midpoint year. A lower value spreads the same change over more years. It has no effect when the start and end shares are equal.

## ai.agentsPerOwnerCeiling

- Label: Agents per owner
- Group: aiClaims
- Unit: agents
- Default: 20
- Range: 0 to 50
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How many agents one owner holds once the adoption curve has finished. The count rises along that curve from zero to this ceiling. New agents go to owners who are short of the current level. An existing agent keeps its owner and its deposit. At zero, no agents are created.

## ai.automatableShareEnd

- Label: Final automatable share
- Group: ai
- Unit: share
- Default: 0.9
- Range: 0.3 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of tasks software can do once the adoption curve has finished. Only the rise from the starting share can be adopted, and only the non-physical part of that rise adds capacity. While adoption is underway and capacity has actually increased, a household whose skill is below the current automatable share may apply to only one firm a month.

## ai.automatableShareStart

- Label: Initial automatable share
- Group: ai
- Unit: share
- Default: 0.1
- Range: 0 to 0.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of tasks software can already do in month zero. Adoption follows an S-curve from this share up to the final automatable share. The final share has to be at least this large. If the two shares are equal, the curve stays put, firms do not adopt AI, and production, hiring, and ownership stay on the path with no AI effect.

## ai.bullishness

- Label: AI bullishness
- Group: ai
- Unit: index
- Default: 0.35
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How large the productivity gain is on each adopted task. At 0 the gain is one tenth of the unit reference — about the scale of a decade of internet-era productivity gains once the adoption curve finishes — and unemployment barely moves. The default of 0.35 sits between that internet-sized gain and full task replacement; below 1 the gain still saturates with the S-curve. At 1 each adopted task adds its full share to capacity. Above 1 the same level formula compounds: each point above 1 adds 15 percent a year of growth to the task gain with no ceiling, so at 2 the gain grows at 15 percent a year. Hiring still follows the adopted task share, capped by the physical-task share until robots open it. Equal start and end automatable shares still turn the whole AI channel off. The anchors are a modeling guess after Korinek et al. 2026 and the internet-era productivity literature.

## ai.computeCostDeclineRate

- Label: Compute cost decline
- Group: ai
- Unit: 1/year
- Default: 0.3
- Range: 0 to 0.6
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual rate at which AI compute gets cheaper. Cost starts equal to the wage and is multiplied by one minus this rate each year. Firms take up newly automatable tasks only once that cost is below the wage. Any positive rate makes cost fall below the wage after the first year. At zero, cost stays at the wage and this channel adds no capacity.

## ai.computeProductivity

- Label: Compute productivity
- Group: ai
- Unit: per unit
- Default: 0.2
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How much one unit of agent compute raises the buying firm’s capacity next month. Capacity is multiplied by one plus this rate times units bought last month. The default of 0.2 raises capacity for firms that buy compute. At 0 the purchase is only a payment and capacity is unchanged.

## ai.ownerShareCeiling

- Label: Owner-share ceiling
- Group: aiClaims
- Unit: share
- Default: 0.95
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Highest fraction of households that own an agent. The owner share rises along the adoption curve from zero to this ceiling. Households become owners in id order, lowest first. At 0.95 with 4,000 households, 3,800 households can own an agent once the curve has finished. At zero, no agents are created. The curve stays at zero when the start and end automatable shares are equal.

## ai.ownershipConcentration

- Label: AI ownership concentration
- Group: aiClaims
- Unit: share
- Default: 0.8
- Range: 0.1 to 0.99
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly profits skew toward high-skill households as the AI factor rises. Profit shares normally follow skill raised to 1.5. Once AI capacity is above normal, that exponent rises by this value times the extra capacity factor, so the same skill gaps claim a larger share of profits. It does not choose which households own agents.

## ai.paymentFrictionBitcoin

- Label: Bitcoin payment friction
- Group: aiClaims
- Unit: share per transaction
- Default: 0.005
- Range: 0 to 0.1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Fee on an AI agent sale in the bitcoin and hybrid regimes, as a share of the payment. The fee is paid into bank equity. The asking price rises along the adoption curve toward 4 percent of the wage and is marked up by this fee. Firms buy only when the ask is still under 4.2 percent of the wage, so a fee of about 5 percent or more stops the sales once output is near that ceiling. The default of 0.005 stays well under that cutoff. The fiat regime uses the fiat fee instead. The fee does nothing when no agents are created.

## ai.paymentFrictionFiat

- Label: Fiat payment friction
- Group: aiClaims
- Unit: share per transaction
- Default: 0.02
- Range: 0 to 0.1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Fee on an AI agent sale in the fiat regime, as a share of the payment. The fee is paid into bank equity. The asking price rises along the adoption curve toward 4 percent of the wage and is marked up by this fee. Firms buy only when the ask is still under 4.2 percent of the wage, so a fee of about 5 percent or more stops the sales once output is near that ceiling. Below that, a higher fee makes the agent a worse deal and can leave the ask uncompetitive. The bitcoin and hybrid regimes use the bitcoin fee instead. The fee does nothing when no agents are created.

## ai.physicalTaskShare

- Label: Reachable share
- Group: ai
- Unit: share
- Default: 0.7
- Range: 0 to 0.7
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Blocked share of an automatable-share rise before robotics. The control shows one minus this stored value, the reachable share. The default stored value 0.70 reads as 0.30, so 30 percent of the rise counts before robotics. Robotics raises the reachable share to one. A higher stored value blocks more of the rise. If the automatable share has risen by 0.2 and this stored value is 0.3, about 14 percent of tasks are adopted while the block is intact. At 0 the whole rise counts. Displacement, which limits job search, begins only once capacity has actually increased.

## ai.roboticsRampYears

- Label: Robotics ramp
- Group: ai
- Unit: years
- Default: 12
- Range: 1 to 30
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How many years the reachable share takes to rise from the control value to one after the robotics start year. The path is a straight line. At the defaults the block is intact through year 15, half gone around year 21, and gone by year 27. A finished ramp lets the automatable share that software already reached cover the old physical tasks as well. Tasks outside the final automatable share stay human.

## ai.roboticsStartYear

- Label: Robotics start
- Group: ai
- Unit: years
- Default: 15
- Range: 0 to 50
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Year from the start of the run when mass robotics begins to open physical tasks. The core does not read the calendar. Tick 0 is month 0, and charts label that month as the month the page is opened, so the default of 15 is about 2041 when month 0 is read as late 2026. Until this year the reachable share stays at the control value. A start year at or past the last year of the run leaves the block intact for that run.

## bank.capitalRatio

- Label: Bank capital ratio
- Group: credit
- Unit: share
- Default: 0.06
- Range: 0.04 to 0.2
- Status: sourced
- Source: The default of 0.06 sits below the Basel III common-equity headline because this model applies the ratio to every loan rather than to risk-weighted assets.
- Description: Minimum bank equity relative to loans. Lending room is equity divided by this ratio, minus loans already outstanding. A higher ratio leaves less room to lend from the same equity and a thicker cushion when loans are written off. A lower ratio does the opposite. Banks start with extra equity so they have room to lend. Equity at or below zero is recorded as a bank failure. The default of 0.06 is below the Basel III common-equity headline because this model applies the ratio to every loan rather than to risk-weighted assets.

## bank.depositHaircut

- Label: Deposit haircut on resolution
- Group: credit
- Unit: share
- Default: 0
- Range: 0 to 0.2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of deposits written off when a failed bank is merged or bailed in. The write-down raises bank equity. At 0, merge transfers balances in full and a sole-bank bail-in writes down only as much as needed to restore the capital target. Unused when bank resolution is off.

## bank.depositInterestSubsidy

- Label: Deposit interest subsidy
- Group: credit
- Unit: share
- Default: 0.35
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of any household deposit-interest shortfall the fiat central bank covers after loan interest and interest on reserves, up to the steady-state money-growth budget. The subsidy adds reserves and equity and lowers private equity so the vault identity holds, then interest is paid to depositors. That creation is subtracted from the same tick’s money-growth injection. It does not spend the capital buffer. Coupon above the budget is not paid. The default of 0.35 covers about a third of a shortfall. At 0 there is no subsidy. Bitcoin and hybrid ignore this slider.

## bank.depositPassThrough

- Label: Deposit rate pass-through
- Group: credit
- Unit: share
- Default: 0.45
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of the policy rate paid on household deposits. The deposit rate is this fraction times the policy rate. It enters the real return on money that can cut discretionary spending. Banks pay that monthly interest from this tick’s loan interest and, under fiat, from interest on reserves. They do not spend the capital buffer. The default of 0.45 pays just under half the policy rate. At 0 deposits pay nothing. It cannot cut the food and housing spending floor.

## bank.reserveRequirement

- Label: Reserve requirement
- Group: centralBank
- Unit: share
- Default: 0.1
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of deposits that must be backed by central-bank reserves. In the fiat regime, if reserves are short of this share, the central bank creates the gap and credits it to the first bank. That is how fiat base money expands when the requirement binds. Bitcoin and hybrid regimes do not create reserves to meet this number, so the same setting does not expand their base money.

## bank.resolution

- Label: Bank resolution
- Group: credit
- Unit: mode
- Default: merge
- Options: off, merge
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: What happens when bank equity falls to zero or below. Off only marks the bank failed so it stops lending. Merge transfers deposits and loans to a surviving bank by id, or bails in depositors at a sole bank, including the treasury deposit at bank 0, until equity meets the capital target. A bank already at that target is not bailed in again. Hybrid lender-of-last-resort injection still runs first; if equity is still negative, hybrid uses the same resolution. The default is merge so deposits stay spendable after a failure.

## bitcoin.lendingModel

- Label: Bitcoin lending model
- Group: credit
- Unit: model
- Default: maturityMatched
- Options: maturityMatched, fullReserve
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How much of household deposits can fund loans when the regime is bitcoin or hybrid. Maturity matched treats 25 percent of household deposits as lendable savings. Full reserve treats 10 percent as lendable savings. New credit in those regimes cannot exceed savings minus loans already outstanding, and the loan rate moves toward the gap between loans and that savings stock. In the fiat regime the central bank sets the policy rate and lending room follows bank capital, so this choice does not change the fiat interest-rate rule.

## bitcoin.marketPriceWeight

- Label: Bitcoin market price weight
- Group: regime
- Unit: share
- Default: 0.4
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How far the recorded bitcoin exchange rate can move with issuance and trust separately from the goods CPI in satoshis. The default of 0.4 lets the exchange rate respond to that month’s issuance relative to coins outstanding and to money.bitcoinTrust. At 0 the bitcoin price series stays on the goods path alone.

## centralBank.bondPurchaseShare

- Label: Central-bank bond purchase share
- Group: centralBank
- Unit: share
- Default: 0.25
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of new government bonds bought by creating central-bank reserves in the fiat regime. The rest stay on commercial-bank balance sheets. Bitcoin and hybrid ignore this slider; their base money does not rise with bond finance. The default of 0.25 is standing partial monetization. At 0 every shortfall is held by the first bank with no new reserves from this channel.

## centralBank.inflationTarget

- Label: Inflation target
- Group: centralBank
- Unit: 1/year
- Default: 0.02
- Range: 0 to 0.06
- Status: sourced
- Source: A 2 percent annual target is the stated goal of many inflation-targeting central banks.
- Description: Annual CPI inflation the fiat central bank aims for. Fiat prices and wages trend at this rate. When inflation is above the target the policy rate rises, and when inflation is below it the policy rate falls. The default of 0.02 is the 2 percent goal stated by many inflation-targeting central banks. Bitcoin and hybrid regimes do not follow this target. Their price trend is minus baseline productivity growth.

## centralBank.inflationWeight

- Label: Inflation weight
- Group: centralBank
- Unit: coefficient
- Default: 1.5
- Range: 1 to 3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How hard the fiat policy rate reacts when inflation misses the target. The rule adds this weight times (inflation minus the target), on top of an inflation term that already enters one-for-one. At 1.5, inflation one percentage point above target adds 1.5 points to the policy rate from this term alone. The weight is used only in the fiat regime. The policy rate cannot fall below zero.

## centralBank.injectionChannel

- Label: Money injection channel
- Group: centralBank
- Unit: channel
- Default: proRataDeposits
- Options: proRataDeposits, governmentSpending, newLoans, assetPurchase
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Where new fiat money first lands when money growth is positive. proRataDeposits splits new deposits and reserves by existing household balances. governmentSpending credits the treasury, adds reserves, and buys goods from firms in the same tick. newLoans books firm loans and firm deposits and does not create reserves; those loans are repaid before the cash is paid out as wages. assetPurchase credits firm deposits and a bond claim, and does not book a loan. A contraction withdraws from the sector that channel credits, and only up to the balances that exist. Bitcoin and hybrid ignore this slider.

## centralBank.moneyGrowth

- Label: Fiat money growth
- Group: centralBank
- Unit: share
- Default: 1
- Range: 0.05 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly the fiat central bank grows broad money with the inflation target and productivity. Each month deposits and reserves change by this weight times (inflation target + baseline productivity + inflation gap) / 12 times deposits, plus any crisis stimulus. A contraction draws reserves from banks in id order, starting with the first, and stops when those reserves are used up. At 1 on the 2 percent target with 1 percent productivity growth, deposits grow about 3 percent a year when inflation is on target. Below-target inflation raises growth; above-target slows it. The weight cannot be 0: some fiat expansion always happens when the gap is non-negative. Bitcoin and hybrid ignore this slider.

## centralBank.outputWeight

- Label: Output weight
- Group: centralBank
- Unit: coefficient
- Default: 1
- Range: 0 to 1.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How hard the fiat policy rate reacts when unemployment is away from the natural rate. The natural rate starts at 6 percent and rises as AI raises capacity. The rule adds this weight times (natural unemployment minus the unemployment rate) times the human share of output. A slack labor market cuts the rate and a tight one raises it. The default of 1 is a dual-mandate weight: with no AI, unemployment one point below the natural rate adds one point to the policy rate. Late in adoption the same point gap moves the rate less. Bitcoin and hybrid regimes do not use this weight. The policy rate cannot fall below zero.

## centralBank.rateSmoothing

- Label: Policy-rate smoothing
- Group: centralBank
- Unit: weight
- Default: 0.5
- Range: 0 to 0.95
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Weight on last month’s policy rate when publishing this month’s rate. The rest is the new Taylor setting under fiat, or the new market loan rate under bitcoin and hybrid. A high weight stops one capped price move from swinging the opening rate between 0 and the mid-teens. At 0 the published rate is the raw setting. The weight cannot be 1, so a sustained inflation gap still moves the rate.

## centralBank.spendNewMoney

- Label: Spend new money
- Group: centralBank
- Unit: share
- Default: 0.5
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of new fiat blended into household smoothed income when prices.trendWeight is below 1. The default of 0.5 spends half of new money into demand. On the household channel, 0 still blends a thin opening (deposits below 24 months). On the loan, bond, and treasury channels, only this share is blended, so those receipts are not a silent hoard. Bitcoin and hybrid ignore this slider.

## centralBank.stimulus

- Label: Crisis stimulus
- Group: centralBank
- Unit: coefficient
- Default: 1.75
- Range: 0.05 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Extra annual fiat broad-money growth per unit of lagged contraction pressure. Pressure is the largest of minus demand impulse and minus credit impulse when either is negative. The central bank uses the pressure from stimulusLag months ago. At the default of 1.75, a demand contraction of half the default shock size adds about 4 percent a year once the lag has passed. The weight cannot be 0. Bitcoin and hybrid ignore this slider.

## centralBank.stimulusLag

- Label: Stimulus lag
- Group: centralBank
- Unit: months
- Default: 3
- Range: 1 to 24
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Months before crisis stimulus begins after a demand or credit contraction starts, and months the stimulus continues after that contraction ends. At the default of 3, the first three months of a contraction run on the secular money-growth rule alone, so prices can fall briefly before the extra injection arrives. The lag cannot be 0. Unused when the regime is not fiat.

## credit.endogenousWeight

- Label: Endogenous credit weight
- Group: credit
- Unit: share
- Default: 0.5
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly lending expands in calm periods and contracts when leverage or defaults rise. At 0, credit moves only with the credit shock and with ordinary firm borrowing. Above 0, calm lending room is wider by one plus four times this weight. From the first anniversary, calm banks lend this weight times 12 percent of household deposits, split across firms and still inside that room. Stress builds when loans exceed credit.leverageStart times household deposits or when loans are written off. Above a small stress limit, new endogenous borrowing stops, lending room shrinks, and firms repay. The default of 0.5 is a moderate boom-bust credit cycle.

## credit.householdMortgageShare

- Label: Household mortgage credit share
- Group: credit
- Unit: share
- Default: 0.3
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of each bank’s capital capacity reserved for household mortgages and consumer loans. At 0, households compete with firms for the same lending room, which often leaves no room for new mortgages after the opening book. The default of 0.3 keeps that share of equity over the capital ratio for household credit, and firm lending uses the remainder.

## credit.leverageStart

- Label: Credit leverage start
- Group: credit
- Unit: share
- Default: 0.85
- Range: 0.02 to 1.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Loan-to-deposit ratio above which endogenous credit stress begins to build. The default of 0.85 lets calm banks hold a loan book near deposits before stress cuts lending. At 0.02, calm lending stops once loans exceed 2 percent of household deposits. Unused when endogenous credit weight is 0.

## credit.rateTransmission

- Label: Policy-rate transmission
- Group: credit
- Unit: share
- Default: 0.6
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly the real policy rate cuts new consumer borrowing and firm capital installation. The factor is max(0, 1 − weight × max(0, policy rate − inflation)). The default of 0.6 transmits part of a rate rise into lower borrowing and investment. At 0 the credit and investment path ignores the rate.

## deflation.sensitivity

- Label: Deflation sensitivity
- Group: credit
- Unit: coefficient
- Default: 1
- Range: 0 to 5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly expected deflation changes credit and housing. Expected deflation is zero when inflation is positive, and the absolute value of inflation when prices are falling. The penalty is this sensitivity times that rate, capped at 0.9. While it is positive, firms repay a slice of their loans each month, housing demand is scaled down by the penalty, and the reported profit-sharing and non-mortgage housing shares rise when tenure choice is off. When tenure choice is on, those housing shares are measured from household tenures instead. At zero, or whenever inflation is positive, the penalty is off, so a fiat run near the inflation target is unchanged.

## equity.marketOn

- Label: Equity market
- Group: behavior
- Unit: switch
- Default: on
- Options: off, on
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Whether household wealth includes a claim on firm capital. On, firm capital valued at the posted price is split across households with the same skill weights used for profits, including the extra concentration from AI ownership. Those claims are not traded and do not move deposits. They raise measured wealth and the wealth Gini when capital income is uneven. Off counts only deposits.

## expectations.anchorWeight

- Label: Inflation anchor
- Group: behavior
- Unit: share
- Default: 0.65
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How far expected inflation follows the regime path instead of the last year of prices. The path is the inflation target under fiat and minus baseline productivity under bitcoin and hybrid. Expected inflation is this weight times that path plus one minus the weight times trailing inflation. Spending, the real return on money, the deflation penalty, contract choice, and the fiat policy rate use that expectation. Posted-price trends keep the regime path at weight 0, and follow the expectation above 0. Wages negotiate toward the agreed wage from the price level and do not take this path directly. The default of 0.65 puts most weight on the regime path. At 0 every expectation is the trailing rate. At 1 expectations sit on the regime path.

## firm.hurdlePremium

- Label: Investment hurdle premium
- Group: behavior
- Unit: 1/year
- Default: 0.02
- Range: 0 to 0.1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Extra real return a capital project must earn above the real return on money when the investment hurdle is on. At 0.02 the project must beat money by two percentage points a year. Unused when the hurdle is off.

## firm.investmentHurdle

- Label: Investment hurdle
- Group: behavior
- Unit: mode
- Default: on
- Options: off, on
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Whether firms install capital only when the expected return clears the real return on money plus a premium. On: expected return is baseline productivity growth plus a quarter of the firm markup. The real return on money is the deposit rate minus inflation. If the project clears, capital is installed as before. If it fails, only a quarter of the gap is installed from retained claims and the rest is recorded as profit-sharing finance. Measured profit-sharing share is profit-sharing finance over that plus loan-path finance. Off keeps the scheduled capital rule and the profit-sharing formula tied to the deflation penalty.

## firm.markup

- Label: Firm markup
- Group: behavior
- Unit: share of cost
- Default: 0.2
- Range: 0.05 to 0.6
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How far the target price sits above unit labor cost. The target is unit cost times one plus this markup, times a small inventory adjustment of at most 2 percent. A markup of 0.2 means the target is 20 percent above cost. Posted prices drift toward that target; they do not jump to it. The opening price level is the starting wage times one plus this markup.

## firm.priceAdjustSpeed

- Label: Price adjustment speed
- Group: behavior
- Unit: share per tick
- Default: 0.3
- Range: 0.05 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly the price is pulled toward the cost target each month. The pull is this speed times 1 percent of the gap between the target and the current price, and it is capped at 0.1 percent a month, so a speed of 1 still cannot reprice faster than that cap. Low inventory raises the target and high inventory lowers it. Raising the speed closes the gap to cost sooner. The inflation trend, set by the regime, is separate from this pull.

## goods.apparelProductivity

- Label: Apparel productivity
- Group: goods
- Unit: 1/year
- Default: 0.04
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth of apparel, used only to split the CPI. After t years the unscaled price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. This category is about 3 percent of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation, electronics given a small share, and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes this category cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI. The default is above baseline, so apparel cheapens.

## goods.educationProductivity

- Label: Education productivity
- Group: goods
- Unit: 1/year
- Default: 0.001
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth of education, used only to split the CPI. After t years the unscaled price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. This category is about 3 percent of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation, electronics given a small share, and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes this category cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI. The default is just below baseline, so education rises slightly relative to it. Communication is not in this share.

## goods.electronicsProductivity

- Label: Electronics productivity growth
- Group: goods
- Unit: 1/year
- Default: 0.08
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth of electronics, used only to split the CPI. After t years the unscaled electronics price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. Electronics are about 1 percent of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes electronics cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI.

## goods.energyProductivity

- Label: Energy productivity
- Group: goods
- Unit: 1/year
- Default: 0.005
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth of energy, used only to split the CPI. After t years the unscaled price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. This category is about 7 percent of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation, electronics given a small share, and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes this category cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI. The default is below baseline, so energy rises relative to it, and by less than housing.

## goods.foodProductivity

- Label: Food and bev productivity
- Group: goods
- Unit: 1/year
- Default: 0.01
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth of food and bev, used only to split the CPI. After t years the unscaled price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. This category is about 15 percent of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation, electronics given a small share, and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes this category cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI. The default equals baseline productivity.

## goods.housingSupplyGrowth

- Label: Housing supply growth
- Group: goods
- Unit: 1/year
- Default: 0.004
- Range: -0.01 to 0.02
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual growth in the supply of housing. Demand is taken to rise with real income, so the unscaled housing price is ((1 + baseline productivity growth) / (1 + this rate)) raised to t, times one minus the deflation penalty. Housing is about 43 percent of the basket, the December 2024 CPI-U housing share with household energy removed, then rescaled with the other categories. The basket is scaled so the expenditure-weighted average equals the CPI. Expected deflation cuts housing demand through the penalty. A higher housing price relative to the CPI lowers housing security. The default of 0.004 sits just under population growth, so scarcity can build when market clearing is on. At zero, housing rises with productivity. A negative rate means the stock shrinks. Set this equal to baseline productivity, and set every category productivity equal to that same baseline, to put every price on the CPI aside from the deflation term. When housing.marketClearing is on, this growth also eases the market scarcity index.

## goods.medicalProductivity

- Label: Medical productivity
- Group: goods
- Unit: 1/year
- Default: 0.003
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth of medical, used only to split the CPI. After t years the unscaled price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. This category is about 9 percent of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation, electronics given a small share, and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes this category cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI. The default is below baseline, so medical care rises relative to it.

## goods.recreationProductivity

- Label: Recreation productivity
- Group: goods
- Unit: 1/year
- Default: 0.03
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth of recreation, used only to split the CPI. After t years the unscaled price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. This category is about 6 percent of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation, electronics given a small share, and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes this category cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI. The default is above baseline, so recreation cheapens.

## goods.sampleSize

- Label: Shops sampled
- Group: behavior
- Unit: firms
- Default: 4
- Range: 1 to 12
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How many firms a household can visit while spending its monthly budget. The run rounds this to a whole number. The walk starts at a random firm and continues to the following firms until the budget is spent, the visits run out, or those firms are out of stock. The household buys from the firms on that walk that still have inventory. A larger sample makes a stockout easier to work around. Shoppers do not sort firms by price.

## goods.transportProductivity

- Label: Transportation productivity
- Group: goods
- Unit: 1/year
- Default: 0.02
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth of transportation, used only to split the CPI. After t years the unscaled price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. This category is about 14 percent of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation, electronics given a small share, and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes this category cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI. The default is a little above baseline, so transportation cheapens slowly. Motor fuel is in energy, not here.

## government.bondRate

- Label: Government bond rate
- Group: publicFinance
- Unit: 1/year
- Default: 0.04
- Range: 0 to 0.12
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual coupon on government bonds held by banks. Each month the treasury pays one twelfth of this rate times bonds outstanding. The payment leaves the treasury deposit and raises bank equity. If the treasury cannot cover it, the shortfall is financed like any other deficit. The default of 0.04 is a 4 percent coupon. At 0 bonds pay no coupon.

## government.spendingShareOfGDP

- Label: Government spending share
- Group: publicFinance
- Unit: share of GDP
- Default: 0.2
- Range: 0 to 0.5
- Status: calibrated
- Source: Set so public purchases are a fifth of the income base and the goods market clears. Not a country estimate.
- Description: Share of household smoothed income that the government buys from firms. It shops first at the firms holding the most inventory. Households spend what remains: their spending share of income starts at one minus this value, then tilts with how impatient they are relative to the mean. Raising this share shifts purchases from households to the government. If tax revenue does not cover the bill, the treasury issues bonds. It is a closed-economy purchase share, set so the goods market can clear, not an estimate for a particular country.

## government.stabilizer

- Label: Fiscal stabilizer
- Group: publicFinance
- Unit: coefficient
- Default: 1
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How much government goods spending responds to unemployment. Under fiat, the spending share rises by this coefficient times the gap of unemployment above the natural rate, capped at 0.8. Under bitcoin or hybrid, spending cannot exceed tax deposits plus bonds banks can hold from unused savings, so the stabilizer cannot expand base money. The default of 1 raises purchases one-for-one with the unemployment gap. At 0 the spending share stays at the government spending slider.

## government.treasuryBufferMonths

- Label: Treasury buffer
- Group: publicFinance
- Unit: months
- Default: 1
- Range: 0 to 24
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Months of this tick’s outlays the treasury keeps. Outlays are the household grant, goods the treasury actually bought, and bond coupons. Cash above that is paid to households in proportion to that tick’s income, after tax, and counted in their income, so it raises next month’s demand and is not taxed in the collection that funded it. The share follows income so the refund does not flatten the distribution. At 1 the treasury cannot build a stock of deposits. At 0 any surplus is rebated the same month. A shortfall still issues bonds.

## government.ubiShare

- Label: UBI share of AI GDP
- Group: publicFinance
- Unit: share
- Default: 0.25
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Fraction of the AI slice of monthly nominal GDP paid equally to every household. The AI slice is the AI share of output times price times real GDP. The grant starts at zero when no AI capacity is adopted and rises with that share, so it phases in along the adoption curve rather than as a fixed stipend. At 0.25 with an AI share of 0.36, about 9 percent of that month’s nominal GDP is paid out. Tax, including tax on AI agents, is collected first. If the treasury cannot cover the grant, it issues bonds to the first bank. Households only receive the grant. Agents do not. At 0 the grant is off even while AI is adopted.

## household.durableShare

- Label: Durable spending share
- Group: behavior
- Unit: share
- Default: 0.25
- Range: 0 to 0.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of discretionary goods spending treated as durable purchases that can be delayed when the real return on money is high. The default of 0.25 is a quarter of discretionary spending. At 0 all goods spending is nondurable.

## household.inflationTimePreference

- Label: Inflation time-preference response
- Group: behavior
- Unit: coefficient
- Default: 0.1
- Range: 0 to 0.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly inflation above the regime normal path raises the goods spending share. The gap is expected inflation minus the inflation target under fiat, or minus productivity growth under bitcoin and hybrid. Expected inflation is the trailing year-over-year rate unless expectations.anchorWeight pulls it toward that path. The share rises by this coefficient times the gap. At 0.1, ten percentage points of inflation above the path raises the share by one percentage point. The response is small because value can sit in assets other than goods, so only a leak into consumption shows up here. At 0 the spending share ignores inflation. The fiat policy rate still uses the mean time-preference slider alone.

## household.openingDepositMonths

- Label: Opening deposit months
- Group: behavior
- Unit: months
- Default: 18
- Range: 6 to 60
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Months of the base wage, scaled by skill squared, held as each household’s opening deposit. The default of 18 is about a year and a half of income. Lower values raise velocity. At 36 deposits are about three years of income and velocity is low.

## household.realReturnSensitivity

- Label: Real-return spending sensitivity
- Group: behavior
- Unit: coefficient
- Default: 0.8
- Range: 0 to 5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly a positive real return on money cuts discretionary goods spending. The real return is the deposit rate minus year-over-year inflation. The household budget from income and deposits is split into a food and housing floor, about 58 percent of the basket, and a discretionary remainder. Only the remainder shrinks: it is multiplied by max(0, 1 − this sensitivity × the real return). The floor is still bought. The default of 0.8 cuts discretionary spending when money pays a real return. At 0 the whole budget is unchanged.

## household.skillSigma

- Label: Skill dispersion
- Group: behavior
- Unit: log points
- Default: 0.7
- Range: 0.1 to 1.2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Spread of innate earning power, as the standard deviation of a lognormal skill draw. Draws are kept between 0.2 and 5, then divided by their average so mean skill is 1. A worker is paid the firm wage times skill. Starting deposits scale with skill squared, about the opening-deposit months of the base wage for a skill of 1, so wealth begins more unequal than pay. Profits are shared with weights of skill raised to 1.5 or more, which concentrates capital income on high-skill households. The default of 0.7 thickens the high-skill tail relative to 0.5.

## household.timePreferenceMean

- Label: Mean time preference
- Group: behavior
- Unit: 1/year
- Default: 0.04
- Range: 0.01 to 0.15
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How impatient households are, on average, as an annual discount rate. Each household draws a rate around this mean, and the draw is kept between 1 and 15 percent a year. Spending depends on whether a household is more or less impatient than this mean, so raising the mean does not raise average spending. Inflation above the regime path can still raise average spending through household.inflationTimePreference. In the fiat regime the same number is the neutral real interest rate: the policy rate starts from this value plus inflation. A higher mean lifts the fiat policy rate even when inflation is on target.

## household.timePreferenceStd

- Label: Time preference spread
- Group: behavior
- Unit: 1/year
- Default: 0.02
- Range: 0 to 0.08
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How widely patience differs across households. Each household draws a normal rate around the mean time preference, then the draw is kept between 1 and 15 percent a year. A household above the mean spends a larger share of smoothed income; one below the mean saves more. A wider spread fans consumption and deposit balances apart. At zero, every household has the mean rate and no patience draw is used.

## housing.adjustmentRate

- Label: Tenure adjustment rate
- Group: credit
- Unit: 1/month
- Default: 0.01
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of households who may switch tenure in one month when tenure choice is on. Each household draws against its own stream, so a cheap loan rate cannot move the whole eligible stock in the opening tick. Opening tenure is unchanged until a household draws a switch. At 1 every household reconsiders every month. At 0 tenure stays at the opening mix. Unused when tenure choice is off.

## housing.consumerCreditLimit

- Label: Consumer credit limit
- Group: credit
- Unit: share of income
- Default: 0.2
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Maximum consumer loan stock as a share of monthly income when tenure choice is on. New borrowing each month is that headroom times one minus the deflation penalty, and it cannot exceed bank lending room. The loan funds discretionary spending only. At 0, no consumer credit is issued. Unused when tenure choice is off.

## housing.marketClearing

- Label: Housing market clearing
- Group: goods
- Unit: switch
- Default: on
- Options: off, on
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Whether housing scarcity is a market outcome. On, scarcity starts at 1 and moves with the share of households who own or hold a mortgage, and with housing supply growth. That scarcity multiplies the housing category price and the home price used for tenure choice. When tenure choice is off, demand sits at the neutral share, so scarcity stays at 1 unless supply growth moves it. Off keeps the formula price and a home price of 48 months of income times the monetary-premium multiple.

## housing.monetaryPremium

- Label: Housing monetary premium
- Group: goods
- Unit: share
- Default: 0.25
- Range: 0 to 0.75
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of the current 48-month home price that exists because housing is held as an inflation hedge. The hedge follows the regime price path: the inflation target under fiat, and minus baseline productivity under bitcoin and hybrid. When that path matches a positive inflation target, the multiple stays 1 and homes cost 48 months of income. When the path does not inflate, or the inflation target is 0, the multiple is one minus this share, so the default of 0.25 cuts the purchase price, rent, mortgage size, and unscaled CPI housing line by a quarter under bitcoin. At 0 the previous 48-month price is unchanged.

## housing.mortgageDefaultShare

- Label: Mortgage default income share
- Group: credit
- Unit: share
- Default: 0.4
- Range: 0.1 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: When tenure choice is on, a household that cannot pay its full mortgage for three months while the payment exceeds this share of income has the unpaid balance written off against bank equity and returns to rent. At 0.4 the payment must be above 40 percent of income. Unused when tenure choice is off.

## housing.mortgageLtv

- Label: Mortgage loan-to-value
- Group: credit
- Unit: share
- Default: 0.8
- Range: 0.5 to 0.95
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Maximum loan as a share of the home price when tenure choice is on. The home price is 48 months of the household’s income times scarcity and the monetary-premium multiple. A higher ratio lets more of the purchase be debt. Unused when tenure choice is off.

## housing.mortgageTermYears

- Label: Mortgage term
- Group: credit
- Unit: years
- Default: 30
- Range: 5 to 40
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Length of a new nominal mortgage when tenure choice is on. The monthly payment is the principal divided by the term in months. A longer term lowers the monthly payment and raises the expected real burden under deflation, because the debt is outstanding longer. Unused when tenure choice is off.

## housing.openingMortgageShareOfOwners

- Label: Opening mortgage share of owners
- Group: credit
- Unit: share
- Default: 0.62
- Range: 0 to 1
- Status: sourced
- Source: About 62 percent of U.S. owner households have a mortgage, from the Census mortgage-status share.
- Description: Share of opening owners who still owe a mortgage when tenure choice is on. The default of 0.62 is about the share of U.S. owner households with a mortgage. With an owner share of 0.655, about 40.6 percent of households start with a mortgage and 24.9 percent own outright. The principal is the loan-to-value share of that household’s home price (48 months of income times scarcity and the monetary-premium multiple), at the opening loan rate and the mortgage term. If that book would leave bank reserves short of the reserve requirement, every principal is scaled down by the same factor. A household whose principal rounds to zero owns outright instead. At 0 every opening owner owns outright. Unused when tenure choice is off.

## housing.openingOwnerShare

- Label: Opening owner share
- Group: credit
- Unit: share
- Default: 0.655
- Range: 0 to 1
- Status: sourced
- Source: Approximate U.S. homeownership rate in 2026, about 65.5 percent of households.
- Description: Share of households who already own a home when tenure choice is on. The default of 0.655 is the approximate U.S. homeownership rate in 2026, so about 34.5 percent start as renters. The highest-skill households own outright. The next band, set by the mortgage share of owners, holds a nominal mortgage. Everyone else rents. The purchase is not replayed: outright owners have no housing loan, and an opening mortgage is outstanding principal rather than new cash. At 0 every household starts renting. Unused when tenure choice is off.

## housing.tenureChoice

- Label: Housing tenure choice
- Group: credit
- Unit: mode
- Default: on
- Options: off, on
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Whether households choose rent, a nominal mortgage, or cash ownership. On: households open already housed at the opening owner share, then each month pick the tenure with the lowest expected real burden. Expected deflation raises the mortgage burden, so fewer new mortgages are taken. Shelter stays inside the food and housing spending floor. Consumer loans fund only discretionary spending above that floor and fall as the deflation penalty rises, down to zero. Household loans count in total credit and the bank capital rule. Off keeps the penalty formulas for non-mortgage housing and property turnover, and households hold no mortgages or consumer loans.

## labor.firmLevelHiring

- Label: Firm-level hiring
- Group: behavior
- Unit: switch
- Default: on
- Options: off, on
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Who sets the hiring target. On, each firm wants the headcount whose capacity matches its smoothed sales, vacancies go to understaffed firms, and the aggregate sits between the cost quota times one minus the monthly shed share and the cost quota. Firms shed at most 5 percent of employed workers in a month when the target falls. Off keeps the economy-wide quota: 94 percent of households times the human share of output, tilted by demand and by the wage elasticity.

## labor.maxApplications

- Label: Job applications
- Group: behavior
- Unit: applications per tick
- Default: 3
- Range: 1 to 8
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How many firms an unemployed household can ask for work in one month. The run rounds this to a whole number. Hiring fills openings until employment is near 94 percent of households times the human share of output, with a small tilt when a demand shock is on. That target rises the natural unemployment rate as AI capacity grows. A searcher walks a short list of firms and takes the first one that still has room. A household displaced by automation is limited to one application even when this slider is higher. More applications make it easier to find a firm that is still hiring. This slider only limits how wide the search is.

## labor.wageElasticity

- Label: Wage elasticity of hiring
- Group: behavior
- Unit: coefficient
- Default: 0.5
- Range: 0 to 3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly the hiring quota responds when the real wage is away from the agreed real wage. The quota starts at 94 percent of households times the human share of output. The reference is the agreed money wage over the price level: 1 / (1 + firm markup) times economy-wide productivity times one plus the hiring productivity impulse, times one plus 0.4 times labor-market tightness. The quota is multiplied by clamp(1 − this elasticity × (real wage / reference − 1), 0.5, 1.25). A posted wage above the agreed wage cuts hiring; a wage below it raises hiring. The default of 0.5 cuts the quota by 5 percent when the real wage is 10 percent above the reference. At 0 the quota ignores the real wage. When the scaled quota is below current employment, firms separate workers down to the quota.

## money.bitcoinTrust

- Label: Bitcoin trust
- Group: regime
- Unit: score
- Default: 0.4
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How willing holders are to keep bitcoin. The bitcoin score is this trust plus the real return, minus a small payment friction. The default of 0.4 is a modest stake beside fiat legal tender. Unused when money choice speed is 0.

## money.cbdcStart

- Label: Opening CBDC share
- Group: regime
- Unit: share
- Default: 0.005
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of money balances that start as a central-bank digital currency. The default of 0.005 is a small opening stake. At 0 none of the opening mix is CBDC.

## money.choiceSpeed

- Label: Money choice speed
- Group: regime
- Unit: share per tick
- Default: 0.01
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How fast currency shares move toward the monies people prefer. Bitcoin starts at its current weight in global assets, about 0.4 percent. Stablecoins and CBDC start from their opening sliders, and fiat is the rest. Each month the shares step toward the mix implied by legal tender, trust, payment friction, and the real return. Bitcoin issuance follows the halving schedule and is not a slider. The default of 0.01 closes about half the gap to the preferred mix in six years. At 0 the shares stay at that opening mix and the regime control still selects the monetary rule. Above 0 the policy rate and reserve accommodation follow the fiat share, and exchange rates move with each money’s share.

## money.fiatLegalTender

- Label: Fiat legal-tender pull
- Group: regime
- Unit: score
- Default: 1.5
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly fiat is pulled into use by taxes, courts, and legal tender. It is the fiat score in the money-choice softmax. The default of 1.5 keeps fiat the largest money when choice is on. Unused when money choice speed is 0.

## money.stablecoinStart

- Label: Opening stablecoin share
- Group: regime
- Unit: share
- Default: 0.01
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of money balances that start as stablecoins. Stablecoin trust and friction are fixed in the model. The default of 0.01 is a small opening stake. At 0 none of the opening mix is a stablecoin.

## population.bequests

- Label: Bequest rule
- Group: background
- Unit: mode
- Default: skillWeighted
- Options: firstHousehold, skillWeighted
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Who receives a household’s deposit when population growth removes that household. skillWeighted gives the estate to the remaining households in proportion to skill to the 16th, so it concentrates on the highest-skill heirs. firstHousehold transfers everything to household 0.

## population.growth

- Label: Population growth
- Group: background
- Unit: 1/year
- Default: 0.005
- Range: -0.01 to 0.02
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual change in the number of households. The monthly rate adds or removes people deterministically, carrying a fractional remainder so a small rate still changes the count. New households enter unemployed, with no deposit, a fresh skill draw, and the next id. A household who exits leaves any deposit under the bequest rule and any loan is written off against bank equity. The default of 0.005 is a half-percent annual rise. At 0 the household count stays at the Households slider.

## prices.trendWeight

- Label: Price trend weight
- Group: behavior
- Unit: share
- Default: 0.75
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of monthly price growth that follows the regime price trend. The rest follows excess demand: desired goods spending this month relative to nominal capacity, minus one. Monthly growth is this weight times the trend plus one minus this weight times excess demand, plus the small cost nudge and shock tilt, then capped. The default of 0.75 keeps most of the regime path and lets demand move a quarter of the growth. At 1 the fiat inflation target or bitcoin productivity trend writes the path alone. At 0 prices move only with excess demand.

## production.alpha

- Label: Capital elasticity
- Group: behavior
- Unit: share
- Default: 0.33
- Range: 0.2 to 0.5
- Status: sourced
- Source: A capital elasticity near one third matches the usual Cobb–Douglas capital share.
- Description: Exponent on capital in the Cobb–Douglas production function. Capacity is productivity times capital raised to this power times labor raised to one minus this power. A higher value means output responds more to capital and less to employment. Capital starts equal to employment at that firm and depreciates at 0.5 percent a month. The default near one third matches the usual capital share of income.

## production.demandWeight

- Label: Demand weight on output
- Group: behavior
- Unit: share
- Default: 0.5
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How far monthly output follows recent sales instead of full capacity. At 0 every firm produces its capacity, and unsold goods pile into inventory. Above 0, desired output is smoothed sales plus the gap to one month of inventory, capped at capacity, and output is a mix of that quantity and full capacity. The default of 0.5 mixes capacity and demand so a calm opening mortgage book does not collapse employment. At 1, output equals desired sales. A demand shortfall then lowers real GDP in later months.

## productivity.baseGrowth

- Label: Baseline productivity growth
- Group: background
- Unit: 1/year
- Default: 0.01
- Range: 0 to 0.04
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual growth of economy-wide productivity before the AI channels. It compounds into productive capacity and into wage growth. Under bitcoin or hybrid money the price trend is the negative of this rate, because the money stock does not grow with output, so the CPI tends to fall as goods get easier to make. Category prices are measured against this baseline. Match a category productivity, or housing supply growth, to it and that unscaled price stays flat against the baseline. Set every one of them equal to it to put every price on the CPI.

## productivity.endogenousWeight

- Label: Endogenous productivity weight
- Group: background
- Unit: share
- Default: 0.2
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of productivity growth that tracks capacity utilization (real GDP over a reference staffing path) instead of only the baseline rate. The default of 0.2 mixes a fifth of growth with utilization. At 0 growth follows productivity.baseGrowth alone.

## regime.type

- Label: Monetary regime
- Group: regime
- Unit: regime
- Default: fiat
- Options: fiat, bitcoin, hybrid
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Rule set for base money, interest, and government finance. Fiat prices trend toward the inflation target, the central bank sets the policy rate from inflation and unemployment, and it creates reserves when the reserve requirement binds. Money is integer cents. Bitcoin does not grow the money stock with the economy, so the price trend is minus productivity growth. New loans cannot exceed unused savings, and a government budget shortfall is financed by bonds rather than new central-bank money. Money is satoshis, including fractions of a satoshi. Hybrid uses that same unit and price trend, and it does not target inflation. If a bank equity balance goes negative, the hybrid central bank injects enough reserves and vault cash to make that equity positive. That injection is the only base-money growth in the hybrid regime.

## scale.banks

- Label: Banks
- Group: scale
- Unit: agents
- Default: 4
- Range: 1 to 10
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Number of commercial banks. The run rounds this to a whole number. Households and firms are assigned to banks in turn, by id. Lending room, reserves, and failures are tracked per bank. In the fiat regime, newly created reserves and government bonds are booked at the first bank. The default of 4 leaves that first bank and three ordinary books.

## scale.firms

- Label: Firms
- Group: scale
- Unit: agents
- Default: 200
- Range: 4 to 500
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Number of firms. The run rounds this to a whole number and keeps it fixed. Each firm produces, sets a price, hires, and invests on its own. The default keeps about 20 households per firm, so a typical firm employs about 19 people. More firms mean a thinner workforce at each firm and more sellers for a shopper to land on. The release target is 500.

## scale.households

- Label: Households
- Group: scale
- Unit: agents
- Default: 4000
- Range: 20 to 10000
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Number of household agents. The run rounds this to a whole number and keeps it fixed; population growth does not add people. Skill, patience, and job search are drawn once per household from the seed, so a larger population makes averages smoother and a run slower. Development runs use 4,000 households. The release target is 10,000.

## shock.frequency

- Label: Shock frequency
- Group: shocks
- Unit: 1/year
- Default: 0.1
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Chance that a new macroeconomic shock starts at a yearly check. Checks begin in month 24 and repeat every 12 months, and a check is skipped while a shock is already running. A value of 0.1 is a 10 percent chance on an idle check. A value of 1 starts a shock whenever the previous one has finished. A value of 0 turns the channel off. Each shock is credit, demand, or productivity with equal chance, and it lasts 24 months: 12 of expansion, then 12 of contraction.

## shock.size

- Label: Shock size
- Group: shocks
- Unit: share
- Default: 0.05
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Size of a shock while it is active, as a share. A demand shock adds this share to spending and hiring during the expansion year and subtracts half of it during the contraction. Hiring from that shock stays inside a band around the usual employment target, so unemployment may move less than the size suggests. A productivity shock multiplies capacity by one plus this share while it expands, and it slows price growth. A credit shock widens lending during the expansion, writes off 10 percent of firm loans at the turning point, and tightens lending during the contraction.

## tax.incomeRate

- Label: Income tax rate
- Group: publicFinance
- Unit: share
- Default: 0.2
- Range: 0 to 0.5
- Status: calibrated
- Source: Set equal to the spending share so the treasury starts near balance.
- Description: Share of household and AI-agent income paid to the treasury each month. Each payer pays from its deposit, up to the balance it has. Revenue lands in the government deposit and is the first source of funds for the household UBI grant and for government purchases. The default matches the spending share so the treasury starts near balance when the grant is off. If taxes do not cover the grant or purchases, the treasury issues bonds and the first bank holds them. Changing the tax rate does not by itself change how much the government buys.

## transition.debtHaircut

- Label: Transition debt haircut
- Group: regime
- Unit: share
- Default: 0
- Range: 0 to 0.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of the firm loans, mortgages, and consumer loans converted in a transition month that is written off. At 0 that slice converts one-for-one into bitcoin debt. When gradual weight is 0 the whole stock is converted on the last month. Unused when the transition length is 0.

## transition.gradualWeight

- Label: Gradual transition weight
- Group: regime
- Unit: share
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: When a transition window is positive and this weight is positive, each month converts one over the months still left, times this weight, of every deposit and of firm and household debt into bitcoin units at the current bitcoin price. Goods can be paid from either balance. The debt haircut writes off that share of the slice converted that month. At 1 the stock converts in equal monthly slices and both balances are in use through the window. At 0 the one-step rebase at the end of the window is unchanged.

## transition.holderConcentration

- Label: Transition holder concentration
- Group: regime
- Unit: share
- Default: 0.5
- Range: 0 to 0.99
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How concentrated the post-conversion deposit distribution is. Household deposits are reassigned with weights of skill raised to one plus four times this value. At 0 the weights are skill itself. At 0.99 high-skill households receive almost all deposits. Unused when the transition length is 0.

## transition.lengthMonths

- Label: Transition length
- Group: regime
- Unit: months
- Default: 0
- Range: 0 to 120
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Months of a one-time fiat-to-bitcoin change. At 0 there is no transition and regime.type selects a steady rule set. A positive length starts the run on fiat rules with satoshi balances. When gradual weight is 0, the last month may haircut debts, reassign deposits by holder concentration, clear government bonds on bank books, and switch the active regime to bitcoin. When gradual weight is positive, deposits and debts convert into bitcoin over the window and the regime flips at the end. Monetization stays off afterward.

## transition.realMortgage

- Label: Real mortgage at rebase
- Group: regime
- Unit: mode
- Default: off
- Options: off, on
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Whether mortgages that still exist when a fiat-to-bitcoin transition finishes are restated as a real claim. Off leaves those loans fixed in satoshis. On stamps them at the rebase: afterward the principal and payment scale with the price level so the real payment stays at its rebase value. Each month the capital-ratio share of the principal change seats on bank equity and the rest seats on deposits at that bank. Mortgages originated after the flip stay nominal. Firm loans and consumer loans stay nominal. Unused when the transition length is 0.

## wage.nominalRigidity

- Label: Nominal wage rigidity
- Group: behavior
- Unit: share
- Default: 0.9
- Range: 0 to 0.95
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of the gap between the posted money wage and the agreed wage left for next month. The agreed wage is the price level times 1 / (1 + firm markup) times economy-wide productivity times one plus the hiring productivity impulse, times one plus 0.4 times labor-market tightness. Employees close a shortfall and employers close an excess at the same speed: one minus this rigidity of the gap each month, capped by the monthly wage move. At 0.9, ten percent of the gap closes each month. At 0 the posted wage matches the agreed wage immediately. Under rising prices the lag leaves employees behind; under falling prices it leaves them ahead.
