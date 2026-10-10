# Limits

The simulation is a small closed economy with one consumption basket. Category prices split that basket into food and
beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics. They are an
accounting split. Households do not shop in separate markets, and a category's productivity slider does not change how
many goods are made.

There is no international trade and no second goods price. Fiat, bitcoin, and hybrid are alternative units for the
same economy, not countries trading with each other. A positive `transition.lengthMonths` changes one closed economy
from fiat rules into bitcoin. With `transition.gradualWeight` at 0 that change is a rebase on the last month. With a
positive weight, deposits and debts convert into a bitcoin balance month by month and goods can be paid from either
balance. The run keeps satoshi balances from the first month so the ledger unit does not change mid-run. It is not a
model of the United States converting.

There is no trade in firm shares. When `equity.marketOn` is on, the default, household wealth includes a claim on firm
capital split by the same skill weights as profits. Those claims are not traded and do not move deposits. When the
switch is off, wealth is deposits only. When `housing.tenureChoice` is off, non-mortgage housing and property turnover
are scores of the deflation penalty, not a mortgage book. Profit weights follow skill, and they concentrate further as
AI capacity rises. The reported profit-sharing share follows the deflation penalty only when the investment hurdle is
off. When the hurdle is on, the default, that share is the portion of capital installation that did not clear the
hurdle. When tenure choice is on, households open near the 2026 U.S. mix, about 65.5 percent owners, and non-mortgage
housing and property turnover are measured from household tenures, mortgages, and tenure changes. The opening mix is a
calibration, not a share the monthly cost comparison produces on its own. Shelter remains inside the food and housing
spending floor. Consumer credit funds only discretionary spending.

Well-being is the log of human real consumption plus 0.5 times housing security. Housing security is real income
relative to the median, divided by one plus the housing price relative to the CPI, and kept between 0 and 1. There is no
composite index.

Population growth defaults to 0.5 percent a year, so the household count rises from the Households slider. At 0 the
count stays at that slider. A negative rate removes people. Housing demand grows with productivity and is cut by the
deflation penalty. Unemployment is pulled toward a natural rate that starts at 6 percent and rises with the AI share of
output, because the hiring target shrinks with the human share. A shock that would raise unemployment in a search model
may move it less here once that natural rate has risen. The hypothesis runner records that outcome instead of forcing
the claim. The household UBI grant is a share of the AI slice of nominal GDP; it is an assumption, and a high share can
expand public debt through bond finance.

The AI block is a single automatable-share path with a bullishness scale and a later robotics ramp. It does not split
knowledge workers from other occupations, does not have a separate cognitive wage, and does not carry an ideas stock
that feeds back into automation. Korinek et al. 2026 stop before robots and before 2030 for that reason. Here the
physical-task block begins to lift at `ai.roboticsStartYear` (default 15, about 2041 when month 0 is read as late 2026)
and falls to zero across `ai.roboticsRampYears` (default 12). At those defaults the block is intact through year 15 and
gone by year 27. The core does not read the calendar, so opening the page in another year moves the chart labels and
does not move the ramp. Bullishness defaults to 0.35, which is the Modest preset. At 0 the task gain is the
internet-sized floor. Below 1 the gain saturates with the adoption curve. Above 1 the task gain compounds without a
ceiling, and that path is a scenario assumption, not a forecast. Wages and the regime price trend still follow baseline
productivity growth, so a very high setting pulls real output away from the wage bill.

Expected deflation can cut only discretionary goods spending above the food and housing floor. That floor is the sum of
the food and housing CPI weights, about 58 percent of the basket. Consumer credit, when tenure choice is on, adds to
discretionary spending above that floor and does not pay the floor itself. When `prices.trendWeight` is below 1, the
fiat inflation target no longer fully writes the price path. The default weight is 0.75, so excess demand writes the
other quarter.

An empty slider map still grows fiat broad money at `centralBank.moneyGrowth` default 1. The weight cannot be 0; the
floor is 0.05. Crisis stimulus defaults to 1.75 with a three-month lag and can be set to 0. Zombie support defaults to
0; when positive it is a cap on skipped firm replacements from the stimulus budget and does not move deposits. The web
app opens on the registry defaults, for 120 ticks. It does not apply a separate monetary-comparison override set. Price trend weight
is 0.75, demand weight on output is 0.5, deposit pass-through is 0.45, real-return sensitivity is 0.8, the bond coupon
is 4 percent, and the inflation anchor is 0.65. Tenure choice is on. Opening deposits are 18 months of the skill-scaled
wage, under the 48-month spending buffer, so that opening stock is not spent as excess cash. Because the trend weight
is below 1, new fiat is blended into smoothed income at `centralBank.spendNewMoney`, default one half, or by more when
deposits sit further under the buffer. Apparel and electronics productivity sit above baseline, so those category
prices fall relative to the CPI, while housing supply growth sits under population growth and that category can rise.
`scenarios/baseline.json` stays empty for CLI regression.

Money-choice shares only move the currency-share chart and the exchange rates. `money.choiceSpeed` defaults to 0. Above
0, the shares of fiat, bitcoin, stablecoin, and CBDC step on the chart and write the bitcoin, stablecoin, and CBDC
rates. Only the bitcoin rate is read again, by goods, wealth, and the transition. Stablecoin and CBDC rates are stored
and scaled on a redenomination, and nothing else reads them. The bitcoin rate also moves with issuance and trust when
`bitcoin.marketPriceWeight` is positive (the default is 0.4), using the bitcoin share, including when choice speed is 0. No goods, labor, credit, tax, or regime rule reads the shares. There is no free-choice hybrid currency: hybrid is
still one unit with a lender of last resort, not a basket that spends in the shares the chart shows.

The AI factor multiplies firm capacity and never enters the agreed wage. Wages follow economy-wide productivity, which
grows at baseline productivity (and a utilization mix when that weight is positive), and the regime price trend does
the same. A high bullishness setting can pull real output away from the wage bill.

The hiring quota is 94 percent of households times the human share of output, so the quota shrinks as AI displacement
rises. The natural unemployment rate is one minus that same human-weighted employment share: it starts at 6 percent and
rises as the quota shrinks. No step creates new jobs to replace the ones the quota drops.

Household AI agents sell compute only while the ask is under 4.2 percent of the wage. The ask is adoption progress
times 4 percent of the wage, marked up by payment friction and by `agent.marketDepth` (default 0.25). Progress does not
fall, so once the ask crosses that cap the agents stop selling for the rest of the run. They may still spend deposits.

Development runs use 4,000 households, 200 firms, and 4 banks. The phase 2 test allows 45 seconds for 600 ticks. Sweeps
in the CLI run in this process at a small scale, 40 households. A 50-seed development sweep is a manual command, not
part of the default test suite.
