# Assumptions

Generated from the slider registry. Do not edit by hand.

Regenerate with `pnpm sim assumptions --out docs/assumptions.md`.

Registry version: 3.

## ai.adoptionMidpointYear

- Label: AI adoption midpoint
- Group: ai
- Unit: years
- Default: 15
- Range: 3 to 40
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Year when the automatable share is halfway from the start share to the end share. An earlier year brings the S-curve forward. The curve is flat, and this year does nothing, when the start and end shares are equal.

## ai.adoptionSteepness

- Label: AI adoption steepness
- Group: ai
- Unit: 1/year
- Default: 0.4
- Range: 0.1 to 1.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How sharply the automatable share climbs through its S-curve, per year. A higher value bunches the change around the midpoint year. A lower value spreads the same change over more years. It has no effect when the start and end shares are equal.

## ai.agentAutonomyShareEnd

- Label: AI agent autonomy share
- Group: ai
- Unit: share
- Default: 0.5
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How many AI agents eventually keep their own accounts, as a share of the household count. The count rises in a straight line from zero to this share over five years. At 0.5 with 1,000 households, the run ends with about 500 agents. Each agent has a human owner, holds a deposit, and sells one unit of compute to a firm when its price, including the payment fee, is cheap relative to the wage. It keeps a small amount for compute and pays the rest to its owner. Human well-being, income, and wealth count households only. At zero, no agents are created and the rest of the economy is unchanged.

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
- Default: 1
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How large the productivity gain is on each adopted task. At 0 the gain is one tenth of the default, about the scale of a decade of internet-era productivity gains once the adoption curve finishes, and unemployment barely moves. At 1, the default, each adopted task adds its full share to capacity and the gain saturates with the S-curve. Above 1 the same level formula compounds: each point above 1 adds 15 percent a year of growth to the task gain with no ceiling, so at 2 the gain grows at 15 percent a year. Hiring still follows the adopted task share, capped by the physical-task share until robots open it. Equal start and end automatable shares still turn the whole AI channel off. The anchors are a modeling guess after Korinek et al. 2026 and the internet-era productivity literature.

## ai.computeCostDeclineRate

- Label: Compute cost decline
- Group: ai
- Unit: 1/year
- Default: 0.3
- Range: 0 to 0.6
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual rate at which AI compute gets cheaper. Cost starts equal to the wage and is multiplied by one minus this rate each year. Firms take up newly automatable tasks only once that cost is below the wage. Any positive rate makes cost fall below the wage after the first year. At zero, cost stays at the wage and this channel adds no capacity.

## ai.ownershipConcentration

- Label: AI ownership concentration
- Group: ai
- Unit: share
- Default: 0.8
- Range: 0.1 to 0.99
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How concentrated the gains from AI are across households. Two things use it. Profit shares normally follow skill raised to 1.5; once AI capacity is above normal, that exponent rises by this value times the extra capacity factor, so the same skill gaps claim a larger share of profits. AI agents are also owned by a smaller group: the owner count is the household count times one minus this value. At 0.8, about a fifth of households own the agents. It does not change who is employed.

## ai.paymentFrictionBitcoin

- Label: Bitcoin payment friction
- Group: ai
- Unit: share per transaction
- Default: 0.005
- Range: 0 to 0.1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Fee on an AI agent sale in the bitcoin and hybrid regimes, as a share of the payment. The fee is paid into bank equity. The asking price starts at 4 percent of the wage and is marked up by this fee. Firms buy only when the ask is still under 4.2 percent of the wage, so a fee of about 5 percent or more stops the sales. The default of 0.005 stays well under that cutoff. The fiat regime uses the fiat fee instead. The fee does nothing when no autonomous agents are created.

## ai.paymentFrictionFiat

- Label: Fiat payment friction
- Group: ai
- Unit: share per transaction
- Default: 0.02
- Range: 0 to 0.1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Fee on an AI agent sale in the fiat regime, as a share of the payment. The fee is paid into bank equity. The asking price starts at 4 percent of the wage and is marked up by this fee. Firms buy only when the ask is still under 4.2 percent of the wage, so a fee of about 5 percent or more stops the sales. Below that, a higher fee makes the agent a worse deal and can leave the ask uncompetitive. The bitcoin and hybrid regimes use the bitcoin fee instead. The fee does nothing when no autonomous agents are created.

