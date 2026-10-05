import { PLACEHOLDER_SOURCE } from './limits.js';

export type SliderGroup =
  | 'behavior'
  | 'environment'
  | 'policy'
  | 'regime'
  | 'goods'
  | 'contracts'
  | 'welfare'
  | 'ai'
  | 'scale';

export type SliderStatus = 'sourced' | 'calibrated' | 'guess';

interface SliderBase {
  id: string;
  label: string;
  group: SliderGroup;
  unit: string;
  description: string;
  source: string;
  status: SliderStatus;
}

export interface NumberSlider extends SliderBase {
  kind: 'number';
  default: number;
  min: number;
  max: number;
}

export interface EnumSlider extends SliderBase {
  kind: 'enum';
  default: string;
  options: readonly string[];
}

export type Slider = NumberSlider | EnumSlider;

function numberSlider(
  id: string,
  label: string,
  group: SliderGroup,
  unit: string,
  defaultValue: number,
  min: number,
  max: number,
  description: string,
): NumberSlider {
  return {
    id,
    label,
    group,
    unit,
    kind: 'number',
    default: defaultValue,
    min,
    max,
    description,
    source: PLACEHOLDER_SOURCE,
    status: 'guess',
  };
}

function basketProductivity(
  id: string,
  label: string,
  share: string,
  defaultValue: number,
  note: string,
): NumberSlider {
  return numberSlider(
    id,
    `${label} productivity`,
    'goods',
    '1/year',
    defaultValue,
    0,
    0.3,
    `Annual productivity growth of ${label.toLowerCase()}, used only to split the CPI. After t years the unscaled price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. This category is ${share} of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation, electronics given a small share, and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes this category cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI. ${note}`,
  );
}

function enumSlider(
  id: string,
  label: string,
  group: SliderGroup,
  unit: string,
  defaultValue: string,
  options: readonly string[],
  description: string,
): EnumSlider {
  return {
    id,
    label,
    group,
    unit,
    kind: 'enum',
    default: defaultValue,
    options,
    description,
    source: PLACEHOLDER_SOURCE,
    status: 'guess',
  };
}

