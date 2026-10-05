# Limits

The simulation is a small closed economy with one consumption basket. Category prices split that basket into food and beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics. They are an accounting split. Households do not shop in separate markets, and a category's productivity slider does not change how many goods are made.

There is no international trade and no second currency price. Fiat, bitcoin, and hybrid are alternative units for the same economy, not countries trading with each other.

There is no market for firm shares. When expected deflation is strong, the model reports a higher profit-sharing share and a higher non-mortgage housing share. Those figures change how profits are weighted and how property turnover is scored. They are not a stock exchange, a mortgage menu, or a cooperative that agents join.

Well-being is the log of human real consumption plus a housing-security term. A single composite index appears only when a welfare weight is moved off zero. Those weights are assumptions. The default weights are zero, so the index is off.

Population growth is a slider and is not used. Housing demand grows with productivity and is cut by the deflation penalty. Unemployment is pulled toward 6 percent by the vacancy rule, so a shock that would raise unemployment in a search model may not do so here. The hypothesis runner records that outcome instead of forcing the claim.

Development runs of 1,000 households finish in about a second in Node, a little over the one-second target. Sweeps in the CLI run in this process at a small scale. A 50-seed development sweep is a manual command, not part of the default test suite.