## ai.physicalTaskShare

- Label: Physical task share
- Group: ai
- Unit: share
- Default: 0.3
- Range: 0 to 0.7
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of tasks that software cannot do, such as in-person physical work, before the robotics ramp opens them. Extra capacity from AI is the gain in the automatable share times one minus the effective physical share. If the automatable share has risen by 0.2 and this share is 0.3, capacity is about 14 percent higher while the ceiling is intact. At 0, the whole gain becomes capacity. At 1, nothing is automated until robots retire the share. Displacement, which limits job search, begins only once capacity has actually increased.

## ai.roboticsRampYears

- Label: Robotics ramp
- Group: ai
- Unit: years
- Default: 8
- Range: 1 to 30
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How many years the effective physical-task share takes to fall from its slider value to zero after the robotics start year. The path is a straight line. At the defaults the ceiling is intact through year 5, half gone around year 9, and gone by year 13. A finished ramp lets the automatable share that software already reached cover the old physical tasks as well. Tasks outside the final automatable share stay human.

## ai.roboticsStartYear

- Label: Robotics start
- Group: ai
- Unit: years
- Default: 5
- Range: 0 to 50
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Year from the start of the run when mass robotics begins to open physical tasks. The core does not read the calendar. Tick 0 is month 0, and charts label that month as the month the page is opened, so the default of 5 is about 2031 when month 0 is read as late 2026. Until this year the physical-task share stays at its slider. A start year at or past the last year of the run leaves the ceiling intact for that run.

## bank.capitalRatio

- Label: Bank capital ratio
- Group: policy
- Unit: share
- Default: 0.08
- Range: 0.04 to 0.2
- Status: sourced
- Source: The default is near the Basel III common-equity floor, applied here to all loans rather than risk-weighted assets.
- Description: Minimum bank equity relative to loans. Lending room is equity divided by this ratio, minus loans already outstanding. A higher ratio leaves less room to lend from the same equity and a thicker cushion when loans are written off. A lower ratio does the opposite. Banks start with extra equity so they have room to lend. Equity at or below zero is recorded as a bank failure. The default is near the Basel III common-equity floor, applied here to every loan rather than to risk-weighted assets.

## bank.depositPassThrough

- Label: Deposit rate pass-through
- Group: policy
- Unit: share
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of the policy rate paid on household deposits. The deposit rate is this fraction times the policy rate. It enters the real return on money that can cut discretionary spending, and banks pay that monthly interest from equity. At 0 deposits pay nothing. It cannot cut the food and housing spending floor.

## bank.reserveRequirement

- Label: Reserve requirement
- Group: policy
- Unit: share
- Default: 0.1
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of deposits that must be backed by central-bank reserves. In the fiat regime, if reserves are short of this share, the central bank creates the gap and credits it to the first bank. That is how fiat base money expands when the requirement binds. Bitcoin and hybrid regimes do not create reserves to meet this number, so the same setting does not expand their base money.

## bitcoin.lendingModel

- Label: Bitcoin lending model
- Group: regime
- Unit: model
- Default: maturityMatched
- Options: maturityMatched, fullReserve
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How much of household deposits can fund loans when the regime is bitcoin or hybrid. Maturity matched treats 25 percent of household deposits as lendable savings. Full reserve treats 10 percent as lendable savings. New credit in those regimes cannot exceed savings minus loans already outstanding, and the loan rate moves toward the gap between loans and that savings stock. In the fiat regime the central bank sets the policy rate and lending room follows bank capital, so this choice does not change the fiat interest-rate rule.

## centralBank.bondPurchaseShare

- Label: Central-bank bond purchase share
- Group: policy
- Unit: share
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of new government bonds bought by creating central-bank reserves in the fiat regime. The rest stay on commercial-bank balance sheets. Bitcoin and hybrid ignore this slider; their base money does not rise with bond finance. At 0 every shortfall is held by the first bank with no new reserves from this channel.

## centralBank.inflationTarget

- Label: Inflation target
- Group: policy
- Unit: 1/year
- Default: 0.02
- Range: 0 to 0.06
- Status: sourced
- Source: A 2 percent annual target is the stated goal of many inflation-targeting central banks.
- Description: Annual CPI inflation the fiat central bank aims for. Fiat prices and wages trend at this rate. When inflation is above the target the policy rate rises, and when inflation is below it the policy rate falls. The default of 0.02 is the 2 percent goal stated by many inflation-targeting central banks. Bitcoin and hybrid regimes do not follow this target. Their price trend is minus baseline productivity growth.

