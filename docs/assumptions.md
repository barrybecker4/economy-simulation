# Assumptions

Generated from the slider registry. Do not edit by hand.

Regenerate with `pnpm sim assumptions --out docs/assumptions.md`.

Registry version: 2.

## ai.adoptionMidpointYear

- Label: AI adoption midpoint
- Group: ai
- Unit: years
- Default: 15
- Range: 3 to 40
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Year at which AI adoption is halfway from the start share to the end share.

## ai.adoptionSteepness

- Label: AI adoption steepness
- Group: ai
- Unit: 1/year
- Default: 0.4
- Range: 0.1 to 1.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How quickly the automatable share moves through its S-curve.

## ai.agentAutonomyShareEnd

- Label: AI agent autonomy share
- Group: ai
- Unit: share
- Default: 0.5
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of agents that eventually transact on their own account.

## ai.automatableShareEnd

- Label: Final automatable share
- Group: ai
- Unit: share
- Default: 0.9
- Range: 0.3 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of tasks software can do after the adoption curve finishes.

## ai.automatableShareStart

- Label: Initial automatable share
- Group: ai
- Unit: share
- Default: 0.1
- Range: 0 to 0.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of tasks software can do at the start of a run.

## ai.computeCostDeclineRate

- Label: Compute cost decline
- Group: ai
- Unit: 1/year
- Default: 0.3
- Range: 0 to 0.6
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual rate at which the cost of AI compute falls.

## ai.ownershipConcentration

- Label: AI ownership concentration
- Group: ai
- Unit: share
- Default: 0.8
- Range: 0.1 to 0.99
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How concentrated ownership of AI capital is across humans.

## ai.paymentFrictionBitcoin

- Label: Bitcoin payment friction
- Group: ai
- Unit: share per transaction
- Default: 0.005
- Range: 0 to 0.1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Fee on an AI-agent payment in the bitcoin regime.

## ai.paymentFrictionFiat

- Label: Fiat payment friction
- Group: ai
- Unit: share per transaction
- Default: 0.02
- Range: 0 to 0.1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Fee on an AI-agent payment in the fiat regime.

## ai.physicalTaskShare

- Label: Physical task share
- Group: ai
- Unit: share
- Default: 0.3
- Range: 0 to 0.7
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of tasks that software cannot automate.

## bank.capitalRatio

- Label: Bank capital ratio
- Group: policy
- Unit: share
- Default: 0.08
- Range: 0.04 to 0.2
- Status: sourced
- Source: The default is near the Basel III common-equity floor, applied here to all loans rather than risk-weighted assets.
- Description: Minimum capital relative to assets.

## bank.reserveRequirement

- Label: Reserve requirement
- Group: policy
- Unit: share
- Default: 0.1
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of deposits a bank must hold as reserves.

## bitcoin.lendingModel

- Label: Bitcoin lending model
- Group: regime
- Unit: model
- Default: maturityMatched
- Options: maturityMatched, fullReserve
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Whether bitcoin-regime loans are maturity-matched or full reserve.

## centralBank.inflationTarget

- Label: Inflation target
- Group: policy
- Unit: 1/year
- Default: 0.02
- Range: 0 to 0.06
- Status: sourced
- Source: A 2 percent annual target is the stated goal of many inflation-targeting central banks.
- Description: Annual inflation rate the fiat central bank aims for.

## centralBank.inflationWeight

- Label: Inflation weight
- Group: policy
- Unit: coefficient
- Default: 1.5
- Range: 1 to 3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Weight on the inflation gap in the fiat policy-rate rule.

## centralBank.outputWeight

- Label: Output weight
- Group: policy
- Unit: coefficient
- Default: 0.5
- Range: 0 to 1.5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Weight on the output gap in the fiat policy-rate rule.

## deflation.sensitivity

- Label: Deflation sensitivity
- Group: contracts
- Unit: coefficient
- Default: 1
- Range: 0 to 5
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How strongly expected deflation reduces lending, borrowing, and speculation.

## firm.markup

- Label: Firm markup
- Group: behavior
- Unit: share of cost
- Default: 0.2
- Range: 0.05 to 0.6
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Price markup over unit cost before inventory adjustment.

## firm.priceAdjustSpeed

- Label: Price adjustment speed
- Group: behavior
- Unit: share per tick
- Default: 0.3
- Range: 0.05 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How fast a firm moves its price when inventories are high or low.

## goods.beachfrontSupplyGrowth

- Label: Beachfront supply growth
- Group: goods
- Unit: 1/year
- Default: 0
- Range: -0.01 to 0.02
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual change in the supply of scarce property.

## goods.electronicsProductivity

