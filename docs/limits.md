# Limits

The simulation is a small closed economy with one consumption basket. Category prices split that basket into food and beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics. They are an accounting split. Households do not shop in separate markets, and a category's productivity slider does not change how many goods are made.

There is no international trade and no second currency price. Fiat, bitcoin, and hybrid are alternative units for the same economy, not countries trading with each other. A positive `transition.lengthMonths` rebases one closed economy from fiat rules into bitcoin; it is not a model of the United States converting, and it does not introduce a second goods price.

There is no market for firm shares. When `housing.tenureChoice` is off, the model reports a higher profit-sharing share and a higher non-mortgage housing share as functions of the deflation penalty. Those figures change how profits are weighted and how property turnover is scored. They are not a stock exchange, a mortgage menu, or a cooperative that agents join. When tenure choice is on, non-mortgage housing and property turnover are measured from household tenures, mortgages, and tenure changes. Shelter remains inside the food and housing spending floor. Consumer credit funds only discretionary spending.

Well-being is the log of human real consumption plus a housing-security term. A single composite index appears only when a welfare weight is moved off zero. Those weights are assumptions. The default weights are zero, so the index is off.

Population growth is a slider and is not used. Housing demand grows with productivity and is cut by the deflation penalty. Unemployment is pulled toward a natural rate that starts at 6 percent and rises with the AI share of output, because the hiring target shrinks with the human share. A shock that would raise unemployment in a search model may move it less here once that natural rate has risen. The hypothesis runner records that outcome instead of forcing the claim. The household UBI grant is a share of the AI slice of nominal GDP; it is an assumption, and a high share can expand public debt through bond finance.

Expected deflation can cut only discretionary goods spending above the food and housing floor. That floor is the sum of the food and housing CPI weights. Credit-financed discretionary spending is a later mechanism. When `prices.trendWeight` is below 1, the fiat inflation target no longer fully writes the price path.

Development runs of 1,000 households finish in about a second in Node, a little over the one-second target. Sweeps in the CLI run in this process at a small scale. A 50-seed development sweep is a manual command, not part of the default test suite.