## centralBank.inflationWeight

- Label: Inflation weight
- Group: policy
- Unit: coefficient
- Default: 1.5
- Range: 1 to 3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How hard the fiat policy rate reacts when inflation misses the target. The rule adds this weight times (inflation minus the target), on top of an inflation term that already enters one-for-one. At 1.5, inflation one percentage point above target adds 1.5 points to the policy rate from this term alone. The weight is used only in the fiat regime. The policy rate cannot fall below zero.

## centralBank.outputWeight

- Label: Output weight
- Group: policy
- Unit: coefficient
- Default: 0.5
- Range: 0 to 1.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How hard the fiat policy rate reacts when unemployment is away from the natural rate. The natural rate starts at 6 percent and rises as AI raises capacity. The rule adds this weight times (natural unemployment minus the unemployment rate) times the human share of output. A slack labor market cuts the rate and a tight one raises it. At 0.5 with no AI, unemployment one point below the natural rate adds half a point to the policy rate. Late in adoption the same point gap moves the rate less. Bitcoin and hybrid regimes do not use this weight. The policy rate cannot fall below zero.

## deflation.sensitivity

- Label: Deflation sensitivity
- Group: contracts
- Unit: coefficient
- Default: 1
- Range: 0 to 5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly expected deflation changes credit and housing. Expected deflation is zero when inflation is positive, and the absolute value of inflation when prices are falling. The penalty is this sensitivity times that rate, capped at 0.9. While it is positive, firms repay a slice of their loans each month, housing demand is scaled down by the penalty, and the reported profit-sharing and non-mortgage housing shares rise when tenure choice is off. When tenure choice is on, those housing shares are measured from household tenures instead. At zero, or whenever inflation is positive, the penalty is off, so a fiat run near the inflation target is unchanged.

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
- Default: off
- Options: off, on
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Whether firms install capital only when the expected return clears the real return on money plus a premium. Off keeps the scheduled capital rule and the profit-sharing formula tied to the deflation penalty. On: expected return is baseline productivity growth plus a quarter of the firm markup. The real return on money is the deposit rate minus inflation. If the project clears, capital is installed as before. If it fails, only a quarter of the gap is installed from retained claims and the rest is recorded as profit-sharing finance. Measured profit-sharing share is profit-sharing finance over that plus loan-path finance.

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
- Default: 0
- Range: -0.01 to 0.02
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual growth in the supply of housing. Demand is taken to rise with real income, so the unscaled housing price is ((1 + baseline productivity growth) / (1 + this rate)) raised to t, times one minus the deflation penalty. Housing is about 43 percent of the basket, the December 2024 CPI-U housing share with household energy removed, then rescaled with the other categories. The basket is scaled so the expenditure-weighted average equals the CPI. Expected deflation cuts housing demand through the penalty. A higher housing price relative to the CPI lowers housing security. At zero, housing rises with productivity. A negative rate means the stock shrinks. Set this equal to baseline productivity, and set every category productivity equal to that same baseline, to put every price on the CPI aside from the deflation term.

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

## government.spendingShareOfGDP

- Label: Government spending share
- Group: policy
- Unit: share of GDP
- Default: 0.2
- Range: 0 to 0.5
- Status: calibrated
- Source: Set so public purchases are a fifth of the income base and the goods market clears. Not a country estimate.
- Description: Share of household smoothed income that the government buys from firms. It shops first at the firms holding the most inventory. Households spend what remains: their spending share of income starts at one minus this value, then tilts with how impatient they are relative to the mean. Raising this share shifts purchases from households to the government. If tax revenue does not cover the bill, the treasury issues bonds. It is a closed-economy purchase share, set so the goods market can clear, not an estimate for a particular country.

## government.stabilizer

- Label: Fiscal stabilizer
- Group: policy
- Unit: coefficient
- Default: 0
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How much government goods spending responds to unemployment. Under fiat, the spending share rises by this coefficient times the gap of unemployment above the natural rate, capped at 0.8. Under bitcoin or hybrid, spending cannot exceed tax deposits plus bonds banks can hold from unused savings, so the stabilizer cannot expand base money. At 0 the spending share stays at the government spending slider.

