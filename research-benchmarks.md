# Economy-simulation calibration and validation benchmarks

*Compiled 2026-10-08 (PT) by Researcher for the bitcoin-vs-fiat experiment suite (`REPORT.md`, `REPORT-v2.md`).
Model metric names refer to `packages/core/src/metrics/metrics.ts` in `barrybecker4/economy-simulation`.*

**Verification tags** (every figure carries one):
- **[V]** verified: I computed it from the raw series (FRED CSV downloaded 2026-10-08, stored in `/workspace/econ-sim/bench/`) or read it in the source text/table.
- **[S]** from the cited source as summarized by search or secondary transcription; the source is primary, but I did not read the exact table myself.
- **[C]** contested: credible sources disagree.
- **[U]** unverified: no figure given, or explicitly flagged as not checked.

FRED "latest" values are the newest observations available on 2026-10-08.

---

## 1. Main table: metric | real-world range | source

| metric (model metric it validates) | real-world range | source |
|---|---|---|
| **US M2 velocity**, annual rate, nominal GDP / M2 (`velocity` × 12; see §5 for the definition gap) | **1959–1980:** 1.65–1.87 (mean 1.74). **1981–1997:** peak 2.19 (1997Q3). **1997–2007:** 1.90–2.19 (≈1.97–1.99 in 2007). **2008–2019:** 1.43–1.94 (≈1.45 in 2019). **2020 trough:** 1.126 (2020Q2). **Latest:** 1.418 (2026Q2). [V] | [FRED M2V](https://fred.stlouisfed.org/series/M2V) |
| **US wealth Gini**, all households (`giniWealth`) | **≈0.80 for most of the postwar period:** 0.81 (1950), 0.80 (1971), 0.79 (1989), 0.82 (2007), **0.86 (2016)**. [V] | [Kuhn, Schularick & Steins (2020) JPE, Table 3](https://www.journals.uchicago.edu/doi/10.1086/708815) ([working paper PDF](https://www.ineteconomics.org/uploads/general/Wealthinequality_June2018.pdf)) |
| **US wealth shares** (`topDecileWealthShare`, `bottomQuintileWealthShare`) | **Top 10%:** 60.8% (1989Q3) → **68.9% (2026Q2)** (top 1% 32.5% + 90–99th 36.4%). **Bottom 50%:** 3.5% (1989) → 1.7% (2007Q4) → **2.3% (2026Q2)**. [V] The **bottom 20% share is not published** by the DFA. It must be ≤2.3% and is likely near zero or negative because of negative-net-worth households. [U] | [Fed DFA](https://www.federalreserve.gov/releases/z1/dataviz/dfa/index.html); FRED [WFRBST01134](https://fred.stlouisfed.org/series/WFRBST01134), [WFRBSN09161](https://fred.stlouisfed.org/series/WFRBSN09161), [WFRBSB50215](https://fred.stlouisfed.org/series/WFRBSB50215) |
| **US income Gini, pre-tax money income** (Census; includes cash transfers) (`giniIncome`) | **0.348–0.358 (1967–68)** → 0.432 (2007) → **0.452–0.462 (2019–2025)**; 0.460 in 2025. [V] | [FRED GINIALLRF (Census CPS-ASEC)](https://fred.stlouisfed.org/series/GINIALLRF) |
| **US income Gini, pre- vs post-tax and transfers** (CBO) | **2021:** **0.560** before transfers and taxes; **0.443** after transfers and federal taxes (0.468 without the temporary 2021 pandemic measures). [S] | [CBO, *Distribution of Household Income in 2021* (2024)](https://www.cbo.gov/publication/60341) |
| US income Gini, World Bank (alternative basis) | 34.7–35.5 (1979–81); **39.7–41.9 (2018–2024)**. [V] | [FRED SIPOVGINIUSA (World Bank)](https://fred.stlouisfed.org/series/SIPOVGINIUSA) |
| US income Gini, SCF-based (broader income concept) | 0.43 (1971 low) → **0.58 (2016)**. [V] | [Kuhn, Schularick & Steins (2020)](https://www.journals.uchicago.edu/doi/10.1086/708815) |
| **Wage Phillips-curve slope**: pp change in annualized wage inflation per +1 pp unemployment, holding price inflation fixed (the model reports only the correlation in validity test T3; see §5) | **OLS:** −0.29 (1964Q1–2007Q2); **−0.58 (1986Q1–2007Q2)**; **−0.11 (2007Q3–2017Q4)**. **Conditional/IV-style:** −0.55, −0.74, **−0.29** for the same three periods. **Conclusion:** the curve flattened after 2008, but less than OLS suggests. [V] (Minus signs were lost in PDF extraction; the paper text confirms the negative sign.) | [Galí & Gambetti (2019), NBER w25476, Tables 1A/3A](https://www.nber.org/papers/w25476) |
| Price Phillips-curve slope (flattening context) | **κ ≈ 0.0062** (structural slope from state-level nontradeable prices, 1978–2018). Very flat. [S] | [Hazell, Herreño, Nakamura & Steinsson (2022) QJE / NBER w28005](https://www.nber.org/papers/w28005) |
| **Okun's law coefficient**: Δ unemployment (pp) per 1% output gap (`unemployment` vs `realGdp`) | **US ≈ −0.4.** −0.41 (levels, HP λ=100, 1948–2011, R²=0.82); −0.405 (first differences). Halves of the sample: −0.35 / −0.41. Other advanced economies: e.g. Canada −0.43, Denmark −0.43. [V] | [Ball, Leigh & Loungani (2017) JMCB / NBER w18668](https://www.nber.org/papers/w18668) |
| **Unemployment rise in US recessions** (`unemployment`; E4 peak unemployment gap) | **1948–2009 recessions:** pre-recession low to peak **+2.3 to +5.6 pp**. 1990–91 +2.6; 2001 +2.5; 1981–82 +3.6; 1973–75 +4.4; **2007–09 +5.6 (4.4% → 10.0%)**. **2020 pandemic outlier:** +11.3 (3.5% → 14.8%). [V] | [FRED UNRATE](https://fred.stlouisfed.org/series/UNRATE) + [USREC (NBER dates)](https://fred.stlouisfed.org/series/USREC); my calculation |
| Real GDP peak-to-trough in the same recessions (pairs with the row above for an Okun check) | 2007Q4–2009Q2 **−3.8%**; 1973Q4–1975Q1 −3.1%; 2019Q4–2020Q2 −9.1%. [V] | [FRED GDPC1](https://fred.stlouisfed.org/series/GDPC1); my calculation |
| **Unemployment recovery time** (E4 "months with gap > 1 pp") | **Speed:** after the peak, unemployment falls at a steady **≈0.1 log points per year** (≈10% of its level per year), in every postwar recovery. [V] **Months from peak until unemployment is back within 0.5 pp of the pre-recession low:** 15 (1949), 17 (1982), 29 (1992), 20 (2020), **75 (2009–15)**. [V] 2001's pre-recession low of 3.8% was not regained within 0.5 pp until 2017. The pre-1980 cases are confounded by rising trend unemployment. | [Hall & Kudlyak (2022) NBER Macro Annual / FRBSF WP 2020-20](https://www.frbsf.org/wp-content/uploads/sites/4/wp2020-20.pdf); [FRED UNRATE](https://fred.stlouisfed.org/series/UNRATE) |
| Natural rate / NAIRU (`naturalUnemployment`) | **CBO noncyclical rate 1949–2026:** 4.39% (2026) to 6.24% (peak, 1978). [V] Mean actual unemployment 1948–2025: 5.67%. [V] | [FRED NROU (CBO)](https://fred.stlouisfed.org/series/NROU) |
| **Mortgage delinquency, normal times vs crisis** (`defaults`, foreclosure transitions `mortgageToRent`) | **Commercial-bank single-family residential, 30+ days delinquent:** **1.41–3.28% (1991–2006)**, low 1.41% (2004Q4). **Peak 11.48% (2010Q1).** 2022–26: 1.7–2.1%. [V] | [FRED DRSFRMACBS](https://fred.stlouisfed.org/series/DRSFRMACBS) |
| **Mortgage foreclosure, crisis peak** | **MBA NDS:** loans in foreclosure **4.63% of all loans (2010Q1, record)**; foreclosure starts 1.23% per quarter (2010Q1) and 1.37% (2009Q1); total delinquency 10.06% SA; 90+ days 5.02%. [V] **NY Fed:** new foreclosure notations peaked at **≈566k consumers in 2009Q2** (≈2.0M in 2009). [S] **Pre-2006 normal foreclosure inventory (MBA):** I could not open MBA's historical series; commonly cited at ~1%. [U] | [MBA Q1-2010 NDS (via Mortgage News Daily)](https://www.mortgagenewsdaily.com/news/05192010-delinquencies-mba); [MBA NDS page](https://www.mba.org/news-and-research/research-and-economics/single-family-research/national-delinquency-survey); [NY Fed Household Debt & Credit](https://www.newyorkfed.org/microeconomics/hhdc) |
| **Home-ownership rate** (`ownedShare` + `mortgageShare`) | **1965–1994:** 62.9–65.8%. **Peak 69.2% (2004Q2).** Post-crisis low 62.9% (2016Q2). **Latest 65.0% (2026Q2).** [V] | [Census HVS](https://www.census.gov/housing/hvs/index.html) via [FRED RHORUSQ156N](https://fred.stlouisfed.org/series/RHORUSQ156N) |
| **Renter share** of occupied housing units (`rentShare`) | 100 − home-ownership rate: **≈31–37%**. **Latest ≈35.0% (2026Q2)**; low 30.8% (2004). [V] (derived) | Same as above |
| Owners with a mortgage (`mortgageShare`) | Not sourced. ACS publishes "owner-occupied units with a mortgage" (roughly 60%+ of owners), but I did not verify a figure. [U] | — |
| **Private non-financial credit / GDP, all lenders** (BIS total credit) (`creditToGdp`) | **US:** 100.8% (1980) → **172.0% peak (2008Q3)** → **140.3% (2025Q4)**. **US households only:** 98.4% peak (2007Q4) → **68.1% (2025Q4)**. **Comparison countries, 2025Q4:** Japan 175.1% (peak 213.6%, 1993); UK 132.6% (peak 185.2%, 2010); euro area 153.6%; Germany 136.7%; Canada 218.9%; China 200.8%. [V] | BIS credit statistics via FRED: [QUSPAM770A](https://fred.stlouisfed.org/series/QUSPAM770A), [QUSHAM770A](https://fred.stlouisfed.org/series/QUSHAM770A), [QJPPAM770A](https://fred.stlouisfed.org/series/QJPPAM770A), [QGBPAM770A](https://fred.stlouisfed.org/series/QGBPAM770A), [QXMPAM770A](https://fred.stlouisfed.org/series/QXMPAM770A), [QDEPAM770A](https://fred.stlouisfed.org/series/QDEPAM770A), [QCAPAM770A](https://fred.stlouisfed.org/series/QCAPAM770A), [QCNPAM770A](https://fred.stlouisfed.org/series/QCNPAM770A); [BIS data portal](https://data.bis.org/topics/TOTAL_CREDIT) |
| **US bank credit** to the private non-financial sector / GDP (closer to the model's bank-only `loans`) | 20.7% (1947) → **58.6% peak (2008Q4)** → **43.3% (2025Q4)**. [V] | [FRED QUSPBM770A (BIS)](https://fred.stlouisfed.org/series/QUSPBM770A) |
| **Deposit-rate pass-through (beta)** from the policy rate (model deposit pass-through slider; posted vs paid deposit rate) | **Bank-level average deposit *spread* beta 0.54** (0.61 for the largest 5% of banks). That implies an average deposit-*rate* beta ≈ 0.46 (= 1 − spread beta; my derivation). [V] **Product level:** savings-deposit spread betas 0.66–0.76 (rate beta ≈0.24–0.34); 12-month CD spread betas 0.19–0.26 (rate beta ≈0.74–0.81). [V] **Cumulative cycle betas, interest-bearing deposits:** approached **~0.6** (2004–07); **never above ~0.4** (2015–19); **~0.4** by 2022Q4. [V] **Bank level, 2022Q1–2023Q3:** median 0.31, asset-weighted 0.49. [S] (secondary aggregator) **Pattern:** betas are lower and slower when rates rise than when they fall. [V] | [Drechsler, Savov & Schnabl (2017) QJE / NBER w22152](https://www.nber.org/papers/w22152); [NY Fed Liberty Street (2022)](https://libertystreeteconomics.newyorkfed.org/2022/11/how-do-deposit-rates-respond-to-monetary-policy/); [NY Fed (2023)](https://libertystreeteconomics.newyorkfed.org/2023/04/deposit-betas-up-up-and-away/); [FinObservatory](https://finobservatory.org/banks/deposit-betas) |
| **Deflation rate, benign gold-standard episodes** (`inflation` under the bitcoin regime) | **Typically −1 to −3%/yr** (classical gold standard, 1880–96). [V] **US 1873–92:** implicit price deflator ≈ −2%/yr; wholesale prices −3.5%/yr. [S] **Japan 1998–2012:** ≈ −0.2%/yr (cumulative −3 to −4%). [V] | [Bordo, Landon-Lane & Redish (2004) NBER w10329](https://www.nber.org/papers/w10329); Friedman & Schwartz (1963) p. 242 (see §2.1); [BIS (2015)](https://www.bis.org/publ/qtrpdf/r_qt1503e.htm) |
| **Deflation rate, "ugly" episode** | **US CPI 1930–33:** −2.7, −8.9, −10.3, −5.2%/yr; **cumulative 1929–33 −24.6%.** [V] | [FRED CPIAUCNS (BLS)](https://fred.stlouisfed.org/series/CPIAUCNS) |
| **Bitcoin ownership concentration, entity-level** (`transition.holderConcentration`; `giniWealth` after the transition) | **End-2020:** intermediaries (exchanges etc.) held **5.5M BTC (~⅓ of supply)**; individuals 8.5M; **top 1,000 investors ≈3M BTC; top 10,000 ≈5M BTC.** [V] **Glassnode (entity-clustered), Mar 2023:** whales (>1k BTC, ex-exchanges) 34.4% of supply (down from 62.7% in 2012); shrimp (<1 BTC) 6.6%; crabs (1–10 BTC) 10.5%. [V] | [Makarov & Schoar (2021) NBER w29396](https://www.nber.org/papers/w29396); [Glassnode (2023)](https://research.glassnode.com/bitcoin-supply-distribution-revisited/) |
| Bitcoin address-level distribution (**not** entity-level) | **Snapshot 2026-10-08:** the **2,029 addresses with ≥1,000 BTC hold 35.75%** of BTC; ~20.3k addresses with ≥100 BTC hold 61.9%; addresses under 1 BTC hold ~7%. Many of the top addresses are exchange cold wallets, ETF/custodians or government seizures. [V] (live page, changes daily) | [BitInfoCharts rich list](https://bitinfocharts.com/top-100-richest-bitcoin-addresses.html) |
| Lost / dormant bitcoin | **Chainalysis (2020):** ≈**3.7M BTC lost** (≈20% of then-supply; "lost" = unmoved for 5+ years). [S] **Glassnode (2023):** ≈1.457M BTC never moved since markets began; ≈4.45M BTC dormant for 7+ years. [V] | [Chainalysis coverage (Daily Hodl, 2020)](https://dailyhodl.com/2020/06/22/staggering-35000000000-in-bitcoin-btc-is-forever-lost-reports-chainalysis/); [Glassnode (2023)](https://research.glassnode.com/bitcoin-supply-distribution-revisited/) |

---

## 2. Historical deflation episodes

### 2.1 United States 1873–1896: the "Long Depression" vs "good deflation" debate [C]

**Prices**
- From 1880 to the mid-1890s the US GDP deflator fell, more than in the UK or Germany. Gold-standard deflation ran at about 1–3%/yr in most countries. [V] ([Bordo, Landon-Lane & Redish 2004](https://www.nber.org/system/files/working_papers/w10329/w10329.pdf))
- Friedman & Schwartz (1963, *A Monetary History*, p. 242), for 1873–92: "wholesale prices declined by 3½ per cent per year … implicit prices declined by 2 per cent". [S] Quote checked via a [secondary transcription](https://forum.freecapitalists.org/t/unemployment-deflation-and-growth-during-the-period-of-1873-1896/24050), not the book itself.
- Burdekin & Siklos flag 1875–79 as the persistent US CPI deflation. [V] ([EH.net, Siklos](https://eh.net/encyclopedia/deflation/))

**Output**
- Friedman & Schwartz (1963, p. 93): Kuznets real net national product grew **3.7%/yr in 1879–97** (per capita 1.5%/yr), against 3.2%/yr in 1897–1914. [S]
- They also show the result is date-sensitive: 1880–96 gives 2.6%/yr, against 4.4%/yr for 1896–1913.
- Their conclusion: "the steadiness of the price movement is far more important than its direction".
- Bordo et al. (2004) structural VAR: the deflation was driven by monetary (gold) factors that "do not explain much of the behaviour of output". Output was set by supply shocks, so the deflation was "essentially good or neutral". [V]

**Unemployment**
- There is no reliable series before 1890. [U]
- In the 1890s depression: Lebergott **18.4% (1894)** vs Romer **12.3% (1894)**.
- Romer's series for 1893–98: 8.1, 12.3, 11.1, 12.0, 12.4, 11.6%. [V] ([Romer 1986, "Spurious Volatility…"](https://eml.berkeley.edu/~cromer/Reprints/Spurious%20Volatility.pdf))

**Business cycles**
- The NBER chronology dates a **65-month contraction from Oct 1873 to Mar 1879**, the longest on record.
- 155 of the 288 months in 1873–96 are classed as recession. [V] ([FRED USREC](https://fred.stlouisfed.org/series/USREC))
- The NBER's pre-1919 dating is itself debated, with critics arguing the 1870s contraction was overstated. [C] [U] (I did not pull the specific critique.)

**Reading.** Secular deflation of ~1–3.5%/yr coexisted with ~3–4%/yr real growth. The period also contained two severe contractions (1873–79 and 1893–97) with double-digit 1890s unemployment. "Good deflation" describes the trend, not the absence of crises.

### 2.2 United States 1929–1933: debt deflation / Great Contraction

| variable | value | source |
|---|---|---|
| **CPI** | −24.6% cumulative 1929→1933 (annual averages); −2.7, −8.9, −10.3, −5.2%/yr. [V] | [FRED CPIAUCNS](https://fred.stlouisfed.org/series/CPIAUCNS) |
| **Real GDP** | −26.3% (1929→1933, current BEA vintage). [V] BIS describes it as "almost one third". [V] | [FRED GDPCA (BEA)](https://fred.stlouisfed.org/series/GDPCA); [BIS 2015, Box 1](https://www.bis.org/publ/qtrpdf/r_qt1503e.htm) |
| **Nominal wages** | Manufacturing hourly earnings fell about one fifth. [V] | [BIS 2015, Box 1](https://www.bis.org/publ/qtrpdf/r_qt1503e.htm) |
| **Unemployment** | ~3% (1929) → **~25% (1933)**; 24.9% in the Lebergott/BLS series. [V]/[S] | BIS 2015; [CRS R40655](https://www.everycrsreport.com/reports/R40655.html) |
| **Asset prices** | US equities −67% from the 1928 peak by 1931; median house-price fall across 15 countries ≈ −22% (1929–33). [V] | [BIS 2015, Box 1](https://www.bis.org/publ/qtrpdf/r_qt1503e.htm) |
| **Cross-country** | Median output fall only ≈7% and median CPI fall ≈18%. By 1938 median output per head was 12% above 1929, while the US was still 11% below. [V] | [BIS 2015, Box 1](https://www.bis.org/publ/qtrpdf/r_qt1503e.htm) |

Atkeson & Kehoe report that in 1929–34 all 16 countries in their sample had deflation, but only half had depression. Their regression slope of output growth on inflation is 0.40 (s.e. 0.28). [V] ([NBER w10268](https://www.nber.org/papers/w10268))

### 2.3 Japan, 1990s–2010s

| variable | value | source |
|---|---|---|
| **CPI** | Mild but persistent deflation. Annual CPI ≤0 in 1999–2005 and 2009–12; average **−0.22%/yr over 1998–2012**; cumulative ≈ −3.2% (1997 → 2012 averages, OECD series). [V] BIS cites "just 4%" cumulative for 1998–2012. [V] | [FRED JPNCPIALLMINMEI (OECD)](https://fred.stlouisfed.org/series/JPNCPIALLMINMEI); [BIS 2015, Box 2](https://www.bis.org/publ/qtrpdf/r_qt1503e.htm) |
| **Real GDP** | Average **0.84%/yr (1995–2012)** and **0.55%/yr (1998–2012)**; worst year −5.9% (2009). [V] | [FRED JPNRGDPEXP](https://fred.stlouisfed.org/series/JPNRGDPEXP) |
| **Per-capita and working-age growth** | Per capita: Japan +6% vs US +26% (1991–2000); Japan **+10% vs US ~12% (2000–13)**. Per working-age person (2000–13): Japan **>20% vs US ~11%**. [V] | [BIS 2015, Box 2](https://www.bis.org/publ/qtrpdf/r_qt1503e.htm) |
| **Unemployment** | 2.2% (1990) → peaks **5.8% (2002)** and 5.7% (2009). [V] | [FRED LRUN64TTJPM156S (OECD)](https://fred.stlouisfed.org/series/LRUN64TTJPM156S) |

**Reading.** Deflation followed the late-1980s asset and credit bust; private credit/GDP peaked at 213.6% in 1993. [V] It was low-grade stagnation rather than collapse, and demographics explain much of the headline weakness. This is the "bad but not ugly" case in Borio & Filardo's terms.

### 2.4 Classical gold standard (c. 1870–1913) generally

- **Deflation was common and mild.** There were only four persistent postwar deflations (Japan twice, China, Hong Kong), against many prewar ones. [V] ([BIS 2015](https://www.bis.org/publ/qtrpdf/r_qt1503e.htm))
- **Little growth cost.** In the five years after a price peak, per-capita growth was lower by only **0.6 pp in the classical gold standard period, not significant**. The gap was 3.6 pp (significant) in the interwar years, and −0.3 pp in the postwar era (growth was higher, not significant). [V]
- **Atkeson & Kehoe.** Across 17 countries and 100+ years of five-year periods excluding 1929–34, **65 of 73 deflation episodes had no depression**, and 21 of 29 depressions had no deflation. [V] ([NBER w10268](https://www.nber.org/papers/w10268); [AER 2004](https://www.aeaweb.org/articles?id=10.1257/0002828041301588))
- **Bordo & Redish; Bordo, Landon-Lane & Redish.** US, UK and German deflation in 1880–96 was mostly supply-driven or neutral, with a steep short-run aggregate supply curve. [V]
- **Bordo & Filardo (2005).** Episodes divide into "good", "bad" and "ugly" (1929–33 is the ugly case). Bad deflations were *less* common under the classical gold standard than in the Fed's early decades. [S] ([NBER w10833](https://www.nber.org/papers/w10833))

---

## 3. Evidence and argument summaries

### (a) Good vs bad deflation

**Theory**
- **Good (supply-driven) deflation.** Productivity growth outpaces nominal demand, so prices fall while output and real incomes rise. The Friedman rule even prescribes mild anticipated deflation. ([Bordo et al. 2004](https://www.nber.org/papers/w10329))
- **Bad deflation.** Nominal demand collapses. Sticky nominal wages raise real wages and unemployment, real debt burdens rise, and the zero lower bound raises real rates.
- **Fisher's debt deflation.** Over-indebtedness leads to distress selling, contraction of deposit money and falling prices. That raises the real value of debt, which causes more liquidation, bankruptcies and output collapse. "The more the debtors pay, the more they owe." ([Fisher 1933, *Econometrica* 1(4)](https://www.jstor.org/stable/1907327))
- **Bernanke (1983)** adds the credit-intermediation channel: bank failures destroy information capital, which raises the cost of credit.

**Evidence**
1. **Atkeson & Kehoe (2004).** Outside 1929–34, almost no link between deflation and depression (65/73). [V]
2. **Borio, Erdem, Filardo & Hofmann (BIS QR, Mar 2015).** 38 economies, 1870–2013:
   - The goods-and-services deflation/growth link is weak and driven by the Great Depression.
   - **Asset-price (especially property) deflations** are robustly associated with slower growth: cumulative five-year growth is about 10 pp lower after equity or property peaks.
   - Once asset prices are controlled for, CPI deflation is not significant even in the interwar years.
   - **No evidence that high debt makes CPI deflation costlier**, but private debt or credit gaps do amplify **property-price** busts.
   - In the postwar era, deflation years had *higher* average growth (3.2% vs 2.7%). [V]
3. **Bordo & Filardo (2005)** and **Bordo, Landon-Lane & Redish (2004).** Gold-standard deflation was mostly benign; 1919–21, 1929–33 and Japan are the bad or ugly cases. [V]/[S]
4. **Counterpoint and caveats** [C]:
   - These are mostly reduced-form correlations. Deflation that comes with a demand collapse is the very case models warn about, and averages across episodes can hide it.
   - Modern labour markets have more downward nominal wage rigidity. Siklos ([EH.net](https://eh.net/encyclopedia/deflation/)) notes this, and the BIS authors caveat that present debt levels are near historic highs.
   - Japan shows that even a mild deflation can coincide with a long stagnation when it follows an asset/credit bust.

**Implication for the simulator**
- The literature does **not** say deflation per se is catastrophic.
- It does say the damage runs through (i) demand collapses, (ii) **property-price busts with high private debt**, and (iii) nominal rigidities.
- The model's v2 result (S1/S3 bitcoin −4.6%/yr; preset M −8.7%/yr with foreclosure waves) is far outside the benign gold-standard band of −1 to −3%/yr.
- Sustained **−8.7%/yr matches only 1931–32** (US CPI −8.9% and −10.3%). Treat it as an ugly-deflation scenario, not a typical bitcoin-standard outcome.

### (b) Cantillon effects

**Theory**
- Cantillon (1755, *Essai sur la nature du commerce en général*, Pt II ch. 6–7) argued that new money raises the prices and incomes of those who receive it first. Later recipients face higher prices before their incomes adjust. Money is non-neutral in its *distribution* even if neutral in the long-run price level.
- Modern analogues are the asset-price channel of QE, the "redistribution channel" of monetary policy, and seigniorage or first-use gains for banks and governments.

**Empirical evidence.** It is mixed, and mostly about QE and rate shocks rather than a clean Cantillon test.
- **Bank of England (2012).** QE raised financial-asset prices. The **top 5% of households held ≈40% of household financial assets** (average gross financial assets £175k vs ~£1.5k for the median), so the direct wealth gains were concentrated. [S] ([BoE QB 2012Q3](https://www.bankofengland.co.uk/-/media/boe/files/quarterly-bulletin/2012/the-distributional-effects-of-asset-purchases.pdf))
- **Lenza & Slacalek (ECB WP 2190; JAE 2024).** Euro-area QE slightly *reduced* income inequality via employment: income Gini 43.15 → 43.09 after a year. Its effect on wealth inequality was negligible (69.17 → 69.14), because stock gains for the rich were offset by house-price gains for the middle class. [S] ([ECB WP 2190](https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp2190.en.pdf))
- **Coibion, Gorodnichenko, Kueng & Silvia (2017, JME).** *Contractionary* US monetary shocks raise inequality in earnings, income, consumption and expenditure. Accommodative policy compresses it on these measures. [S] ([NBER w18170](https://www.nber.org/papers/w18170))
- **Doepke & Schneider (2006, JPE).** Unanticipated inflation redistributes from **rich, old bondholders** to **young, middle-class mortgage debtors**: losses of 5.7–15.2% of GDP for rich/old households in their 1989 scenarios, about two-thirds borne by the top 10%. This is a "reverse-Cantillon" channel, in which inflation helps debtors. [S] ([JPE 2006](https://mdoepke.github.io/research/Doepke_Schneider_JPE_06.pdf))
- **Colciago, Samarina & de Haan (2019, J. Econ. Surveys).** No consensus. Employment and wage channels reduce inequality; asset-price channels raise it; the net effect depends on the horizon and on wealth composition (equity vs housing). [S] ([DNB WP 594](https://www.dnb.nl/media/k15lkren/working-paper-no-594_tcm47-375929.pdf); [J. Econ. Surveys](https://ideas.repec.org/a/bla/jecsur/v33y2019i4p1199-1231.html))

**Bottom line** [C]
- First-round asset-price gains from QE do accrue disproportionately to the wealthy.
- Measured *net* effects on income or wealth Gini are small and often slightly equalizing once employment effects are counted.
- There is little direct evidence that a fixed-supply money would reduce wealth concentration through the "no Cantillon" mechanism.
- **For the model:** v2 fiat injects new money **pro rata to existing deposits** (REPORT-v2 §1). That is a savers' dividend with **no Cantillon channel**, so the model cannot currently test this claim. A Cantillon test needs injection via bank lending, asset purchases or government spending, with a lag before prices respond.

### (c) Bitcoin wealth concentration (on-chain)

**Best entity-level evidence**
- **Makarov & Schoar (2021, NBER w29396)** cluster addresses into entities and separate intermediaries.
- At end-2020, intermediaries held 5.5M BTC (≈⅓). Individuals held 8.5M, of which the **top 1,000 held ≈3M and the top 10,000 ≈5M**.
- They state this is "substantially higher than the wealth concentration of the US population", and that it is not driven by abandoned coins or Satoshi's holdings. [V]
- Implied (my arithmetic, [U]): the top 10,000 individual entities hold ≈59% of individually held BTC.

**Industry entity data (Glassnode, Mar 2023)**
- Entity counts follow a Pareto distribution: over 32M "shrimp" (<1 BTC) hold 6.5% of supply, while ~1,640 whales hold ≈28% (excluding exchanges and miners).
- The whale share has fallen from 62.7% (2012) to 34.4%. [V]
- Glassnode argues this shows supply dispersing over time. It is an interested party, and its clustering is deliberately conservative.

**Address data (BitInfoCharts)**
- About 2,000 addresses with ≥1,000 BTC hold ~36% of supply (snapshot 2026-10-08). [V]

**Caveats.** These are essential, and the direction of the bias differs by caveat.
1. **Addresses ≠ entities ≠ people.** One person may hold many addresses, which overstates dispersion. One exchange or ETF address may hold coins for millions of users, which overstates concentration. The largest addresses on BitInfoCharts are mostly Binance, Robinhood, Bitfinex, Tether, government seizures, and similar.
2. **Custodial and ETF holdings.** Coins held through spot ETFs, GBTC, WBTC and exchanges are pooled. Their beneficial ownership is off-chain, so the true concentration of these holdings is unobservable.
3. **Lost coins.** Chainalysis puts lost coins at about 3.7M BTC (2020) [S]. Glassnode counts 1.46M BTC never moved and 4.45M dormant 7+ years [V]. Lost coins skew toward early large holders, so counting them overstates the concentration of *spendable* wealth.
4. **No link to household wealth surveys.** On-chain shares cannot be mapped to household wealth deciles without survey data. **No published, verified household-level "bitcoin wealth Gini"** came up in my search. [U] Address-level Gini figures in the literature are not comparable to the SCF wealth Gini.

**For the model**
- `transition.holderConcentration` = 0.5–0.99 raises the model's wealth Gini from 0.457 to 0.55–0.65 (REPORT-v2).
- Evidence that the *top 10k entities* own ~⅓ of all coins (≈59% of individually held) supports a high concentration setting.
- **But** the model maps BTC holdings onto *households by skill*. Real holders include exchanges, funds, corporations and governments, and a large lost fraction.
- Treat holderConcentration as a scenario parameter, not a calibrated value.

---

## 4. Quick reference: model output vs target (from REPORT-v2)

| model metric | current model value (REPORT-v2) | real-world target | verdict |
|---|---|---|---|
| `velocity` | 0.018/month ≈ **0.22/yr** (S0 fiat) | **1.1–2.2/yr** (M2V; 1.42 latest) | **~6× too low**: the most diagnostic miss |
| `giniWealth` | **0.40–0.53** | **0.79–0.86** | far too equal |
| `topDecileWealthShare` | (see REPORT-v2 E2 table) | **≈61–69%** | check |
| `creditToGdp` | 1.33 at start → **0.04** by yr 20 (tenure runs); 2–8% in v1 | bank credit **43–59%**; all private credit **100–172%** of GDP | decays to an unrealistic level; no new mortgage originations |
| `rentShare` | **34.6% / 36.5%** (fiat / bitcoin, yr 20); 63% in M-bitcoin | **31–37%** | fiat/S0 OK; M-bitcoin is far outside the historical range |
| `naturalUnemployment` / no-shock `unemployment` | 6% natural; 8–19% realized | **4.4–6.2%** (CBO); 5.7% average actual | realized rate too high |
| E4 demand shock | −15% for 12 months gives **+19.8 pp** unemployment gap with only **2.3%** cumulative GDP loss (S0) | **Okun ≈ −0.4:** 2007–09 had +5.6 pp with GDP −3.8% | **unemployment roughly an order of magnitude too sensitive to output** (rough: E4 reports peak unemployment gap vs *cumulative* GDP loss, so not a like-for-like Okun estimate; re-estimate Okun on sim output) |
| E4 recovery | 46–62 months with gap > 1 pp (S0/S2 demand) | ≈0.1 log points per year after the peak; 15–29 months to return near the prior low in typical recessions, 75 after 2008 | plausible for a large shock, but the size of the shock is off |
| Phillips (T3) | correlation −0.48 (S0) / −0.86 (S2) | **slope −0.1 to −0.6** pp per pp; correlation not directly comparable | report a slope |
| Deposit pass-through | posted 4.1% vs **paid 0.054%/yr** | rate beta **≈0.3–0.6** (cycle-dependent) | effectively ~0 paid: miscalibrated |
| Deflation (bitcoin) | −4.6%/yr (S1/S3); **−8.7%/yr (M)** | benign −1 to −3%/yr; 1931–32 only for −9 to −10% | M is an ugly-deflation scenario |
| Foreclosure (M-bitcoin) | ~all opening mortgagors foreclosed within 5 years | peak inventory **4.63%** of loans (2010); 30+ day delinquency peak **11.5%** | orders of magnitude above the worst US experience |

---

## 5. How to use these benchmarks for calibration

### Definitions to align first
- **Velocity.** The model computes `(consumptionSpend + investmentSpend) / deposits` per month (`assemble-metrics.ts`).
  - Annualize it (×12).
  - Ideally add government spending so the numerator matches nominal GDP, as in FRED M2V = GDP / M2.
  - Deposits ≈ M2 is a reasonable proxy. There is no currency in the model.
- **Credit/GDP.** The model computes `loans / (monthly nominal output × 12)`, bank loans only.
  - Compare it to **BIS bank credit (43–59% of GDP)**, not to total credit (140–172%), which includes bonds and nonbank lending.
  - Households alone: 68–98%.
- **Defaults.** `defaults` is a *loss amount* per tick, not a rate.
  - To compare with delinquency or foreclosure rates, compute `annual defaults / outstanding loans`, or count foreclosure transitions (`mortgageToRent`) / mortgaged households per year.
- **Income Gini.** Pick a concept and match it:
  - pre-tax money income: Census, 0.45–0.46;
  - market income: CBO, 0.56;
  - post-tax and transfer: CBO, 0.44;
  - the model's `giniIncome` is most likely pre-tax and needs checking.
- **Phillips curve.** Validity test T3 reports a *correlation*. Regress 12-month wage growth on unemployment (controlling for lagged inflation) and compare the **slope** to Galí–Gambetti (−0.1 to −0.6).

### Most diagnostic targets, ranked by how strongly they discriminate on the bitcoin-vs-fiat question
1. **Okun ratio under a demand shock.** E4 shows +19.8 pp unemployment for a 2.3% GDP loss. Real data are ~0.4–0.5 pp per 1% of output (a rough comparison, because E4's GDP figure is cumulative; re-estimate Okun directly on simulated `unemployment` vs `realGdp` gaps). The labour-market response drives every unemployment conclusion in REPORT-v2, so fix this first.
2. **Velocity (target ≈1.4/yr, range 1.1–2.2).** At 0.22/yr, the model holds ~4–5 years of spending as idle deposits (`openingDepositMonths` = 36). That magnifies real-balance and hoarding effects and the cost of deflation.
3. **Bank credit/GDP (43–59%) with ongoing mortgage originations.** Without a steady-state credit stock, debt-deflation channels can't be tested fairly. In the real world deflation hurts mainly through property prices × private debt (BIS 2015), so this is central.
4. **Wealth Gini (0.80–0.86) and top-10% share (~61–69%).** These determine who holds the deposits that appreciate under deflation, and therefore who gains under bitcoin.
5. **Deposit pass-through (rate beta ~0.3–0.6).** The model pays ~0. That understates fiat savers' returns and biases comparisons toward bitcoin's real-return advantage.
6. **Deflation rate bands.** Use −1 to −3%/yr as the "benign" validation band and 1930–33 as the "ugly" band. If the bitcoin regime produces −8.7%/yr with 1%/yr productivity growth, the money-demand or hoarding block is too strong. Historical productivity-driven deflation roughly tracked the gap between productivity and money growth.
7. **Recession shape.**
   - Peak unemployment rise of +2.5 to +5.6 pp for typical to severe recessions.
   - Recovery at ≈0.1 log points per year.
   - 30+ day mortgage delinquency of 1.4–3.3% in normal times, about 11.5% at the 2010 peak.
   - Foreclosure inventory peaking at ~4.6% of loans.
   - Use these as stress-test ceilings: if the sim's worst case is far beyond 2008–10 or 1929–33, flag it.
8. **Tenure.** Renter share of 31–37% is already matched in fiat S0. Keep it as a regression test.

### Weakly diagnostic or untestable as built
- **Cantillon effects.** Untestable while new money is injected pro rata.
- **Bitcoin holder concentration.** A scenario input, not a calibratable target.
- **Gold-standard growth.** Pre-1929 growth comparisons depend heavily on dates, and the Long Depression era includes severe contractions.

### Gaps and items I could not verify
**Filled in Round 4 (§6):** pre-2006 MBA foreclosure inventory / delinquency (via ALTA press releases); share of owners with a mortgage (Census ACS press release); bottom-20% wealth share (computed from SCF 2022 public extract).

**Still open**
- **NY Fed normal-times foreclosure counts** (only the 2009 peak was found). [U]
- **US unemployment before 1890.** No reliable series. [U]
- **Bordo & Filardo (2005) episode counts.** Read only via summary. [S]
- **Friedman & Schwartz figures.** Quoted via a secondary transcription. [S]
- **CBO 2021 Ginis.** From the CBO report summary; the CBO site blocks scripted fetches. [S]
- **A household-level bitcoin wealth Gini.** None found. [U]
- **Critiques of NBER's pre-1919 recession dating.** Not pulled. [U]
- **MBA paid historical Excel** (1979–present series product): not purchased; pre-2006 figures below come from contemporaneous press releases. [S]
- **Euro-area general-government revenue/expenditure** as a single IMF series: country peers are reported; the EA aggregate was not in the `rev`/`exp` country list I pulled. [U]
- **FDIC historical recovery rate on failed-bank assets** as a single published time series: not extracted here. [U]
- **Typical LTV mean (not median)** at origination across all channels: Urban Institute reports *median* combined LTV. [U]
- **El Salvador CPI / unemployment response to the 2021 bitcoin law:** adoption was tiny, so macro effects are hard to attribute; I did not find a clean identified estimate. [U]

*Raw data used for the [V] calculations: `/workspace/econ-sim/bench/` (FRED CSVs, IMF datamapper JSON, SCF 2022 extract, paper PDFs/text). Round 1 dated 2026-10-08; Round 4 dated 2026-10-08 afternoon PT.*


---

## 6. Round 4 additions (2026-10-08 PT)

*Triggered by CoS `REPORT-v3.md` §9 ("Model vs reality"): the v3 model now has government budget / treasury dynamics, mortgage originations + LTV, bank resolution / bail-in loops, and a (non-circulating) gradual fiat→bitcoin rebase. New benchmarks below map to those mechanisms. Existing rows and sections above are unchanged.*

### 6.1 Additional rows for the main calibration table

| metric (model metric it validates) | real-world range | source |
|---|---|---|
| **US federal budget balance** (% GDP) (`taxRevenue` vs `govGoodsSpend` / treasury surplus) | **Normal years (2015–19):** about **−2.5 to −4.6%**. **2009:** **−9.8%**. **2020:** **−14.5%**. **2021:** −11.7%. **2023–25:** −5.8 to −6.2%. Surpluses last appeared in the late 1990s. [V] | [FRED FYFSGDA188S (OMB)](https://fred.stlouisfed.org/series/FYFSGDA188S) |
| **General-government budget balance** (% GDP), IMF WEO | **US:** −2.9 (2007), **−13.2 (2009)**, −5.8 (2019), **−14.1 (2020)**, −7.9 (2023–24). **UK:** −10.0 (2009), −12.9 (2020). **Germany:** −3.2 (2009), −4.4 (2020); near balance or surplus in many non-crisis years. **Japan:** −9.6 (2009), −9.0 (2020). **Canada:** −3.9 (2009), −10.9 (2020); often near zero outside crises. **Euro area:** −5.1 (2009), −8.7 (2020). [V] | [IMF Datamapper GGXCNL_NGDP](https://www.imf.org/external/datamapper/GGXCNL_NGDP) |
| **Government debt / GDP** | **US federal debt** (FRED): 62.7% (2007) → 84.0% (2009) → 105.8% (2019) → **125.6% (2020)** → ~122.6% (2025Q4). [V] **US general government** (IMF): 64.9% (2007) → 87.1% (2009) → 108.8% (2019) → **132.6% (2020)** → 122.3% (2024). [V] **Peers, general gov 2024 (IMF):** Japan **214.5%**, UK 99.9%, Canada 110%, Germany 62.2%, euro area 104%. [V] | [FRED GFDEGDQ188S](https://fred.stlouisfed.org/series/GFDEGDQ188S); [GGGDTAUSA188N](https://fred.stlouisfed.org/series/GGGDTAUSA188N); [IMF GGXWDG_NGDP](https://www.imf.org/external/datamapper/GGXWDG_NGDP) |
| **Tax / revenue and spending / GDP** | **US federal (OMB/FRED):** revenue **~16–18%** of GDP in normal years (17.0% in 2025); outlays **~19–23%** (22.8% in 2025); outlays **24.3% (2009)** and **30.5% (2020)**. [V] **General government revenue (IMF `rev`):** US **~30%** (30.0% in 2019, 29.9% in 2024); UK ~36–41%; Germany ~44–48%; Japan ~34–38%; Canada ~40–43%. [V] **General government expenditure (IMF `exp`):** US **35.8% (2019)** → **44.7% (2020)** → 37.9% (2024); UK 38.8 → 50.0 → 44.0; Germany 45.5 → 51.1 → 49.4; Japan 37.3 → 44.5 → 39.1; Canada 40.6 → 52.4 → 44.7. [V] | [FRED FYFRGDA188S](https://fred.stlouisfed.org/series/FYFRGDA188S), [FYONGDA188S](https://fred.stlouisfed.org/series/FYONGDA188S); [IMF Datamapper `rev`](https://www.imf.org/external/datamapper/rev), [`exp`](https://www.imf.org/external/datamapper/exp) |
| **Bank failure rates** (`bankFailures`) | **Normal (FDIC era, 1995–2006):** mean **~4.6 failures/year**; 0 in 2005–06. With ~8,000 commercial banks around 2000 → **≈0.06%/yr**. [V] **S&L / early-90s peak:** **530 (1989)**, 381 (1990), 268 (1991), 179 (1992); **≈4.2% of commercial banks in 1989**. [V] **2008–10:** 25 (2008), **137–140 (2009)**, **155–157 (2010)** → **≈2.0–2.4%** of commercial banks. [V] **1930–33 suspensions (pre-FDIC):** 1,350; 2,293; 1,453; **~4,000\*** → roughly **6%, 10%, 8%, ~22%** of the prior-year commercial-bank stock (24,026 banks in 1929 → 14,440 in 1933). Depositors lost **15–28%** of deposits in suspended banks and up to **2.15% of all commercial-bank deposits (1933)**. [V] **2023:** 5 failures, but SVB+Signature were systemic-risk resolutions protecting *all* depositors. [V] | [FRED BKFTTLA641N](https://fred.stlouisfed.org/data/BKFTTLA641N); [FDIC Failures in Brief](https://www.fdic.gov/bank/historical/bank/); [FRED USNUM](https://fred.stlouisfed.org/series/USNUM); [FRED X03NOB](https://fred.stlouisfed.org/series/X03NOB); [FDIC *Managing the Crisis*](https://www.fdic.gov/resources/publications/managing-the-crisis/documents/managing-crisis-chronological-overview.pdf) |
| **Mortgage origination flow** (`mortgageOriginations`) | **MBA 1–4 family, 2022:** **$2.305T** total (**$1.619T purchase + $0.686T refi**); **6.72M loans** (4.38M purchase, 2.34M refi). **2023 (forecast vintage):** $1.680T (1.359 purchase + 0.321 refi); 4.48M loans. [V] **As share of households (2023, 131.4M):** purchase originations ≈ **3.3%/yr** of households; all originations ≈ **5.1%/yr**. As share of housing stock (~145–149M units): purchase ≈ **3.0%/yr**. [V] Refi share is highly rate-sensitive (35% of loans in 2022 vs 23% in 2023). | [MBA Mortgage Finance Forecast, Sep 2023](https://www.mba.org/docs/default-source/research-and-forecasts/forecasts/2023/mortgage-finance-forecast-sep-2023.pdf); [FRED TTLHH](https://fred.stlouisfed.org/series/TTLHH) |
| **Share of homeowners with a mortgage** (`mortgageShare` among owners) | **ACS 2019–2023 5-year:** **61.2%** of owner-occupied homes had a mortgage; **38.8%** owned free and clear (up from 36.9% in 2014–2018). [V] | [Census ACS press release, 2024](https://www.census.gov/newsroom/press-releases/2024/acs-5-year-homeowners-renters.html) |
| **LTV at origination** (`mortgageLtv` slider; model preset M uses 0.95) | **Urban Institute (agency/GSE+Ginnie focus):** **median combined LTV ≈ 90%** (Dec 2021) → **94% (Oct 2023)**. [V] That is a 6–10% down payment at the median. Means and portfolio/jumbo LTVs are lower; FHA/VA pull the median up. [S]/[U] for a full-market mean. | [Urban Institute Housing Finance At-a-Glance Chartbook, Dec 2023](https://www.urban.org/sites/default/files/2023-12/Housing%20Finance%20At%20a%20Glance%20Monthly%20Chartbook%20December%202023.pdf) |
| **House price / income multiple** | **Census median new-house sales price ÷ Census median household income (current $):** **~4.2 (1989), 4.0 (2000), 4.9 (2007), 4.7 (2019), 5.4 (2021), 5.8 (2022), 5.3 (2023), 5.0 (2024)**. [V] (New-house prices run above existing-home medians; NAR existing-home multiples are typically a bit lower.) | [FRED MSPUS](https://fred.stlouisfed.org/series/MSPUS), [MEHOINUSA646N](https://fred.stlouisfed.org/series/MEHOINUSA646N) |
| **Deposit insurance coverage** (resolution / bail-in design) | **US FDIC limit:** $2,500 (1934) → $5,000 (1934) → … → **$100,000 (1980)** → temporary **$250,000 (2008)** → **permanent $250,000 (Dodd-Frank 2010)**. [V]/[S] **Pre-FDIC losses:** depositors in suspended banks lost **~15–42%** of those banks' deposits (1921–33); system-wide depositor losses peaked at **2.15% of all commercial-bank deposits in 1933**. [V] **Cyprus 2013:** deposits **≤ €100,000 protected**; at Bank of Cyprus, **47.5% of uninsured deposits converted to equity** (bail-in). [S] **SVB / Signature, Mar 2023:** systemic-risk exception → **all depositors made whole**, including uninsured; shareholders and some unsecured creditors not protected; DIF losses recovered via special assessment. [V] | [FDIC *Managing the Crisis*](https://www.fdic.gov/resources/publications/managing-the-crisis/documents/managing-crisis-chronological-overview.pdf); [Federal Register 2010-20008](https://www.federalregister.gov/documents/2010/08/13/2010-20008/deposit-insurance-regulations-permanent-increase-in-standard-coverage-amount-advertisement-of); [Reuters on Cyprus haircut](https://www.reuters.com/article/markets/cyprus-central-bank-announces-475-percent-haircut-on-large-bank-of-cyprus-depos-idUSL6N0G0331/); [Joint Treasury/Fed/FDIC statement on SVB](https://www.fdic.gov/news/press-releases/2023/pr23017.html) |
| **Bottom-20% wealth share** (`bottomQuintileWealthShare`) | **SCF 2022 public extract (my calculation, average of 5 implicates):** bottom 20% of families by net worth hold about **−0.23% of aggregate net worth** (slightly negative because ~7.6% of families have negative net worth). Bottom 50% ≈ **2.2%**. Top 10% ≈ **73%**. Weighted p20 net worth ≈ **$13–14k**. [V] Aligns with DFA bottom-50% ≈ 2.3%. | [Fed SCF 2022 summary extract](https://www.federalreserve.gov/econres/files/scfp2022s.zip); method: weighted percentile cut on `networth` × `wgt` per implicate |
| **Pre-2006 normal foreclosure / delinquency** (fills earlier gap) | **MBA NDS, mid-2000s:** total SA delinquency **~4.4% (2004Q2)**; foreclosure inventory **1.16% (2004Q2)** — "lowest since end of 2000"; prime foreclosure inventory **0.49%**. **2005Q2:** prime foreclosure inventory **0.42%**. **2006Q3:** total delinquency **4.67% SA**; prime foreclosure inventory **0.44%**, subprime **3.86%**. [V] So "normal" foreclosure inventory was **~1.0–1.2% of loans**, not the 4.63% 2010 peak. | [ALTA / MBA NDS 2004Q2](https://www.alta.org/news-and-publications/news/20040909-Residential-Mortgage-Delinquencies-and-Foreclosure-Inventory-Down-From-Last-Year-According-to-MBA-National-Delinquency-Survey-); [ALTA / MBA NDS 2005Q2](https://www.alta.org/news-and-publications/news/20050915-Residential-Mortgage-Foreclosures-Down-and-Delinquencies-Up-Slightly-According-to-MBA-National-Delinquency-Survey-); [HousingWire on 2006Q3 NDS](https://www.housingwire.com/articles/delinquencies-defaults-continue-upward-run-3rd-quarter/) |

### 6.2 Dual-currency / dollarization transitions

*Relevant to the sim because v3's "gradual" fiat→bitcoin path is still a same-regime deposit rebase (REPORT-v3: regime stays fiat; no bitcoin circulates). Real dual-currency episodes show what official dual tender, forced conversion, and hyperinflation exits actually look like.*

#### Ecuador, official dollarization (January 2000)

| | |
|---|---|
| **Setup** | After a 1999 banking/currency/fiscal crisis, Ecuador replaced the sucre with the US dollar at 25,000:1. Preconditions (sound banks, fiscal surplus) were **not** in place. [V] |
| **Prices** | Pre-crisis inflation was already high (~40% average in the late 1990s). Inflation peaked around **90–96% in 2000**, then fell to the low 20s in 2001 and toward single digits by 2002–05 (near US rates later). [S] ([AFD 2020](https://www.afd.fr/sites/default/files/2020-09-04-23-15/official-dollarization-ecuador.pdf); CEPAL survey figures in secondary summaries) |
| **Output** | Real GDP **−4.7% to −7.3% in 1999**; recovery **+2.3% (2000), +5–5.6% (2001)**. Crisis fiscal cost estimates **>20% of GDP**. [S]/[V] |
| **Unemployment** | Climbed to about **14–15% in 1999–2000**, then fell into the low teens / high single digits by 2001–02. [S] |
| **Relevance to the sim** | This is a **hard peg / currency replacement under crisis**, not a voluntary dual-circulating standard. Stabilization came from importing US monetary policy and killing seigniorage — closer to a successful "ugly exit" than to bitcoin alongside fiat. The sim's gradual rebase does **not** create a circulating second currency, so it cannot reproduce Ecuador's dual-pricing / conversion dynamics. |

#### El Salvador, bitcoin as legal tender (Sep 2021 → 2025 rollback of compulsion)

| | |
|---|---|
| **Setup** | Bitcoin Law (2021) made BTC legal tender alongside the USD (El Salvador has been dollarized since 2001). Chivo wallet, tax payments in BTC, and a convertibility guarantee were part of the launch. |
| **Adoption** | Very low. A 2024 survey reported **~92% of Salvadorans did not use bitcoin** that year (~76% had never used it). [S] ([El Salvador Now / survey coverage](https://www.elsalvadornow.org/2025/01/17/92-of-salvadorans-did-not-use-bitcoin-in-2024-el-92-de-salvadorenos-no-uso-bitcoin-en-2024/)) |
| **IMF program (2025)** | IMF approved a **40-month, ~$1.4B EFF** (Feb 2025). Program conditions: **make private-sector bitcoin acceptance voluntary**, confine public-sector bitcoin activity and purchases, and remove key legal-tender compulsion features. [V] ([IMF PR 25/043](https://www.imf.org/en/news/articles/2025/02/26/pr25043-el-salvador-imf-approves-new-40-month-us1-bn-eff-arr)) |
| **2025 law change** | January 2025 amendments: private acceptance becomes voluntary; bitcoin tax payments and the state convertibility guarantee are removed. "Curso legal" language may remain, but the economic legal-tender obligations are largely dismantled. [S] |
| **Macro attribution** | Because usage stayed tiny, **CPI / GDP / unemployment effects of the bitcoin law itself are not cleanly identifiable**. [U] Dollarization (USD) remains the monetary regime that matters. |
| **Relevance to the sim** | Closest real experiment to "bitcoin + fiat dual tender." Lesson: **legal tender ≠ adoption**. A simulator that forces a full rebase overstates what El Salvador actually did. A fair dual-currency arm needs endogenous currency choice (`money.choiceSpeed`) with low equilibrium bitcoin spend shares, not a household-skill deposit reassignment. |

#### Zimbabwe: hyperinflation, multicurrency (2009), ZWL, ZiG (2024)

| | |
|---|---|
| **Hyperinflation** | Peak around **2007–08**; the Zimbabwe dollar ceased to function in transactions by late 2008. [V] ([IMF AFR Departmental Paper 10/03](https://www.imf.org/external/pubs/ft/dp/2010/afr1003.pdf)). Widely cited peak monthly rates are in the hundreds of millions of percent; exact peaks are contested across measurement methods. [C] |
| **2009 multicurrency** | Feb 2009: official multicurrency system (USD dominant, also rand and others). Zimbabwe-dollar accounts became dormant. Hyperinflation stopped immediately once the local unit was abandoned. [V] |
| **Later reversals** | RTGS$/ZWL reintroduction (2019) and subsequent inflation/FX instability; **ZiG** (gold-backed) introduced April 2024 to replace ZWL. [S] |
| **Relevance to the sim** | Shows (i) **currency substitution as an exit from hyperinflation**, (ii) how hard it is to reintroduce a soft local unit, and (iii) that "bitcoin standard" analogies to Zimbabwe are about **replacing a collapsed currency**, not about competing with a stable USD/fiat regime. The sim's bitcoin arm, which deflates 2–11%/yr from a stable start, is a different experiment. |

### 6.3 How Round 4 maps to REPORT-v3 model issues

| Real-world benchmark | v3 mechanism / bug it disciplines |
|---|---|
| Budget balance −2 to −6% of GDP in normal years; −10 to −15% in deep recessions; spending ≈ revenue + deficit | **B1 treasury sink** (taxes 1–3× spending, surplus unspent). A rebate or bond rule should land near these bands, not accumulate 30–78% of deposits in the treasury. |
| Debt/GDP 60–130% (US), much higher in Japan | Model has little public debt dynamics; useful if bond financing / monetization is turned on. |
| Bank failures ~0.06%/yr normal; 2–4% in bad years; Depression teens of percent | **Bail-in loop (B2):** monthly failures of the surviving bank under M are far outside even 1933. Target: rare failures, not a failure every tick. |
| Mortgage originations ~3%/yr of households (purchase); owners-with-mortgage ~61%; median LTV ~90–95% | **Origination burst + windfall (B3)** and `householdMortgageShare` / `mortgageLtv`. Steady-state flow should be thousands of loans per 500-household run over 20 years *spread out*, not 150 at ticks 0–1. LTV 0.95 is at the high end of the *median* but plausible for FHA-heavy books. |
| Deposit insurance $250k; Cyprus bail-in only above €100k at ~47.5%; SVB protected uninsured via systemic risk | Resolution design: distinguish insured vs uninsured, one-shot vs recurring bail-in, and when a systemic-risk override applies. |
| Dual-currency episodes | Gradual transition should eventually **circulate** a second money and allow choice; Ecuador/El Salvador/Zimbabwe are calibration stories for crisis adoption, not for steady bitcoin-vs-fiat welfare. |


## 7. Round 5: Nominal vs real mortgage rates in the buy decision (2026-10-08 PT)

*Barry's question: should the simulator's house-buying decision use the **real** mortgage rate (nominal − expected inflation/deflation) or the **nominal** rate? Triggered by the CoS / REPORT series and the tenure-choice logic in `barrybecker4/economy-simulation` (local checkout `repo-v5`). Sections 1–6 above are unchanged.*

### 7.1 How the model currently decides (repo-v5 / REPORT-v4 context)

In `packages/core/src/sim/contracts.ts` (repo-v5), tenure choice does **both**:

| Piece | Rate used | Role |
|---|---|---|
| `loanRate = policyRate + LOAN_SPREAD` | **nominal** | Contractual mortgage rate |
| `realRate = loanRate − inflation` | **real** | Fed into `monthlyMortgagePayment(maxLoan, realRate, term)` and `monthlyOwnedCost(..., realRate)` for the **decision burden** |
| `ownershipCapitalLoss(homePrice, inflation)` | expected inflation | Separate desirability / capital-gain term |
| `affordableMortgageTermYears({..., loanRate, ...})` | **nominal** | Income gate that picks a feasible term (income floor shrinks under deflation) |
| Booked `household.mortgagePayment` | **nominal** `loanRate` | Actual cash payment after origination |

Comments in code state the intent: *“Burden uses the real loan rate and expected capital loss so deflation raises the cost of buying now. The booked payment uses the contractual nominal loan rate only.”* Tests in `mortgage-choice.test.ts` assert that under large expected deflation the real-rate burden makes mortgage lose to rent. REPORT-v4 still flags purchase originations as low vs the ~3.3%/HH-yr benchmark (§6.1).

**Implication of putting `realRate` into the amortizing payment formula:** under inflation the formula understates early cash payments (the Modigliani–Lessard “tilt”); under deflation it invents a cash payment higher than the contractual nominal payment, so a real-rate-only burden **overstates** cash unaffordability relative to what lenders and households actually write checks for.

### 7.2 Evidence: does demand respond to nominal or real rates?

#### Tilt / payment-to-income (Modigliani & Lessard 1975)

Lessard & Modigliani (“Inflation and the Housing Market: Problems and Potential Solutions,” Boston Fed Conference Series No. 14, 1975) show that a fixed **nominal** level-payment mortgage under inflation **front-loads real payments**: the same real present value requires a higher initial money payment because later payments are eroded by inflation. Their Table 1 (illustrative $20k / 30-year mortgage, $10k income growing with inflation): initial payment/income is **10.0%** at 0% inflation (3% interest), **12.5%** at 2% inflation (5% interest), **15.2%** at 4% inflation (7% interest), **20.9%** at 8% inflation (11% interest). [V] Raw: `/workspace/econ-sim/bench/s7/lessard_modigliani_bostonfed_conf14c.pdf` — [Boston Fed PDF](https://www.bostonfed.org/-/media/Documents/conference/14/conf14c.pdf).

**Direction for the sim:** inflation makes **nominal** payment-to-income bind harder early; deflation does the reverse on the cash payment (nominal payment fixed while incomes/prices fall), but the **real** burden of a fixed nominal contract **rises** over the life of the loan. A rule that only discounts with the real rate therefore gets the cash-flow gate wrong in both directions.

#### Money illusion in housing (Brunnermeier & Julliard 2008)

Brunnermeier & Julliard (RFS 2008; NBER w12810) decompose the price–rent ratio into a rational component and mispricing. Inflation and **nominal** interest rates explain a large share of the mispricing (UK Table 1: inflation alone R² ≈ **0.83** for their ψ̂ mispricing; a 1 pp rise in inflation maps to about a **4.75%** lower price–rent ratio). They argue agents who compare monthly rent to the **nominal** mortgage payment ignore that inflation reduces future real mortgage costs, so falling inflation fuels housing frenzies. They also conclude the **tilt effect is unlikely** to rationalize the inflation–mispricing link (tests: inflation remains significant after controlling for the nominal rate; elasticities do not shrink as PLAMs/GPMs become available). [V] Raw: `/workspace/econ-sim/bench/s7/brunnermeier_julliard_nber_w12810.pdf` — [NBER PDF](https://www.nber.org/system/files/working_papers/w12810/w12810.pdf); journal DOI [10.1093/rfs/hhm043](https://doi.org/10.1093/rfs/hhm043).

#### Cohen–Polk–Vuolteenaho (and related)

Cohen, Polk & Vuolteenaho (QJE 2005 / NBER w11018) document Modigliani–Cohn money illusion in the **stock** market (investors discount real cash flows with nominal rates). Brunnermeier–Julliard cite them as stock-market evidence for the same cognitive mechanism; CPV themselves flag housing as a natural next market but do not deliver a housing test in that paper. [S] Relevant as mechanism support, not as a housing elasticity. [NBER w11018](https://www.nber.org/papers/w11018).

#### Empirical takeaway for “nominal vs real”

| Claim | Support | Tag |
|---|---|---|
| Lenders / DTI gates use **nominal** payment ÷ income | Universal underwriting practice (§7.3) | [V] |
| Observed price–rent mispricing covaries with **inflation / nominal rates**, not real rates | Brunnermeier–Julliard | [V] |
| Correct asset user cost uses **real** rate − expected appreciation (+ tax, depreciation) | Poterba (1984) user-cost tradition; also in BJ and Glaeser–Gottlieb–Gyourko | [S] |
| Tilt: inflation raises early real P&I of FRMs → demand falls via binding payment constraints | Lessard–Modigliani 1975 | [V] |

**Net:** a simple ABM should **gate** on nominal affordability and put real rate / expected price change in a **separate** desirability or user-cost term—not substitute `realRate` into the contractual payment formula.

### 7.3 Debt-service / DTI limits lenders actually apply

All of these are applied to the **nominal** contractual payment (or a stressed nominal payment), never to a real-rate amortizing formula.

| Rule | Limit | Period / note | Source | Tag |
|---|---|---|---|---|
| Traditional “28/36” guideline | Front-end (housing) **~28%**; back-end (all debt) **~36%** of gross income | Longstanding industry rule of thumb; not a hard statute | Common underwriting guidance (e.g. industry summaries); Fannie/Freddie manuals are the binding GSE rules below | [S] |
| Fannie Mae manual DTI | Max total DTI **36%**; up to **45%** with credit/reserve criteria in Eligibility Matrix; Desktop Underwriter casefiles up to **50%** | Current Selling Guide B3-6-02 | [Fannie Mae B3-6-02](https://selling-guide.fanniemae.com/sel/b3-6-02/debt-income-ratios); raw HTML in `bench/s7/` | [V] |
| FHA manual ratios | Housing **31%** / total **43%** of effective income (higher with compensating factors; TOTAL Scorecard can clear higher) | HUD 4155.1 §F | [HUD 4155.1 §F PDF](https://www.hud.gov/sites/documents/4155-1_4_secf.pdf) | [V] |
| CFPB General QM (original ATR/QM) | Total DTI **≤ 43%** (Appendix Q) | In force for General QM from Jan 2014 until replaced | [CFPB General QM final rule page](https://www.consumerfinance.gov/rules-policy/final-rules/qualified-mortgage-definition-under-truth-lending-act-regulation-z-general-qm-loan-definition/) | [V] |
| CFPB General QM (price-based) | Removes the 43% DTI *bright line*; QM if APR < APOR + **2.25 pp** (higher thresholds for small/subordinate loans); creditor must still **consider** DTI or residual income | Final rule Dec 2020 (85 FR 86308); effective Mar 1, 2021; mandatory compliance delayed to **Oct 1, 2022** | [Federal Register 2020-27567](https://www.federalregister.gov/documents/2020/12/29/2020-27567/qualified-mortgage-definition-under-the-truth-in-lending-act-regulation-z-general-qm-loan-definition); [delay rule](https://www.federalregister.gov/documents/2021/04/30/2021-09028/qualified-mortgage-definition-under-the-truth-in-lending-act-regulation-z-general-qm-loan-definition) | [V] |
| Canada GDS / TDS (insured) | **GDS ≤ 39%**, **TDS ≤ 44%**; uninsured judged under OSFI B-20 with a qualifying-rate **stress test** (greater of contract+2 pp or a floor, recently **5.25%**) | Insured statutory caps; B-20 for FRFIs | [OSFI B-20 infosheet](https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/infosheet-residential-mortgage-underwriting-practices-procedures-guideline-b-20); [FCAC Mortgage Qualifier](https://itools-ioutils.fcac-acfc.gc.ca/MQ-HQ/MQCalc-EAPHCalc-eng.aspx?lang=eng) | [V]/[S] |
| UK | FCA MCOB affordability (income vs committed/essential spend, with rate stress). FPC **LTI flow limit**: no more than **15%** of new mortgages at LTI ≥ **4.5** (still in force). FPC **affordability-test / DSTI recommendation withdrawn** effective **1 Aug 2022** | Post-2014 macroprudential toolkit | [BoE FPC withdrawal paper](https://www.bankofengland.co.uk/paper/2022/withdrawal-of-the-fpcs-affordability-test-recommendation); [FCA on FPC mortgage recommendations](https://www.fca.org.uk/firms/fpcs-mortgage-market-recommendation) | [V] |

**Model map:** `affordableMortgageTermYears` (nominal payment vs income) is the right *kind* of gate; a calibrated front-end ratio in the 28–36% band (or ~43% back-end QM-era) is the natural target. Putting `realRate` into the payment used for that gate would diverge from every lender rule above.

### 7.4 Housing / mortgages in deflation episodes

#### United States, 1930s

| Fact | Figure | Source | Tag |
|---|---|---|---|
| Homeownership rate (Census, all occupied units) | **47.8% (1930) → 43.6% (1940)** — century low near 44% in 1940 | [Census Historical Housing Tables — Homeownership](https://www2.census.gov/programs-surveys/decennial/tables/time-series/census-housing-tables/owner.pdf) (`bench/s7/census_owner_occupied.pdf`) | [V] |
| Nonfarm residential+commercial foreclosures | **134,900 (1929) → 252,400 (1933)**; foreclosure rate rose from **3.6 to 13.3 per 1,000** mortgaged structures (Wheelock) | [Wheelock, St. Louis Fed WP 2008-038](https://files.stlouisfed.org/files/htdocs/wp/2008/2008-038.pdf) (`bench/s7/stlouisfed_2008_038.pdf`) | [V] |
| HOLC | Acquired/refinanced **~1 million** delinquent loans, **$3.1B**, ~1933–36 (~10% of nonfarm owner-occupied mortgages) | Same Wheelock paper | [V] |
| Residential construction collapse | By 1933, residential construction only **12.5% of its 1929 level** (and **7.5% of its 1925 peak**) | Gjerstad & Smith in [NBER *Housing and Mortgage Markets in Historical Perspective*](https://www.nber.org/system/files/chapters/c12794/c12794.pdf) (`bench/s7/nber_housing_mortgage_historical.pdf`) | [V] |
| CPI deflation (context) | Cumulative **−24.6%** 1929–33 (see §1 / §2) | FRED CPIAUCNS | [V] |

Mortgages were typically short-term, often non-amortizing / balloon — so “real vs nominal FRM rate in a 30-year payment formula” is anachronistic. The binding constraints were income collapse, falling collateral values, and refinancing failure → foreclosure. HOLC’s innovation was long-term amortizing fixed-payment loans.

#### Japan, 1990s–2000s

| Fact | Figure | Source | Tag |
|---|---|---|---|
| Residential land prices (6 major cities) | Peak **1991**, then **13 consecutive years of decline (1992–2005)** | Kobayashi, ADBI WP 558 (2016), Fig. 7 / text | [V] |
| Homeownership | **61.7% in 2013**; broadly stable near ~60% through the bust (younger-cohort ownership fell later) | Same paper | [V] |
| Mortgage market | Post-bubble: very low rates, heavy prepayment; MDO/GDP discussed as not exploding the way US household leverage did; GHLC/JHF institutional shift | Same paper | [S] |
| Raw PDF | `/workspace/econ-sim/bench/s7/adb_japan_housing_wp558.pdf` | [ADBI WP 558](https://www.adb.org/sites/default/files/publication/181404/adbi-wp558.pdf) | |

Ownership did **not** collapse with land prices; the bust was asset-price / bank / corporate-land heavy more than a US-1930s foreclosure wipeout of household owners.

#### Hong Kong, 1998–2003

| Fact | Figure | Source | Tag |
|---|---|---|---|
| Property prices | Fell **over 60%** on average 1998–2003; other HKMA accounts: **~50% in the first 12 months** from 1997Q3 peak, cumulative peak-to-trough **almost 70%** | [Yam, HKMA Insight, Oct 2005](https://www.hkma.gov.hk/eng/news-and-media/insight/2005/10/20051006/); [Yam, HKMA Insight, Jul 2014](https://www.hkma.gov.hk/eng/news-and-media/insight/2014/07/20140714/) (`bench/s7/hkma_property_bubble_2005.html`) | [V] |
| CPI deflation | CPI **−16.4%** Jul 1998 → Jul 2003 | Same 2014 Insight | [V] |
| Negative-equity mortgages | End-**Jun 2003:** about **106,000** RMLs in negative equity, **HK$165B** outstanding, **HK$36B** unsecured (up from 83k / HK$135B at end-Mar 2003) | [HKMA press release 14 Aug 2003](https://www.hkma.gov.hk/eng/news-and-media/press-releases/2003/08/20030814-4/) (`bench/s7/hkma_neg_equity_2003q2.html`) | [V] |
| Banking resilience | 70% LTV supervisory guidance cited as cushion; mortgage delinquency stayed low vs US GFC | Yam 2005 Insight; [BIS paper on HK macroprudential](https://www.bis.org/publ/bppdf/bispap94k.pdf) | [V]/[S] |

**Deflation lesson for the buy rule:** episodes show demand/origination collapse driven by **income, collateral, LTV, and expected further price falls**, not by households recomputing an amortizing payment at `r − π` with π negative. A real-rate-only payment burden would move for the wrong mechanical reason.

### 7.5 Rate elasticities: originations, prices, lock-in

| Elasticity | Estimate | Population / period | Source | Tag |
|---|---|---|---|---|
| Purchase originations vs effective mortgage rate | **~14%** more FHA-likely purchase originations after a surprise **50 bp** MIP cut (⇒ order **~28% per 100 bp** for that subgroup); up to ~40% of the rise via easing binding **DTI** | US FHA-reliant borrowers, Jan 2015 RD | Bhutta & Ringo, FEDS 2017-086 (`bench/s7/bhutta_ringo_feds_2017086.pdf`) — [Fed PDF](https://www.federalreserve.gov/econres/feds/files/2017086pap.pdf) | [V] |
| Same study, intensive margin / prices | No detectable jump in loan size, purchase price, or neighborhood HPI from the MIP cut | Same | Same | [V] |
| House prices vs real rates (empirical / calibrated semi-elasticity) | Authors use **~6.8** (log price per 1.00 real-rate level, i.e. ~**6.8%** price rise per 100 bp real-rate fall) as a benchmark consistent with their expanded user-cost model; static HMS-style semi-elasticities **>20** are argued to overstate | US, Glaeser–Gottlieb–Gyourko NBER w16230 | (`bench/s7/glaeser_gottlieb_gyourko_w16230.pdf`) — [NBER PDF](https://www.nber.org/system/files/working_papers/w16230/w16230.pdf) | [V] |
| Refi vs purchase | Refi share highly rate-sensitive (see §6.1: refi **35%** of MBA loans in 2022 vs **23%** in 2023 as rates rose) | US MBA | §6.1 sources | [V] |
| Lock-in (2022–24) | Each **1 pp** by which market rate exceeds the borrower’s fixed note rate cuts quarterly sale probability by **18.1%**; lock-in prevented **1.72M** sales **2022Q2–2024Q2** and raised prices **~7.0%** | US FRM owners | FHFA WP 24-03 (`bench/s7/fhfa_wp2403_lockin.pdf`) — [FHFA PDF](https://www.fhfa.gov/document/wp2403.pdf) | [V] |
| Intensive-margin loan size (jumbo notch) | Semi-elasticity of mortgage demand ≈ **2** (loan size) — small | DeFusco & Paciorek AEJ:Policy 2017 | [journal](https://www.aeaweb.org/articles?id=10.1257/pol.20140108) | [S] |

**Model map:** purchase flow should move tens of percent per 100 bp of **nominal** payment-relevant rate when DTI binds (Bhutta–Ringo); house prices move single-digit percent per 100 bp of **real** user cost (Glaeser et al.), not 20%+. Lock-in is a **stock** friction on existing FRMs when market rates rise — separate from the first-time / tenure buy decision, but relevant if the sim later models moves/refis.

### 7.6 Recommendation for a simple agent-based buy decision

**Do not** drive the buy/rent choice off a mortgage payment computed at the real rate. Evidence and lender practice say the cash affordability gate is **nominal payment-to-income / DTI** (roughly front-end 28–36%, or a 40–45% total-debt band; QM once used 43%). Put **expected real user cost**—real rate, expected house-price change / inflation, maintenance—in a **separate desirability or ownership-return term** (the model’s `ownershipCapitalLoss` and a Poterba-style owned cost already point that way). Keep the **booked** payment at the contractual nominal rate (as repo-v5 already does). Under **deflation**, a real-rate-only payment rule invents a higher-than-contractual cash burden and therefore **overstates** unaffordability relative to what households and DTI underwriters see; the historically important deflation channels are falling incomes, falling collateral / LTV breaches, and expected further price declines—not `r − π` inside the annuity formula. Under **inflation**, the same real-rate substitution **understates** early cash payments and mutes the Modigliani–Lessard tilt that actually tightens nominal DTI. Money-illusion evidence (Brunnermeier–Julliard) further justifies letting nominal rates affect perceived attractiveness even when real user cost is held fixed. Practical v5 patch: compute `mortgageBurden` with `monthlyMortgagePayment(..., loanRate, ...)` (nominal) for the payment leg; leave `realRate` only in owned user cost / capital-loss / desirability.

### 7.7 Gaps

- No clean published semi-elasticity of **aggregate** US purchase originations per 100 bp of the Freddie PMMS that is identified as cleanly as Bhutta–Ringo’s FHA MIP RD (macro estimates are confounded).
- Pre-1959 monthly housing-starts microfile not re-tabulated here; 1929→1933 construction drop uses Gjerstad–Smith’s NIPA residential-investment relative levels, not the BLS “starts” headcount series (BLS Bulletin 1260 PDF fetch was non-text).
- Japan: nationwide land-price % peak-to-trough for “all urban” vs “6 major cities” differs; we quote the 6-city 13-year decline narrative from ADBI WP 558, not a single nationwide % I re-summed from MLIT microdata.
- Canada uninsured GDS/TDS caps are lender-set under B-20 (not a single statutory pair like insured 39/44); exact current floor rate for the stress test can change by OSFI notice.
- Cohen–Polk–Vuolteenaho is stock-market evidence only; no housing coefficient to cite.
- Model already mixes nominal gate + real burden; recommendation is to **stop feeding `realRate` into the amortizing payment used for `mortgageBurden`**, not to delete real rates from the model entirely.

## 8. Round 6: Wage cuts in deflation, crisis printing, and 2% targets (2026-10-09 PT)

*Barry's aim: more rational agents. Employers should negotiate job cuts / pay cuts in deflation, and governments should print in crises. Sections 1–7 above are unchanged. Raw sources: `/workspace/econ-sim/bench/s8/` (see `NOTES.md`).*

### 8.0 What the model does now (repo-v5, REPORT-v5)

- **Wages** (`labor.ts`): one economy-wide `wageLevel`; monthly growth = price trend + productivity + `TIGHTNESS_WAGE × outputGap`. A negative gap is damped by `(1 − rigidity)²` (a positive one by `(1 − rigidity)`). Every firm pays `wageLevel × productivity`. So there are **no firm-level pay cuts, no negotiation, and no threshold**: wages deflate *smoothly* whenever rigidity < 1. REPORT-v5 X3 added a blunt `P_WAGE_FLOOR` patch (1%/yr) and found that deflation's cost hinges on wage rigidity plus inherited nominal debt (M: rigidity 0 → unemployment gap ≈0; rigidity 0.95 → +21.6 pp).
- **Crisis policy**: `government.stabilizer` (spending rises with the unemployment gap) and `centralBank.moneyGrowth` both run **only under `regime === 'fiat'`**. Under the bitcoin regime there is no printing and no countercyclical fiscal boost.

### 8.1 Nominal wages in deflations

| Episode | Figure | Period | Source | Tag |
|---|---|---|---|---|
| **US manufacturing, avg hourly earnings** (NBER) | **$0.590 (1929) → $0.589 (1930) → $0.564 (1931) → $0.498 (1932) → $0.491 (1933)**: −16.8% over 1929–33, almost all of it after 1930. CPI fell −24.6% (annual avg 17.16 → 12.93), so **real hourly earnings rose ~10%**. | 1929–33 annual averages, my calculation | [FRED M08142USM055NNBR](https://fred.stlouisfed.org/series/M08142USM055NNBR); [FRED CPIAUCNS](https://fred.stlouisfed.org/series/CPIAUCNS) | [V] |
| US wage rigidity mechanism | Nominal wage scales held through 1930–31 (Hoover's Nov 1929 wage-maintenance conferences; work-sharing), then cut sharply from late 1931 | 1929–33 | [Rose, "Hoover's Truce", NBER w15258](https://www.nber.org/system/files/working_papers/w15258/w15258.pdf) | [S] |
| **Composition bias** | Hourly averages *overstate* stickiness when low-wage workers are laid off first (mix shifts toward higher-paid survivors). Hours per worker also fell (work-sharing), so weekly earnings fell more than hourly. | — | Rose (above); general point in Elsby–Shin–Solon (below) | [S] |
| **Japan, total cash earnings per employee** (MHLW Monthly Labour Survey) | **+1.6% (1997)**, then **−1.3% (1998)**, the first decline since the survey began; real wages also fell in 1998 | 1997–98 | [MHLW 1999 Labour White Paper ch.2](https://www.mhlw.go.jp/toukei_hakusho/hakusho/roudou/1999/dl/03.pdf) | [V] |
| Japan DNWR switch | Downward nominal rigidity for full-time workers existed in 1992–97 and **disappeared after 1998** | 1993–98 microdata | [Kuroda & Yamamoto, BOJ IMES 2005-E-2](https://www.imes.boj.or.jp/research/papers/english/05-E-02.pdf) | [V] |
| Japan manufacturing earnings index (OECD, 2015=100) | 95.7 (1997) → 94.5 (2002) → 100.4 (2008) → **92.8 (2009)** → 98.0 (2013) → 113.3 (2025) | annual averages, my calculation | [FRED LCEAMN01JPM661N](https://fred.stlouisfed.org/series/LCEAMN01JPM661N) | [V] |
| **Japan shunto**: base-up vs total settlement | **Base pay ("base-up") ≈ 0 from the 2000s to 2013.** Rengo base-up: **0.6% (2022), 2.1% (2023), 3.6% (2024)**. Rengo *total* settlements, which include seniority-scale raises: **1.6–1.9% in 2002–13** (e.g. 1.67% 2009), **2.07% (2014)**, **3.58% (2023)**, **5.10% (2024**, first >5% since 1991), 5.25% (2025). Over the deflation decade, the ~1.7% totals were mostly scheduled seniority raises (*teisho*), not base increases. | 2002–2025 | [JILPT Springtime Wage table](https://www.jil.go.jp/english/estatis/eshuyo/e0304.html); [BOJ Outlook Apr 2024 Box](https://www.boj.or.jp/en/mopo/outlook/box/2404box2a.pdf); [JILPT 2025 note](https://www.jil.go.jp/english/jli/documents/2025/051-03.pdf) | [V] (table values); [S] ("base-up ≈ 0" for 2002–13, from BOJ/JILPT text) |
| Japan prices in the same years | Core CPI (ex food & energy, OECD) YoY negative in almost every year **1999–2013**, between **−0.1% and −1.1%** | annual means, my calculation | [FRED CPGRLE01JPM659N](https://fred.stlouisfed.org/series/CPGRLE01JPM659N) | [V] |
| **Euro area 2009–13**, compensation per employee (D1 ÷ employees) | **2009→2013:** Greece **−16.0%** (peak 2009 → 2015 **−20.2%**); Spain **0.0%**; Portugal +1.1% (peak 2010 → 2012 **−4.7%**); Italy +2.9%; Ireland +2.1% (2009→10 **−2.3%**); **Germany +10.6%**; EA20 +7.7% | annual, my calculation | Eurostat [nama_10_gdp](https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp/default/table) D1 and [nama_10_pe](https://ec.europa.eu/eurostat/databrowser/view/nama_10_pe/default/table) SAL_DC (JSON in `bench/s8/`) | [V] |
| Euro area, real hourly compensation | 2010–13 cumulative: **Greece −16.2%, Portugal −7.3%, Spain −5.7%, Italy −3.7%** vs euro area +0.4%. Spain and Portugal adjusted mainly through **job losses**; Greece mainly through wage cuts. Spain's nominal compensation kept rising until 2011Q3, while Ireland's fell from 2008Q4. | 2008–13 | [Perez & Matsaganis (Polimi)](https://re.public.polimi.it/retrieve/e0c31c11-960b-4599-e053-1705fe0aef77/11311-1116770_Matsaganis.pdf); [Kang & Shambaugh IMF WP 14/131](https://www.imf.org/external/pubs/ft/wp/2014/wp14131.pdf) | [S] |
| Composition caveat (euro) | Average compensation per employee *rises* when low-paid jobs disappear. Spain's flat average hides real cuts for stayers plus large low-wage job losses. | — | Kang & Shambaugh (above) | [S] |

**Model implication:** large *nominal* wage cuts show up only in deep, prolonged deflation and/or under external compulsion: US 1931–33 after ~2 years of holding, Japan after 1998, Greece under the Troika. Before that, adjustment runs through **hours and jobs**. The model should **hold nominal wages first and cut employment**, and only allow wage cuts after a **threshold or negotiation**: sustained deflation plus high unemployment, or firm distress. The current rule deflates wages smoothly.

### 8.2 How many workers take nominal pay cuts?

| Measure | Figure | Period / data | Source | Tag |
|---|---|---|---|---|
| **Job stayers, administrative payroll (ADP)** | Only **~2%** of continuing workers get a nominal base-wage cut in a given year (2.4% per year; 0.9% per quarter) | pooled 2008–16 | [Grigsby, Hurst & Yildirmaz (2018/2021 AER)](https://fnce.wharton.upenn.edu/wp-content/uploads/2018/09/hurstaggregate-nominal-wage_nber2018.pdf) | [V] |
| All workers incl. **job changers** (ADP) | **~10%** get a nominal cut per year, almost all of them job changers; **~11.8%** during the Great Recession. Cuts concentrated in shrinking firms and in areas with big house-price falls. | 2008–16 | same | [V] |
| Job stayers, **CPS household survey** | Share reporting a nominal *cut* is always **>10% for hourly** and **>20% for non-hourly** workers (inflated by reporting error) | 1980s–2011 | [Elsby, Shin & Solon NBER w19478 / JOLE 2016](https://www.nber.org/system/files/working_papers/w19478/w19478.pdf) | [V] |
| UK payroll (NES/ASHE), stayers | Year-on-year cut share **5% (1979–80, ~20% inflation) to 22% (1996–97)**; zero-change spike usually <3% | 1975–99 (Nickell–Quintini, cited by ESS) | ESS above | [V] |
| **Zero-change spike** (CPS, same job) | **11.2–12% (2006–07) → 16% (2011)**, the highest in their 1983–2011 sample. The spike lags the unemployment rise and persists into recovery; *cuts* rose only slightly. | 1983–2011 | [Daly & Hobijn, FRBSF EL 2012-10](https://www.frbsf.org/wp-content/uploads/el2012-10.pdf); [FRBSF WP 2013-08](https://www.frbsf.org/economic-research/wp-content/uploads/sites/4/wp2013-08.pdf) | [V] |
| UI administrative data (cited) | **~20%** of job stayers had *earnings-per-hour* cuts; <10% frozen (affected by hours measurement) | WA/OR UI studies, cited by FVW | [Fallick, Villar & Wascher FEDS 2016-001r1](https://www.federalreserve.gov/econres/feds/files/2016001r1pap.pdf) | [S]/[C] |
| Establishment (BLS ECI microdata) | Significant DNWR; **no sign that Great Recession distress reduced it** (operative rigidity countercyclical); much less rigidity at 2–3-year horizons | 1980s–2010s | FVW (above) | [V] |
| Theory anchor | Akerlof, Dickens & Perry (1996, BPEA): DNWR at very low inflation raises sustainable unemployment | 1996 | [Brookings BPEA 1996:1](https://www.brookings.edu/articles/the-macroeconomics-of-low-inflation/) (PDF fetch 404) | [U] (not re-read) |

**Contested:** payroll data (ADP) says ~2% of stayers get cuts; household surveys say 10–20%+ and are noisy. The gap is measurement (base wage vs earnings per hour, recall error). **Model implication:** for stayers, cuts should be **rare in normal years** (a few percent) and rise to roughly **≈10–12% of workers** in a deep recession, mostly through **job changes / rehiring at lower wages and firm distress**. A plausible rule: firms cut base pay only when distressed and deflation persists; otherwise they lay off, and new hires come in at market wages. This argues for **firm-level wages** in place of one aggregate index.

### 8.3 Okun and wage-Phillips slopes in recessions

| Measure | Figure | Source | Tag |
|---|---|---|---|
| Okun (levels), US | **≈ −0.4** (cross-ref §1: Ball–Leigh–Loungani, 1948–2011) | [NBER w18668](https://www.nber.org/papers/w18668) (`bench/s8/ball_leigh_loungani_w18668.pdf`) | [V] (§1) |
| Okun, recessions vs expansions | Coefficient is **larger in absolute value in recessions**: unemployment reacts more to output falls than to rises (Owyang & Sekhposyan 2012; Knotek 2007; also regime-switching studies) | [Owyang & Sekhposyan, St. Louis Fed Review 2012](https://www.fedinprint.org/item/fedlrv/24923) | [S] (PDF served HTML; exact coefficients not re-read) |
| Wage Phillips flattening | OLS slope −0.58 (1986–2007) → **−0.11 (2007Q3–2017)**; IV-style −0.74 → **−0.29** (cross-ref §1) | [Galí & Gambetti NBER w25476](https://www.nber.org/papers/w25476) | [V] (§1) |
| Convexity from DNWR | With DNWR the wage Phillips curve is **flatter in slack** (cuts are blocked), steeper when tight; pent-up cuts slow wage growth in recoveries | Daly & Hobijn WP 2013-08 | [V] |
| Unemployment rise in recessions | **+2.3 to +5.6 pp** (postwar); 2020: +11.3 pp (cross-ref §1) | FRED UNRATE | [V] (§1) |

**Model implication:** in recessions unemployment should respond more strongly (Okun asymmetry), and wage growth should flatten toward zero instead of going negative. REPORT-v5 T3 correlation (S2 −0.88) is far stronger than any flattened empirical slope. A **kinked rule** (wages stick at zero, layoffs absorb the shock) would deliver both patterns.

### 8.4 Crisis responses: fiscal and monetary "printing"

| Episode | Figure | Period | Source | Tag |
|---|---|---|---|---|
| **US federal deficit** | −1.1% (2007) → −3.1% (2008) → **−9.8% (2009)** → −8.6% (2010); −4.6% (2019) → **−14.5% (2020)** → −11.7% (2021) → −5.3% (2022) | fiscal years, % GDP | [FRED FYFSGDA188S](https://fred.stlouisfed.org/series/FYFSGDA188S) | [V] |
| **Fed balance sheet, GFC** | **$0.91T (Aug 2008, 6.1% of GDP) → $2.24T (Dec 2008, 15.3%) → $4.50T (Dec 2014, ~25%)** | weekly, my calculation | [FRED WALCL](https://fred.stlouisfed.org/series/WALCL), [GDP](https://fred.stlouisfed.org/series/GDP) | [V] |
| QE programs | **QE1** (Nov 2008, expanded Mar 2009): $1.25T agency MBS + $200B agency debt + $300B Treasuries. **QE2** (Nov 2010–Jun 2011): $600B Treasuries. **QE3** (Sep 2012–Oct 2014): open-ended $40B/mo MBS, + $45B/mo Treasuries from Jan 2013 (~$85B/mo) | — | [Fed balance-sheet timeline](https://www.federalreserve.gov/monetarypolicy/timeline-balance-sheet-policies.htm); [NY Fed LSAP archive](https://www.newyorkfed.org/markets/programs-archive/large-scale-asset-purchases) | [V]/[S] |
| **Fed balance sheet, 2020** | **$4.16T (Feb 2020, 19.1% of GDP) → $7.17T (Jun 2020, 35.9%) → peak $8.97T (13 Apr 2022, 34.7%)**; $6.75T (Oct 2026, 20.7%) | weekly, my calculation | FRED WALCL, GDP | [V] |
| ECB balance sheet | €1.40T (Jul 2008, ~14.5% of annual EA GDP) → €3.10T (Jun 2012) → **peak €8.84T (Jun 2022, ~65%)** | weekly, my calculation | [FRED ECBASSETSW](https://fred.stlouisfed.org/series/ECBASSETSW), [EUNNGDP](https://fred.stlouisfed.org/series/EUNNGDP) | [V] |
| **Japan: did it print?** Yes, repeatedly. | BOJ assets **¥80T (Apr 1998, ~15% of GDP) → ¥115T (Mar 2001) → ¥145T (Mar 2006, ~27%)** in QE1; ¥158T (Dec 2012, ~32%) → **¥457T (Sep 2016, ~82%) → ¥604T (Mar 2020, ~107%) → ¥756T (Mar 2024, ~122%)**; ¥625T (Sep 2026, ~91%) | monthly, my calculation | [FRED JPNASSETS](https://fred.stlouisfed.org/series/JPNASSETS), [JPNNGDP](https://fred.stlouisfed.org/series/JPNNGDP) | [V] |
| BOJ policy timeline | Zero rate 1999; **QE (current-account target) Mar 2001–Mar 2006**; Comprehensive Easing Oct 2010; **2% target Jan 2013**; **QQE Apr 2013** (monetary-base target); later NIRP/YCC | — | [BOJ unconventional measures ref](https://www.boj.or.jp/en/mopo/outline/bpreview/ref.htm); [QQE statement](https://www.boj.or.jp/en/mopo/mpmdeci/mpr_2013/k130404a.pdf) | [V] |
| Japan outcome | Despite a balance sheet >100% of GDP, core CPI stayed **≈0 or negative through 2013** and near 0–1% until the 2022 global shock (2012–19 headline mean ≈0.7%) | — | FRED CPGRLE01JPM659N / JPNCPIALLMINMEI | [V] |
| **1930s gold constraint** | Under gold convertibility, central banks had to defend parity and gold reserves, which limited monetary expansion and transmitted deflation internationally. **UK suspended gold on 21 Sep 1931**; **US suspended convertibility / banned gold exports April 1933**; **Gold Reserve Act (30–31 Jan 1934) set $35/oz vs $20.67** (~41% devaluation of the dollar in gold) | 1931–34 | [UK Gold Standard (Amendment) Act 1931 text](https://www.gold.org/sites/default/files/documents/after-the-gold-standard/1931sep21.pdf); [Fed History: Roosevelt's Gold Program](https://www.federalreservehistory.org/-/media/Project/FedHistory/FedHistory/Documents/essaysPDFs/Roosevelts-Gold-Program--Federal-Reserve-History.pdf); [1934 proclamation](https://www.gold.org/sites/default/files/documents/after-the-gold-standard/1934jan31.pdf) | [V] |
| Earlier exit, faster recovery | Countries that left gold earlier and depreciated more (UK, Scandinavia) had higher 1935 industrial production relative to 1929 than the Gold Bloc (France, Netherlands, Belgium), through lower real wages and interest rates | 1929–35 | [Eichengreen & Sachs NBER w1498 (1985)](https://www.nber.org/system/files/working_papers/w1498/w1498.pdf); [Bernanke (1995)](https://fraser.stlouisfed.org/files/docs/meltzer/bermac95.pdf) | [V] (finding) / [S] (country values not re-tabulated) |
| US fiscal in the 1930s | Deficits only **−4.6% of GDP (1932–33)**, −5.4% (1934), −5.1% (1936): small next to 2009/2020 | fiscal years | FRED FYFSGDA188S | [V] |

**Model implication:** real fiat governments run deficits of **~10–15% of GDP** and expand central-bank balance sheets by **~15–30 pp of GDP** within 1–2 years of a deep shock. Japan shows that printing can coexist with ~0% inflation when wages and expectations are stuck. A **gold-like regime** (≈ the bitcoin arm) removes the printing tool; the 1930s pattern is that exit from the constraint, not staying in it, preceded recovery. For "rational governments", give fiat a rule-based crisis response (deficit and QE scaled to the unemployment gap, roughly the sizes above). For the bitcoin arm, either allow fiscal borrowing only (bonds, no money creation) or model an "exit/suspension" option, the historical escape hatch.

### 8.5 Do central banks target 2%, and how often do they miss?

| Bank | Target | Adopted | Source | Tag |
|---|---|---|---|---|
| Fed | **2% PCE**, longer-run goal | **25 Jan 2012** | [FOMC Statement on Longer-Run Goals](https://www.federalreserve.gov/monetarypolicy/files/FOMC_LongerRunGoals_201201.pdf) | [V] |
| ECB | "below but **close to 2%**" HICP over the medium term (made symmetric 2% in the 2021 strategy review) | **8 May 2003** clarification | [ECB PR 8 May 2003](https://www.ecb.europa.eu/press/pr/date/2003/html/pr030508_2.en.html) | [V] / [S] for 2021 |
| BoE | **2% CPI** (replacing 2.5% RPIX); open letter if ±1 pp | **10 Dec 2003** remit | [Chancellor's remit letter](https://www.bankofengland.co.uk/-/media/boe/files/letter/2003/chancellor-letter-101203.pdf) | [V] |
| BOJ | **2% CPI** "price stability target" | **22 Jan 2013** (QQE Apr 2013) | [BOJ ref](https://www.boj.or.jp/en/mopo/outline/bpreview/ref.htm) | [V] |

**Miss frequency (my calculations, monthly YoY):**
- **Post-GFC undershoot, 2012–19.** US PCE averaged **1.37%** and was below 2% in **87%** of months. US CPI averaged 1.61% (66% of months below 2%). Euro HICP averaged **1.15%** (83% below 2%). UK CPI (OECD MEI) averaged 1.79% (53% below 2%). Japan CPI averaged 0.71% (87% below 2%). [V] Sources: FRED [PCEPI](https://fred.stlouisfed.org/series/PCEPI), [CPIAUCSL](https://fred.stlouisfed.org/series/CPIAUCSL), [CP0000EZ19M086NEST](https://fred.stlouisfed.org/series/CP0000EZ19M086NEST), [GBRCPIALLMINMEI](https://fred.stlouisfed.org/series/GBRCPIALLMINMEI), [JPNCPIALLMINMEI](https://fred.stlouisfed.org/series/JPNCPIALLMINMEI).
- **Post-2020 overshoot.** Peaks: US CPI **9.0%** (Jun 2022; BLS NSA headline 9.1%); US PCE **7.2%** (Jun 2022); euro HICP **10.6%** (Oct 2022); UK CPI **9.6%** on the OECD MEI series (Oct 2022). ONS headline was 11.1%. [V]/[C] (the series differ). Japan core ex fresh food peaked at **4.2%** (Jan 2023), the highest since 1981. [S] ([Kyodo](https://english.kyodonews.net/articles/-/38966); FRED Japan series ends 2021.)

**Model implication:** a "rational" fiat central bank should target ~2% but miss for years at a time. Expect a **persistent undershoot after a debt/banking bust** (2012–19: about 0.5–1 pp below target) and a **large overshoot after a big fiscal-plus-monetary push combined with supply shocks** (2021–23: 5–9 pp above at peak). So `centralBank.moneyGrowth` plus the stabilizer should not hit 2% exactly within a few months of a shock.

### 8.6 Summary: model changes the benchmarks point to

| Benchmark | Current v5 behavior | Suggested rule |
|---|---|---|
| Nominal cuts are rare for stayers (~2% per year) and rise to ~10–12% of workers in deep recessions | Smooth aggregate wage deflation scaled by `(1−rigidity)²` | Firm-level wages. Hold nominal pay, then cut jobs/hours first. Cut base pay only past a threshold: deflation persisting ≥ ~1–2 years, firm losses, local unemployment high. New hires get market wages. |
| Big nominal cuts only in deep deflation or under compulsion (US 1931–33 −17% mfg; Greece −16 to −20%; Japan after 1998) | Same rule in every episode | Negotiated, lumpy cuts (annual, shunto-like) once the threshold trips |
| Okun stronger in recessions; Phillips flat in slack | T3 correlation −0.88 | Kink at zero wage growth; layoffs absorb the shock |
| Fiat crisis: deficits 10–15% of GDP; CB balance sheet +15–30 pp of GDP | Stabilizer and moneyGrowth are fiat-only and modest | Rule-based crisis package sized to the unemployment gap; let inflation miss 2% for years |
| Gold-like regimes cannot print; exiting gold preceded recovery | Bitcoin arm: no printing, no stabilizer | Bond-financed fiscal stabilizer in the bitcoin arm, and/or an explicit suspension/exit scenario |

### 8.7 Gaps

- Owyang–Sekhposyan exact recession/expansion Okun coefficients not re-read (the PDF link served HTML). Asymmetry is tagged [S].
- Akerlof–Dickens–Perry 1996 not re-read (Brookings PDF 404). No figure is quoted from it.
- US 1929–33 is manufacturing only. I did not re-tabulate an economy-wide nominal wage series (e.g. NIPA compensation per FTE) or a composition-adjusted series.
- Japan base-up for 2002–13 is "≈0" from BOJ/JILPT text. The Central Labour Relations Commission yearly base-up values were not extracted.
- Euro-area numbers are compensation per employee (composition-affected). No stayer-level microdata for the periphery.
- UK 2022 peak differs between the OECD MEI series (9.6%) and ONS headline (11.1%). Japan 2022–23 is from press (FRED series ends 2021).
- Kang–Shambaugh IMF WP (403) and Reuters (401) not saved. Their claims are cross-sourced [S].
