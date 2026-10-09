# Limits

The simulation is a small closed economy with one consumption basket. Category prices split that basket into food and
beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics. They are an
accounting split. Households do not shop in separate markets, and a category's productivity slider does not change how
many goods are made.

There is no international trade and no second goods price. Fiat, bitcoin, and hybrid are alternative units for the
same economy, not countries trading with each other. A positive `transition.lengthMonths` changes one closed economy
from fiat rules into bitcoin. With `transition.gradualWeight` at 0 that change is a rebase on the last month. With a
positive weight, deposits and debts convert into a bitcoin balance month by month and goods can be paid from either
balance. It is not a model of the United States converting.

There is no market for firm shares. When `housing.tenureChoice` is off, the model reports a higher profit-sharing share
and a higher non-mortgage housing share as functions of the deflation penalty. Those figures change how profits are
weighted and how property turnover is scored. They are not a stock exchange, a mortgage menu, or a cooperative that
agents join. When tenure choice is on, households open near the 2026 U.S. mix, about 65.5 percent owners, and non-mortgage housing
and property turnover are measured from household tenures, mortgages, and tenure changes. The opening mix is a
calibration, not a share the monthly cost comparison produces on its own. Shelter remains inside the food and housing spending floor. Consumer credit funds only
discretionary spending.

Well-being is the log of human real consumption plus 0.5 times housing security. Housing security is real income
relative to the median, divided by one plus the housing price relative to the CPI, and kept between 0 and 1. There is no
composite index.

Population growth defaults to 0, so the household count stays at the Households slider. A positive rate adds people;
a negative rate removes them. Housing demand grows with productivity and is cut by the deflation penalty. Unemployment
is pulled toward a natural rate that starts at 6 percent and rises with the AI share of output, because the hiring
target shrinks with the human share. A shock that would raise unemployment in a search model may move it less here once
that natural rate has risen. The hypothesis runner records that outcome instead of forcing the claim. The household UBI
grant is a share of the AI slice of nominal GDP; it is an assumption, and a high share can expand public debt through
bond finance.

The AI block is a single automatable-share path with a bullishness scale and a later robotics ramp. It does not split
knowledge workers from other occupations, does not have a separate cognitive wage, and does not carry an ideas stock
that feeds back into automation. Korinek et al. 2026 stop before robots and before 2030 for that reason. Here the
physical-task block begins to lift at `ai.roboticsStartYear` (default 20, about 2046 when month 0 is read as late 2026)
and falls to zero across `ai.roboticsRampYears` (default 16). The core does not read the calendar, so opening the page
in another year moves the chart labels and does not move the ramp. Bullishness defaults to 0 (Modest); above 1 the task
gain compounds without a ceiling, and that path is a scenario assumption, not a forecast. Wages and the regime price
trend still follow baseline productivity growth, so a very high setting pulls real output away from the wage bill.

Expected deflation can cut only discretionary goods spending above the food and housing floor. That floor is the sum of
the food and housing CPI weights. Credit-financed discretionary spending is a later mechanism. When `prices.trendWeight`
is below 1, the fiat inflation target no longer fully writes the price path.

An empty slider map still grows fiat broad money at `centralBank.moneyGrowth` default 1. The weight cannot be 0; the
floor is 0.05. Crisis stimulus defaults to 1 with a six-month lag and also cannot be 0. The web app opens on the monetary comparison overrides (`prices.trendWeight` 0.8, `production.demandWeight` 1,
deposit pass-through 1, real-return sensitivity 1, bond rate 0.02, anchored expectations, tenure choice on, 12 months of
opening deposits) so spending can move prices and output, discretionary spending responds to the real return on money,
and treasury debt pays a coupon. Those thin balances sit under the 48-month spending buffer, so the new money is blended
into smoothed income and spent; scarce categories can rise while apparel and electronics cheapen.
`scenarios/baseline.json` stays empty for CLI regression.

Development runs of 4,000 households, 200 firms, and 4 banks finish in about 7 seconds in Node for 600 ticks. Sweeps in
the CLI run in this process at a small scale. A 50-seed development sweep is a manual command, not part of the default
test suite.