## government.ubiShare

- Label: UBI share of AI GDP
- Group: policy
- Unit: share
- Default: 0.25
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Fraction of the AI slice of monthly nominal GDP paid equally to every household. The AI slice is the AI share of output times price times real GDP. The grant starts at zero when no AI capacity is adopted and rises with that share, so it phases in along the adoption curve rather than as a fixed stipend. At 0.25 with an AI share of 0.36, about 9 percent of that month’s nominal GDP is paid out. Tax, including tax on AI agents, is collected first. If the treasury cannot cover the grant, it issues bonds to the first bank. Households only receive the grant. Agents do not. At 0 the grant is off even while AI is adopted.

## household.inflationTimePreference

- Label: Inflation time-preference response
- Group: behavior
- Unit: coefficient
- Default: 0.1
- Range: 0 to 0.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly inflation above the regime normal path raises the goods spending share. The gap is year-over-year inflation minus the inflation target under fiat, or minus productivity growth under bitcoin and hybrid. The share rises by this coefficient times the gap. At 0.1, ten percentage points of inflation above the path raises the share by one percentage point. The response is small because value can sit in assets other than goods, so only a leak into consumption shows up here. At 0 the spending share ignores inflation. The fiat policy rate still uses the mean time-preference slider alone.

## household.realReturnSensitivity

- Label: Real-return spending sensitivity
- Group: behavior
- Unit: coefficient
- Default: 0
- Range: 0 to 5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly a positive real return on money cuts discretionary goods spending. The real return is the deposit rate minus year-over-year inflation. Deposits pay nothing until the deposit pass-through slider is raised, so under deflation the return equals the absolute inflation rate. The household budget from income and deposits is split into a food and housing floor, about 58 percent of the basket, and a discretionary remainder. Only the remainder shrinks: it is multiplied by max(0, 1 − this sensitivity × the real return). The floor is still bought. At 0 the whole budget is unchanged. Credit-financed discretionary spending is a later mechanism.

## household.skillSigma

- Label: Skill dispersion
- Group: behavior
- Unit: log points
- Default: 0.5
- Range: 0.1 to 1.2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Spread of innate earning power, as the standard deviation of a lognormal skill draw. Draws are kept between 0.2 and 5, then divided by their average so mean skill is 1. A worker is paid the firm wage times skill. Starting deposits scale with skill squared, about three years of the base wage for a skill of 1, so wealth begins more unequal than pay. Profits are shared with weights of skill raised to 1.5 or more, which concentrates capital income on high-skill households. A larger value thickens the high-skill tail.

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

## household.trustInBanks

- Label: Trust in banks
- Group: behavior
- Unit: share
- Default: 0.9
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Intended share of households willing to keep money in bank deposits rather than cash. The economy does not read this slider. Moving it does not change deposits, lending, or prices. It is stored with the scenario so the assumption stays visible.

## housing.consumerCreditLimit

- Label: Consumer credit limit
- Group: contracts
- Unit: share of income
- Default: 0.2
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Maximum consumer loan stock as a share of monthly income when tenure choice is on. New borrowing each month is that headroom times one minus the deflation penalty, and it cannot exceed bank lending room. The loan funds discretionary spending only. At 0, no consumer credit is issued. Unused when tenure choice is off.

## housing.mortgageLtv

- Label: Mortgage loan-to-value
- Group: contracts
- Unit: share
- Default: 0.8
- Range: 0.5 to 0.95
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Maximum loan as a share of the home price when tenure choice is on. The home price is 48 months of the household’s income. A higher ratio lets more of the purchase be debt. Unused when tenure choice is off.

## housing.mortgageTermYears

- Label: Mortgage term
- Group: contracts
- Unit: years
- Default: 30
- Range: 5 to 40
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Length of a new nominal mortgage when tenure choice is on. The monthly payment is the principal divided by the term in months. A longer term lowers the monthly payment and raises the expected real burden under deflation, because the debt is outstanding longer. Unused when tenure choice is off.

## housing.tenureChoice