const RAW_SLIDERS: readonly Slider[] = [
  numberSlider(
    'household.timePreferenceMean',
    'Mean time preference',
    'behavior',
    '1/year',
    0.04,
    0.01,
    0.15,
    'How impatient households are, on average, as an annual discount rate. Each household draws a rate around this mean, and the draw is kept between 1 and 15 percent a year. Spending depends on whether a household is more or less impatient than this mean, so raising the mean does not raise average spending. In the fiat regime the same number is the neutral real interest rate: the policy rate starts from this value plus inflation. A higher mean lifts the fiat policy rate even when inflation is on target.',
  ),
  numberSlider(
    'household.timePreferenceStd',
    'Time preference spread',
    'behavior',
    '1/year',
    0.02,
    0,
    0.08,
    'How widely patience differs across households. Each household draws a normal rate around the mean time preference, then the draw is kept between 1 and 15 percent a year. A household above the mean spends a larger share of smoothed income; one below the mean saves more. A wider spread fans consumption and deposit balances apart. At zero, every household has the mean rate and no patience draw is used.',
  ),
  numberSlider(
    'household.skillSigma',
    'Skill dispersion',
    'behavior',
    'log points',
    0.5,
    0.1,
    1.2,
    'Spread of innate earning power, as the standard deviation of a lognormal skill draw. Draws are kept between 0.2 and 5, then divided by their average so mean skill is 1. A worker is paid the firm wage times skill. Starting deposits scale with skill squared, about three years of the base wage for a skill of 1, so wealth begins more unequal than pay. Profits are shared with weights of skill raised to 1.5 or more, which concentrates capital income on high-skill households. A larger value thickens the high-skill tail.',
  ),
  numberSlider(
    'household.trustInBanks',
    'Trust in banks',
    'behavior',
    'share',
    0.9,
    0,
    1,
    'Intended share of households willing to keep money in bank deposits rather than cash. The economy does not read this slider. Moving it does not change deposits, lending, or prices. It is stored with the scenario so the assumption stays visible.',
  ),
  numberSlider(
    'firm.markup',
    'Firm markup',
    'behavior',
    'share of cost',
    0.2,
    0.05,
    0.6,
    'How far the target price sits above unit labor cost. The target is unit cost times one plus this markup, times a small inventory adjustment of at most 2 percent. A markup of 0.2 means the target is 20 percent above cost. Posted prices drift toward that target; they do not jump to it. The opening price level is the starting wage times one plus this markup.',
  ),
  numberSlider(
    'firm.priceAdjustSpeed',
    'Price adjustment speed',
    'behavior',
    'share per tick',
    0.3,
    0.05,
    1,
    'How strongly the price is pulled toward the cost target each month. The pull is this speed times 1 percent of the gap between the target and the current price, and it is capped at 0.1 percent a month, so a speed of 1 still cannot reprice faster than that cap. Low inventory raises the target and high inventory lowers it. Raising the speed closes the gap to cost sooner. The inflation trend, set by the regime, is separate from this pull.',
  ),
  numberSlider(
    'wage.nominalRigidity',
    'Nominal wage rigidity',
    'behavior',
    'share',
    0.7,
    0,
    0.95,
    'How sticky the money wage is when unemployment is away from its 6 percent resting point. Wages still follow monthly inflation and productivity growth. An extra gap opens when the labor market is tight or slack, and this rigidity shrinks that gap. Upward pressure is multiplied by one minus the rigidity. Downward pressure is multiplied by the square of that remainder, so cuts pass through less than raises. At 0.7, a tight market passes through 30 percent of the upward gap and 9 percent of a downward gap. At 0, the gap passes through in full. The monthly wage change is still capped.',
  ),
  numberSlider(
    'productivity.baseGrowth',
    'Baseline productivity growth',
    'environment',
    '1/year',
    0.01,
    0,
    0.04,
    'Annual growth of economy-wide productivity before the AI channels. It compounds into productive capacity and into wage growth. Under bitcoin or hybrid money the price trend is the negative of this rate, because the money stock does not grow with output, so the CPI tends to fall as goods get easier to make. Category prices are measured against this baseline. Match a category productivity, or housing supply growth, to it and that unscaled price stays flat against the baseline. Set every one of them equal to it to put every price on the CPI.',
  ),
  numberSlider(
    'population.growth',
    'Population growth',
    'environment',
    '1/year',
    0.005,
    -0.01,
    0.02,
    'Intended annual change in the number of people. The economy does not apply it. The household count stays at the Households slider for the whole run, and unemployment is measured against that fixed population. The value is stored with the scenario so the assumption stays visible.',
  ),
  numberSlider(
    'shock.frequency',
    'Shock frequency',
    'environment',
    '1/year',
    0.1,
    0,
    1,
    'Chance that a new macroeconomic shock starts at a yearly check. Checks begin in month 24 and repeat every 12 months, and a check is skipped while a shock is already running. A value of 0.1 is a 10 percent chance on an idle check. A value of 1 starts a shock whenever the previous one has finished. A value of 0 turns the channel off. Each shock is credit, demand, or productivity with equal chance, and it lasts 24 months: 12 of expansion, then 12 of contraction.',
  ),
  numberSlider(
    'shock.size',
    'Shock size',
    'environment',
    'share',
    0.05,
    0,
    0.3,
    'Size of a shock while it is active, as a share. A demand shock adds this share to spending and hiring during the expansion year and subtracts half of it during the contraction. Hiring from that shock stays inside a band around the usual employment target, so unemployment may move less than the size suggests. A productivity shock multiplies capacity by one plus this share while it expands, and it slows price growth. A credit shock widens lending during the expansion, writes off 10 percent of firm loans at the turning point, and tightens lending during the contraction.',
  ),
  numberSlider(
    'tax.incomeRate',
    'Income tax rate',
    'policy',
    'share',
    0.2,
    0,
    0.5,
    'Share of household income paid to the treasury each month. The household pays from its deposit, up to the balance it has. Revenue lands in the government deposit. The default matches the spending share so the treasury starts near balance. If taxes do not cover government purchases, the treasury issues bonds and the first bank holds them. Changing the tax rate does not by itself change how much the government buys.',
  ),
  numberSlider(
    'government.spendingShareOfGDP',
    'Government spending share',
    'policy',
    'share of GDP',
    0.2,
    0,
    0.5,
    'Share of household smoothed income that the government buys from firms. It shops first at the firms holding the most inventory. Households spend what remains: their spending share of income starts at one minus this value, then tilts with how impatient they are relative to the mean. Raising this share shifts purchases from households to the government. If tax revenue does not cover the bill, the treasury issues bonds. It is a closed-economy purchase share, set so the goods market can clear, not an estimate for a particular country.',
  ),
  numberSlider(
    'centralBank.inflationTarget',
    'Inflation target',
    'policy',
    '1/year',
    0.02,
    0,
    0.06,
    'Annual CPI inflation the fiat central bank aims for. Fiat prices and wages trend at this rate. When inflation is above the target the policy rate rises, and when inflation is below it the policy rate falls. The default of 0.02 is the 2 percent goal stated by many inflation-targeting central banks. Bitcoin and hybrid regimes do not follow this target. Their price trend is minus baseline productivity growth.',
  ),
  numberSlider(
    'centralBank.inflationWeight',
    'Inflation weight',
    'policy',
    'coefficient',
    1.5,
    1,
    3,
    'How hard the fiat policy rate reacts when inflation misses the target. The rule adds this weight times (inflation minus the target), on top of an inflation term that already enters one-for-one. At 1.5, inflation one percentage point above target adds 1.5 points to the policy rate from this term alone. The weight is used only in the fiat regime. The policy rate cannot fall below zero.',
  ),
  numberSlider(
    'centralBank.outputWeight',
    'Output weight',
    'policy',
    'coefficient',
    0.5,
    0,
    1.5,
    'How hard the fiat policy rate reacts when unemployment is away from 6 percent. The rule adds this weight times (6 percent minus the unemployment rate). A slack labor market cuts the rate and a tight one raises it. At 0.5, unemployment one point below 6 percent adds half a point to the policy rate. Bitcoin and hybrid regimes do not use this weight. The policy rate cannot fall below zero.',
  ),
  numberSlider(
    'bank.reserveRequirement',
    'Reserve requirement',
    'policy',
    'share',
    0.1,
    0,
    0.3,
    'Share of deposits that must be backed by central-bank reserves. In the fiat regime, if reserves are short of this share, the central bank creates the gap and credits it to the first bank. That is how fiat base money expands when the requirement binds. Bitcoin and hybrid regimes do not create reserves to meet this number, so the same setting does not expand their base money.',
  ),
  numberSlider(
    'bank.capitalRatio',
    'Bank capital ratio',
    'policy',
    'share',
    0.08,
    0.04,
    0.2,
    'Minimum bank equity relative to loans. Lending room is equity divided by this ratio, minus loans already outstanding. A higher ratio leaves less room to lend from the same equity and a thicker cushion when loans are written off. A lower ratio does the opposite. Banks start with extra equity so they have room to lend. Equity at or below zero is recorded as a bank failure. The default is near the Basel III common-equity floor, applied here to every loan rather than to risk-weighted assets.',
  ),
  enumSlider(
    'regime.type',
    'Monetary regime',
    'regime',
    'regime',
    'fiat',
    ['fiat', 'bitcoin', 'hybrid'],
    'Rule set for base money, interest, and government finance. Fiat prices trend toward the inflation target, the central bank sets the policy rate from inflation and unemployment, and it creates reserves when the reserve requirement binds. Money is integer cents. Bitcoin does not grow the money stock with the economy, so the price trend is minus productivity growth. New loans cannot exceed unused savings, and a government budget shortfall is financed by bonds rather than new central-bank money. Money is satoshis, including fractions of a satoshi. Hybrid uses that same unit and price trend, and it does not target inflation. If a bank equity balance goes negative, the hybrid central bank injects enough reserves and vault cash to make that equity positive. That injection is the only base-money growth in the hybrid regime.',
  ),
  enumSlider(
    'bitcoin.lendingModel',
    'Bitcoin lending model',
    'regime',
    'model',
    'maturityMatched',
    ['maturityMatched', 'fullReserve'],
    'How much of household deposits can fund loans when the regime is bitcoin or hybrid. Maturity matched treats 25 percent of household deposits as lendable savings. Full reserve treats 10 percent as lendable savings. New credit in those regimes cannot exceed savings minus loans already outstanding, and the loan rate moves toward the gap between loans and that savings stock. In the fiat regime the central bank sets the policy rate and lending room follows bank capital, so this choice does not change the fiat interest-rate rule.',
  ),
  numberSlider(
    'goods.electronicsProductivity',
    'Electronics productivity growth',
    'goods',
    '1/year',
    0.08,
    0,
    0.3,
    'Annual productivity growth of electronics, used only to split the CPI. After t years the unscaled electronics price relative to baseline productivity is ((1 + baseline productivity growth) / (1 + this rate)) raised to t. Electronics are about 1 percent of the basket. The shares follow the U.S. CPI-U for December 2024, with energy taken out of housing and transportation and the listed categories rescaled so they sum to one. The basket is then scaled so the expenditure-weighted average equals the CPI. A higher rate makes electronics cheaper relative to the CPI. It does not produce extra goods or open a separate shop. Set every category productivity and housing supply growth equal to baseline productivity to put every price on the CPI.',
  ),
  basketProductivity(
    'goods.foodProductivity',
    'Food and bev',
    'about 15 percent',
    0.01,
    'The default equals baseline productivity.',
  ),
  numberSlider(
    'goods.housingSupplyGrowth',
    'Housing supply growth',
    'goods',
    '1/year',
    0,
    -0.01,
    0.02,
    'Annual growth in the supply of housing. Demand is taken to rise with real income, so the unscaled housing price is ((1 + baseline productivity growth) / (1 + this rate)) raised to t, times one minus the deflation penalty. Housing is about 43 percent of the basket, the December 2024 CPI-U housing share with household energy removed, then rescaled with the other categories. The basket is scaled so the expenditure-weighted average equals the CPI. Expected deflation cuts housing demand through the penalty. A higher housing price relative to the CPI lowers housing security. At zero, housing rises with productivity. A negative rate means the stock shrinks. Set this equal to baseline productivity, and set every category productivity equal to that same baseline, to put every price on the CPI aside from the deflation term.',
  ),
  basketProductivity(
    'goods.energyProductivity',
    'Energy',
    'about 7 percent',
    0.005,
    'The default is below baseline, so energy rises relative to it, and by less than housing.',
  ),
  basketProductivity(
    'goods.apparelProductivity',
    'Apparel',
    'about 3 percent',
    0.04,
    'The default is above baseline, so apparel cheapens.',
  ),
  basketProductivity(
    'goods.transportProductivity',
    'Transportation',
    'about 14 percent',
    0.02,
    'The default is a little above baseline, so transportation cheapens slowly. Motor fuel is in energy, not here.',
  ),
  basketProductivity(
    'goods.medicalProductivity',
    'Medical',
    'about 9 percent',
    0.003,
    'The default is below baseline, so medical care rises relative to it.',
  ),
  basketProductivity(
    'goods.educationProductivity',
    'Education',
    'about 3 percent',
    0.001,
    'The default is just below baseline, so education rises slightly relative to it. Communication is not in this share.',
  ),
  basketProductivity(
    'goods.recreationProductivity',
    'Recreation',
    'about 6 percent',
    0.03,
    'The default is above baseline, so recreation cheapens.',
  ),
  numberSlider(
    'deflation.sensitivity',
    'Deflation sensitivity',
    'contracts',
    'coefficient',
    1,
    0,
    5,
    'How strongly expected deflation changes credit and housing. Expected deflation is zero when inflation is positive, and the absolute value of inflation when prices are falling. The penalty is this sensitivity times that rate, capped at 0.9. While it is positive, firms repay a slice of their loans each month, housing demand is scaled down by the penalty, and the reported profit-sharing and non-mortgage housing shares rise. Those shares are accounting reports. At zero, or whenever inflation is positive, the penalty is off, so a fiat run near the inflation target is unchanged.',
  ),
  numberSlider(
    'welfare.housingSecurityWeight',
    'Housing security weight',
    'welfare',
    'coefficient',
    0.5,
    0,
    2,
    'How much housing security adds to human well-being. Well-being is the log of real consumption, floored at 0.01, plus this weight times housing security. Security is real income relative to the median, divided by one plus the housing price relative to the CPI, and kept between 0 and 1. A higher weight makes income gaps and housing prices matter more on the well-being chart. It does not change what anyone earns, buys, or borrows. AI agents are left out of well-being.',
  ),
  numberSlider(
    'welfare.weightInequality',
    'Inequality weight',
    'welfare',
    'weight',
    0,
    0,
    1,
    'Weight on equality in the optional composite index shown in the assumption ledger. The term is this weight times (1 minus the wealth Gini) at the last tick, so a lower Gini scores higher. The index is computed in the page after the run. Moving the weight does not change prices, jobs, or wealth inside the simulation. The index stays off while every composite weight is zero. The four weights are not on a common scale: a wealth or well-being level can dwarf a Gini term.',
  ),
  numberSlider(
    'welfare.weightMedianWealth',
    'Median wealth weight',
    'welfare',
    'weight',
    0,
    0,
    1,
    'Weight on median real wealth in the optional composite index. The term is this weight times median real wealth at the last tick. That level is a large number next to a Gini or an unemployment rate, so a small weight can dominate the index. The index is computed in the page after the run and does not change wealth inside the simulation. The index stays off while every composite weight is zero.',
  ),
  numberSlider(
    'welfare.weightWellbeing',
    'Well-being weight',
    'welfare',
    'weight',
    0,
    0,
    1,
    'Weight on mean human well-being in the optional composite index. The term is this weight times mean well-being at the last tick. Well-being itself already includes consumption and housing security. This weight only changes how that result is scored in the index, which the page computes after the run. The index stays off while every composite weight is zero.',
  ),
  numberSlider(
    'welfare.weightStability',
    'Stability weight',
    'welfare',
    'weight',
    0,
    0,
    1,
    'Weight on labor-market stability in the optional composite index. The term is this weight times (1 minus unemployment) at the last tick, so lower unemployment scores higher. The index is computed in the page after the run. The weight does not change hiring. The index stays off while every composite weight is zero.',
  ),
  numberSlider(
    'ai.automatableShareStart',
    'Initial automatable share',
    'ai',
    'share',
    0.1,
    0,
    0.5,
    'Share of tasks software can already do in month zero. Adoption follows an S-curve from this share up to the final automatable share. The final share has to be at least this large. If the two shares are equal, the curve stays put, firms do not adopt AI, and production, hiring, and ownership stay on the path with no AI effect.',
  ),
  numberSlider(
    'ai.automatableShareEnd',
    'Final automatable share',
    'ai',
    'share',
    0.9,
    0.3,
    1,
    'Share of tasks software can do once the adoption curve has finished. Only the rise from the starting share can be adopted, and only the non-physical part of that rise adds capacity. While adoption is underway and capacity has actually increased, a household whose skill is below the current automatable share may apply to only one firm a month.',
  ),
  numberSlider(
    'ai.adoptionMidpointYear',
    'AI adoption midpoint',
    'ai',
    'years',
    15,
    3,
    40,
    'Year when the automatable share is halfway from the start share to the end share. An earlier year brings the S-curve forward. The curve is flat, and this year does nothing, when the start and end shares are equal.',
  ),
  numberSlider(
    'ai.adoptionSteepness',
    'AI adoption steepness',
    'ai',
    '1/year',
    0.4,
    0.1,
    1.5,
    'How sharply the automatable share climbs through its S-curve, per year. A higher value bunches the change around the midpoint year. A lower value spreads the same change over more years. It has no effect when the start and end shares are equal.',
  ),
  numberSlider(
    'ai.computeCostDeclineRate',
    'Compute cost decline',
    'ai',
    '1/year',
    0.3,
    0,
    0.6,
    'Annual rate at which AI compute gets cheaper. Cost starts equal to the wage and is multiplied by one minus this rate each year. Firms take up newly automatable tasks only once that cost is below the wage. Any positive rate makes cost fall below the wage after the first year. At zero, cost stays at the wage and this channel adds no capacity.',
  ),
  numberSlider(
    'ai.physicalTaskShare',
    'Physical task share',
    'ai',
    'share',
    0.3,
    0,
    0.7,
    'Share of tasks that software cannot do, such as in-person physical work. Extra capacity from AI is the gain in the automatable share times one minus this share. If the automatable share has risen by 0.2 and this share is 0.3, capacity is about 14 percent higher. At 0, the whole gain becomes capacity. At 1, nothing is automated. Displacement, which limits job search, begins only once capacity has actually increased.',
  ),
  numberSlider(
    'ai.ownershipConcentration',
    'AI ownership concentration',
    'ai',
    'share',
    0.8,
    0.1,
    0.99,
    'How concentrated the gains from AI are across households. Two things use it. Profit shares normally follow skill raised to 1.5; once AI capacity is above normal, that exponent rises by this value times the extra capacity factor, so the same skill gaps claim a larger share of profits. AI agents are also owned by a smaller group: the owner count is the household count times one minus this value. At 0.8, about a fifth of households own the agents. It does not change who is employed.',
  ),
  numberSlider(
    'ai.agentAutonomyShareEnd',
    'AI agent autonomy share',
    'ai',
    'share',
    0.5,
    0,
    1,
    'How many AI agents eventually keep their own accounts, as a share of the household count. The count rises in a straight line from zero to this share over five years. At 0.5 with 1,000 households, the run ends with about 500 agents. Each agent has a human owner, holds a deposit, and sells one unit of compute to a firm when its price, including the payment fee, is cheap relative to the wage. It keeps a small amount for compute and pays the rest to its owner. Human well-being, income, and wealth count households only. At zero, no agents are created and the rest of the economy is unchanged.',
  ),
  numberSlider(
    'ai.paymentFrictionFiat',
    'Fiat payment friction',
    'ai',
    'share per transaction',
    0.02,
    0,
    0.1,
    'Fee on an AI agent sale in the fiat regime, as a share of the payment. The fee is paid into bank equity. The asking price starts at 4 percent of the wage and is marked up by this fee. Firms buy only when the ask is still under 4.2 percent of the wage, so a fee of about 5 percent or more stops the sales. Below that, a higher fee makes the agent a worse deal and can leave the ask uncompetitive. The bitcoin and hybrid regimes use the bitcoin fee instead. The fee does nothing when no autonomous agents are created.',
  ),
  numberSlider(
    'ai.paymentFrictionBitcoin',
    'Bitcoin payment friction',
    'ai',
    'share per transaction',
    0.005,
    0,
    0.1,
    'Fee on an AI agent sale in the bitcoin and hybrid regimes, as a share of the payment. The fee is paid into bank equity. The asking price starts at 4 percent of the wage and is marked up by this fee. Firms buy only when the ask is still under 4.2 percent of the wage, so a fee of about 5 percent or more stops the sales. The default of 0.005 stays well under that cutoff. The fiat regime uses the fiat fee instead. The fee does nothing when no autonomous agents are created.',
  ),
  numberSlider(
    'scale.households',
    'Households',
    'scale',
    'agents',
    1000,
    20,
    10000,
    'Number of household agents. The run rounds this to a whole number and keeps it fixed; population growth does not add people. Skill, patience, and job search are drawn once per household from the seed, so a larger population makes averages smoother and a run slower. Development runs use about 1,000 households. The release target is 10,000.',
  ),
  numberSlider(
    'scale.firms',
    'Firms',
    'scale',
    'agents',
    100,
    4,
    500,
    'Number of firms. The run rounds this to a whole number and keeps it fixed. Each firm produces, sets a price, hires, and invests on its own. More firms mean a thinner workforce at each firm and more sellers for a shopper to land on.',
  ),
  numberSlider(
    'scale.banks',
    'Banks',
    'scale',
    'agents',
    3,
    1,
    10,
    'Number of commercial banks. The run rounds this to a whole number. Households and firms are assigned to banks in turn, by id. Lending room, reserves, and failures are tracked per bank. In the fiat regime, newly created reserves and government bonds are booked at the first bank.',
  ),
  numberSlider(
    'labor.maxApplications',
    'Job applications',
    'behavior',
    'applications per tick',
    3,
    1,
    8,
    'How many firms an unemployed household can ask for work in one month. The run rounds this to a whole number. Hiring fills openings until employment is near 94 percent of households, with a small tilt when a demand shock is on. A searcher walks a short list of firms and takes the first one that still has room. A household displaced by automation is limited to one application even when this slider is higher. More applications make it easier to find a firm that is still hiring. The vacancy rule still pulls unemployment toward 6 percent. This slider only limits how wide the search is.',
  ),
  numberSlider(
    'production.alpha',
    'Capital elasticity',
    'behavior',
    'share',
    0.33,
    0.2,
    0.5,
    'Exponent on capital in the Cobb–Douglas production function. Capacity is productivity times capital raised to this power times labor raised to one minus this power. A higher value means output responds more to capital and less to employment. Capital starts equal to employment at that firm and depreciates at 0.5 percent a month. The default near one third matches the usual capital share of income.',
  ),
  numberSlider(
    'goods.sampleSize',
    'Shops sampled',
    'behavior',
    'firms',
    4,
    1,
    12,
    'How many firms a household can visit while spending its monthly budget. The run rounds this to a whole number. The walk starts at a random firm and continues to the following firms until the budget is spent, the visits run out, or those firms are out of stock. The household buys from the firms on that walk that still have inventory. A larger sample makes a stockout easier to work around. Shoppers do not sort firms by price.',
  ),
];