- Label: Electronics productivity growth
- Group: goods
- Unit: 1/year
- Default: 0.08
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth of electronics-like goods.

## goods.sampleSize

- Label: Shops sampled
- Group: behavior
- Unit: firms
- Default: 4
- Range: 1 to 12
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How many firms a household compares when buying goods.

## government.spendingShareOfGDP

- Label: Government spending share
- Group: policy
- Unit: share of GDP
- Default: 0.2
- Range: 0 to 0.5
- Status: calibrated
- Source: Set so public purchases are a fifth of the income base and the goods market clears. Not a country estimate.
- Description: Government spending as a share of GDP.

## household.skillSigma

- Label: Skill dispersion
- Group: behavior
- Unit: log points
- Default: 0.5
- Range: 0.1 to 1.2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Spread of the lognormal distribution of household skill.

## household.timePreferenceMean

- Label: Mean time preference
- Group: behavior
- Unit: 1/year
- Default: 0.04
- Range: 0.01 to 0.15
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Average annual rate at which households discount future consumption.

## household.timePreferenceStd

- Label: Time preference spread
- Group: behavior
- Unit: 1/year
- Default: 0.02
- Range: 0 to 0.08
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Standard deviation of household time preference.

## household.trustInBanks

- Label: Trust in banks
- Group: behavior
- Unit: share
- Default: 0.9
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Share of households willing to hold bank deposits.

## labor.maxApplications

- Label: Job applications
- Group: behavior
- Unit: applications per tick
- Default: 3
- Range: 1 to 8
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How many firms an unemployed household can approach in one month.

## population.growth

- Label: Population growth
- Group: environment
- Unit: 1/year
- Default: 0.005
- Range: -0.01 to 0.02
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual change in the human population.

## production.alpha

- Label: Capital elasticity
- Group: behavior
- Unit: share
- Default: 0.33
- Range: 0.2 to 0.5
- Status: sourced
- Source: A capital elasticity near one third matches the usual Cobb–Douglas capital share.
- Description: Exponent on capital in the production function.

## productivity.baseGrowth

- Label: Baseline productivity growth
- Group: environment
- Unit: 1/year
- Default: 0.01
- Range: 0 to 0.04
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Annual productivity growth before the AI channels.

## regime.type

- Label: Monetary regime
- Group: regime
- Unit: regime
- Default: fiat
- Options: fiat, bitcoin, hybrid
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Rule set for base money, lending, and government finance.

## scale.banks

- Label: Banks
- Group: scale
- Unit: agents
- Default: 3
- Range: 1 to 10
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Number of commercial banks in the run.

## scale.firms

- Label: Firms
- Group: scale
- Unit: agents
- Default: 100
- Range: 4 to 500
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Number of firm agents in the run.

## scale.households

- Label: Households
- Group: scale
- Unit: agents
- Default: 1000
- Range: 20 to 10000
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Number of household agents in the run.

## shock.frequency

- Label: Shock frequency
- Group: environment
- Unit: 1/year
- Default: 0.1
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Expected number of macroeconomic shocks per year.

## shock.size

- Label: Shock size
- Group: environment
- Unit: share
- Default: 0.05
- Range: 0 to 0.3
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Typical size of a productivity, demand, or credit shock.

## tax.incomeRate

- Label: Income tax rate
- Group: policy
- Unit: share
- Default: 0.2
- Range: 0 to 0.5
- Status: calibrated
- Source: Set equal to the spending share so the treasury starts near balance.
- Description: Share of income collected as tax.

## wage.nominalRigidity

- Label: Nominal wage rigidity
- Group: behavior
- Unit: share
- Default: 0.7
- Range: 0 to 0.95
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: How slowly wages move toward the target, especially downward.

## welfare.housingSecurityWeight

- Label: Housing security weight
- Group: welfare
- Unit: coefficient
- Default: 0.5
- Range: 0 to 2
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Weight of housing security in human well-being.

## welfare.weightInequality

- Label: Inequality weight
- Group: welfare
- Unit: weight
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Optional composite weight on equality. Zero leaves the composite off.

## welfare.weightMedianWealth

- Label: Median wealth weight
- Group: welfare
- Unit: weight
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Optional composite weight on median wealth.

## welfare.weightStability

- Label: Stability weight
- Group: welfare
- Unit: weight
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Optional composite weight on macroeconomic stability.

## welfare.weightWellbeing

- Label: Well-being weight
- Group: welfare
- Unit: weight
- Default: 0
- Range: 0 to 1
- Status: guess
- Source: Modeling guess. No external series was fitted. See docs/limits.md.
- Description: Optional composite weight on median well-being.