- Label: Housing tenure choice
- Group: contracts
- Unit: mode
- Default: off
- Options: off, on
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Whether households choose rent, a nominal mortgage, or cash ownership. Off keeps the penalty formulas for non-mortgage housing and property turnover, and households hold no mortgages or consumer loans. On: each household picks the tenure with the lowest expected real burden. Expected deflation raises the mortgage burden, so fewer new mortgages are taken. Shelter stays inside the food and housing spending floor. Consumer loans fund only discretionary spending above that floor and fall as the deflation penalty rises, down to zero. Household loans count in total credit and the bank capital rule.

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
- Default: 0
- Range: 0 to 3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly the hiring quota responds when the real wage is away from its cost reference. The quota starts at 94 percent of households times the human share of output. The reference real wage is 1 / (1 + firm markup), the opening real wage. The quota is multiplied by clamp(1 − this elasticity × (real wage / reference − 1), 0.5, 1.25). A high real wage relative to the reference cuts hiring; a cheap real wage raises it. At 0 the quota is unchanged, so sticky wages change pay but not employment. When the scaled quota is below current employment, firms separate workers down to the quota.

## population.growth

- Label: Population growth
- Group: environment
- Unit: 1/year
- Default: 0.005
- Range: -0.01 to 0.02
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Intended annual change in the number of people. The economy does not apply it. The household count stays at the Households slider for the whole run, and unemployment is measured against that fixed population. The value is stored with the scenario so the assumption stays visible.

## prices.trendWeight

- Label: Price trend weight
- Group: behavior
- Unit: share
- Default: 1
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of monthly price growth that follows the regime price trend. The rest follows excess demand: desired goods spending this month relative to nominal capacity, minus one. Monthly growth is this weight times the trend plus one minus this weight times excess demand, plus the small cost nudge and shock tilt, then capped. At 1 the posted-price rule is unchanged and the fiat inflation target or bitcoin productivity trend still writes the path. At 0 prices move only with excess demand, so a shortfall can pull the CPI down even when the regime trend is positive.

## production.alpha

- Label: Capital elasticity
- Group: behavior
- Unit: share
- Default: 0.33
- Range: 0.2 to 0.5
- Status: sourced
- Source: A capital elasticity near one third matches the usual Cobb–Douglas capital share.
- Description: Exponent on capital in the Cobb–Douglas production function. Capacity is productivity times capital raised to this power times labor raised to one minus this power. A higher value means output responds more to capital and less to employment. Capital starts equal to employment at that firm and depreciates at 0.5 percent a month. The default near one third matches the usual capital share of income.

## productivity.baseGrowth

- Label: Baseline productivity growth
- Group: environment
- Unit: 1/year
- Default: 0.01
- Range: 0 to 0.04
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual growth of economy-wide productivity before the AI channels. It compounds into productive capacity and into wage growth. Under bitcoin or hybrid money the price trend is the negative of this rate, because the money stock does not grow with output, so the CPI tends to fall as goods get easier to make. Category prices are measured against this baseline. Match a category productivity, or housing supply growth, to it and that unscaled price stays flat against the baseline. Set every one of them equal to it to put every price on the CPI.

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
- Default: 3
- Range: 1 to 10
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Number of commercial banks. The run rounds this to a whole number. Households and firms are assigned to banks in turn, by id. Lending room, reserves, and failures are tracked per bank. In the fiat regime, newly created reserves and government bonds are booked at the first bank.

## scale.firms

- Label: Firms
- Group: scale
- Unit: agents
- Default: 100
- Range: 4 to 500
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Number of firms. The run rounds this to a whole number and keeps it fixed. Each firm produces, sets a price, hires, and invests on its own. More firms mean a thinner workforce at each firm and more sellers for a shopper to land on.

## scale.households

- Label: Households
- Group: scale
- Unit: agents
- Default: 1000
- Range: 20 to 10000
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Number of household agents. The run rounds this to a whole number and keeps it fixed; population growth does not add people. Skill, patience, and job search are drawn once per household from the seed, so a larger population makes averages smoother and a run slower. Development runs use about 1,000 households. The release target is 10,000.

## shock.frequency

- Label: Shock frequency
- Group: environment
- Unit: 1/year
- Default: 0.1
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Chance that a new macroeconomic shock starts at a yearly check. Checks begin in month 24 and repeat every 12 months, and a check is skipped while a shock is already running. A value of 0.1 is a 10 percent chance on an idle check. A value of 1 starts a shock whenever the previous one has finished. A value of 0 turns the channel off. Each shock is credit, demand, or productivity with equal chance, and it lasts 24 months: 12 of expansion, then 12 of contraction.