const ANNOTATIONS: Record<string, Pick<Slider, 'status' | 'source'>> = {
  'centralBank.inflationTarget': {
    status: 'sourced',
    source:
      'A 2 percent annual target is the stated goal of many inflation-targeting central banks.',
  },
  'bank.capitalRatio': {
    status: 'sourced',
    source:
      'The default is near the Basel III common-equity floor, applied here to all loans rather than risk-weighted assets.',
  },
  'production.alpha': {
    status: 'sourced',
    source: 'A capital elasticity near one third matches the usual Cobb–Douglas capital share.',
  },
  'government.spendingShareOfGDP': {
    status: 'calibrated',
    source:
      'Set so public purchases are a fifth of the income base and the goods market clears. Not a country estimate.',
  },
  'tax.incomeRate': {
    status: 'calibrated',
    source: 'Set equal to the spending share so the treasury starts near balance.',
  },
};

export const SLIDERS: readonly Slider[] = RAW_SLIDERS.map((slider) => {
  const note = ANNOTATIONS[slider.id];
  return note ? { ...slider, ...note } : slider;
});

const SLIDER_BY_ID = new Map<string, Slider>(SLIDERS.map((slider) => [slider.id, slider]));

assertRegistry(SLIDERS);

export function listSliders(): readonly Slider[] {
  return SLIDERS;
}