## shock.size

- Label: Shock size
- Group: environment
- Unit: share
- Default: 0.05
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Size of a shock while it is active, as a share. A demand shock adds this share to spending and hiring during the expansion year and subtracts half of it during the contraction. Hiring from that shock stays inside a band around the usual employment target, so unemployment may move less than the size suggests. A productivity shock multiplies capacity by one plus this share while it expands, and it slows price growth. A credit shock widens lending during the expansion, writes off 10 percent of firm loans at the turning point, and tightens lending during the contraction.

## tax.incomeRate

- Label: Income tax rate
- Group: policy
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
- Description: Share of nominal firm loans, mortgages, and consumer loans written off at the conversion month of a transition. At 0 debts convert one-for-one with deposits. Unused when the transition length is 0.

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
- Description: Months of a one-time fiat-to-bitcoin rebase. At 0 there is no transition and regime.type selects a steady rule set. A positive length starts the run on fiat rules (with satoshi balances so holdings can be reassigned), and at the last transition month debts may be haircut, deposits are reassigned by holder concentration, government bonds on bank books are cleared, and the active regime becomes bitcoin. Monetization stays off afterward.

## wage.nominalRigidity

- Label: Nominal wage rigidity
- Group: behavior
- Unit: share
- Default: 0.7
- Range: 0 to 0.95
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How sticky the money wage is when unemployment is away from the natural rate. The natural rate starts at 6 percent and rises as AI raises capacity, because the hiring target shrinks with the human share of output. Wages still follow monthly inflation and productivity growth. An extra gap opens when the labor market is tight or slack relative to that natural rate, the gap is scaled by the human share of output, and this rigidity shrinks it further. Upward pressure is multiplied by one minus the rigidity. Downward pressure is multiplied by the square of that remainder, so cuts pass through less than raises. At 0.7, a tight market passes through 30 percent of the upward gap and 9 percent of a downward gap. At 0, the gap passes through in full. The monthly wage change is still capped.

## welfare.housingSecurityWeight

- Label: Housing security weight
- Group: welfare
- Unit: coefficient
- Default: 0.5
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How much housing security adds to human well-being. Well-being is the log of real consumption, floored at 0.01, plus this weight times housing security. Security is real income relative to the median, divided by one plus the housing price relative to the CPI, and kept between 0 and 1. A higher weight makes income gaps and housing prices matter more on the well-being chart. It does not change what anyone earns, buys, or borrows. AI agents are left out of well-being.

## welfare.weightInequality

- Label: Inequality weight
- Group: welfare
- Unit: weight
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Weight on equality in the optional composite index shown in the assumption ledger. The term is this weight times (1 minus the wealth Gini) at the last tick, so a lower Gini scores higher. The index is computed in the page after the run. Moving the weight does not change prices, jobs, or wealth inside the simulation. The index stays off while every composite weight is zero. The four weights are not on a common scale: a wealth or well-being level can dwarf a Gini term.

## welfare.weightMedianWealth

- Label: Median wealth weight
- Group: welfare
- Unit: weight
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Weight on median real wealth in the optional composite index. The term is this weight times median real wealth at the last tick. That level is a large number next to a Gini or an unemployment rate, so a small weight can dominate the index. The index is computed in the page after the run and does not change wealth inside the simulation. The index stays off while every composite weight is zero.

## welfare.weightStability

- Label: Stability weight
- Group: welfare
- Unit: weight
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Weight on labor-market stability in the optional composite index. The term is this weight times a score of slack relative to the natural unemployment rate, shifted so a 6 percent natural rate still scores as one minus unemployment. As AI raises the natural rate, resting at that rate scores like full employment rather than a collapse. The index is computed in the page after the run. The weight does not change hiring. The index stays off while every composite weight is zero.

## welfare.weightWellbeing

- Label: Well-being weight
- Group: welfare
- Unit: weight
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Weight on mean human well-being in the optional composite index. The term is this weight times mean well-being at the last tick. Well-being itself already includes consumption and housing security. This weight only changes how that result is scored in the index, which the page computes after the run. The index stays off while every composite weight is zero.