export function getSlider(id: string): Slider {
  const slider = SLIDER_BY_ID.get(id);
  if (!slider) {
    throw new Error(`Unknown slider ${id}`);
  }
  return slider;
}

export function assertSliderValue(id: string, value: number | string): void {
  const slider = getSlider(id);
  if (slider.kind === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${id} must be a finite number`);
    }
    if (value < slider.min || value > slider.max) {
      throw new Error(`${id} must be between ${slider.min} and ${slider.max}`);
    }
    return;
  }
  if (typeof value !== 'string' || !slider.options.includes(value)) {
    throw new Error(`${id} must be one of ${slider.options.join(', ')}`);
  }
}

function assertRegistry(sliders: readonly Slider[]): void {
  const seen = new Set<string>();
  for (const slider of sliders) {
    if (seen.has(slider.id)) {
      throw new Error(`Duplicate slider ${slider.id}`);
    }
    seen.add(slider.id);
    if (slider.kind === 'number') {
      if (slider.min > slider.max || slider.default < slider.min || slider.default > slider.max) {
        throw new Error(`Slider ${slider.id} has a default outside its range`);
      }
    } else if (!slider.options.includes(slider.default)) {
      throw new Error(`Slider ${slider.id} default is not an allowed option`);
    }
  }
}
