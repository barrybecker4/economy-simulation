import json
d = json.load(open('/workspace/econ-sim/data-v10/validity.json'))
L = []
def p(x, pct=False):
    if x is None: return '–'
    if isinstance(x, (int, float)): return f'{x*100:+.2f}%' if pct else (f'{x:.4g}')
    return str(x)
L += ['### T1: +50% helicopter money at month 60 (household deposits ×1.5 with matching reserves), change vs same-seed control, 10 seeds', '', '| config | CPI +24m | CPI +96m | GDP +24m | GDP +96m | broad money +96m |', '|---|---|---|---|---|---|']
for k, v in d['T1'].items(): L.append(f"| {k} | {p(v['cpi24']['mean'],1)} | {p(v['cpi96']['mean'],1)} | {p(v['gdp24']['mean'],1)} | {p(v['gdp96']['mean'],1)} | {p(v['money96']['mean'],1)} |")
L += ['', '### T2: +15% demand impulse at month 60, change at month 71 vs control, 10 seeds', '', '| config | CPI | wage | unemployment (pp) | GDP |', '|---|---|---|---|---|']
for k, v in d['T2'].items(): L.append(f"| {k} | {p(v['cpi']['mean'],1)} | {p(v['wage']['mean'],1)} | {v['u']['mean']*100:+.2f} | {p(v['gdp']['mean'],1)} |")
L += ['', '### T3: Phillips correlation (12-month wage growth vs unemployment, random shocks)', '', f"S0 {d['T3']['S0']['corrWageGrowthVsUnemployment']:.2f}, S2 {d['T3']['S2']['corrWageGrowthVsUnemployment']:.2f} (n = 360 each)", '']
L += ['### T4: independent conservation check (bank identity change per phase), seed 1, 240 ticks', '', '| config | max per-phase residual change | annual money growth | cash home buys (paid → firm gain) |', '|---|---|---|---|']
for k, v in d['T4'].items():
    if 'error' in v: L.append(f"| {k} | ERROR {v['error'][:80]} | | |"); continue
    L.append(f"| {k} | {max(abs(x) for x in v['maxPhaseResidualChange'].values()):.2g} | {p(v.get('annualMoneyGrowth'),1)} | {v.get('cashBuys')} ({v.get('cashPaid')} → {v.get('firmGainInCashPhases')}) |")
L += ['', '### T5: steady state (no shocks), months 120–179, 10 seeds', '', '| config | mean unemployment | within-run SD |', '|---|---|---|']
for k, v in d['T5'].items(): L.append(f"| {k} | {v['meanU']*100:.1f}% | {v['withinRunSdU']*100:.2f} pp |")
L += ['', '### T6: annual broad-money growth vs inflation, 5 seeds (mg0.05 = moneyGrowth 0.05, the v6 floor)', '', '| config | money growth | inflation |', '|---|---|---|']
for k, v in d['T6'].items(): L.append(f"| {k} | {p(v['annualMoneyGrowth'],1)} | {p(v['annualInflation'],1)} |")
L += ['', '### T6b (new): Barry\'s fiat-undershoot / injection fixes, 5 seeds', '', '| config | money growth | inflation | velocity yr 20 (/month) |', '|---|---|---|---|']
for k, v in d['T6b'].items(): L.append(f"| {k} | {p(v['annualMoneyGrowth'],1)} | {p(v['annualInflation'],1)} | {v['velocityEnd']:.4f} |")
L += ['', '### T7: posted vs paid household deposit rate (20-year averages)', '', '| config | posted | paid | paid/posted | credit/GDP end |', '|---|---|---|---|---|']
for k, v in d['T7'].items():
    if 'error' in v: L.append(f"| {k} | CRASH at tick {v['ticksBeforeCrash']}: {v['error']} | | | |"); continue
    L.append(f"| {k} | {p(v['avgPostedDepositRate'],1)} | {p(v['avgPaidDepositRate'],1)} | {v['avgPaidDepositRate']/v['avgPostedDepositRate']:.2f} | {v['creditToGdpEnd']:.3f} |")
L += ['', '### T8 (new): where new fiat money first lands (S3 fiat, seed 1, centralBank phase)', '', '| channel | households | firms | government | Q1 households | Q5 households | expanding ticks |', '|---|---|---|---|---|---|---|']
for k, v in d['T8'].items(): L.append(f"| {k} | {v['shareHouseholds']:.0%} | {v['shareFirms']:.0%} | {v['shareGovernment']:.0%} | {v['shareQ1households']:.1%} | {v['shareQ5households']:.1%} | {v['ticksExpanding']} |")
L += ['', '### T10 (new): tenure flows and bank resolution, 5 seeds, per 20-year run', '', '| config | renter→mortgage | mortgage→rent (foreclosure) | mortgage→owned | credit/GDP end | rent share end | min real agg. bank equity | share of ticks agg. equity < 0 | cumulative failures |', '|---|---|---|---|---|---|---|---|---|']
for k, v in d['T10'].items():
    pr = v['perRun']
    L.append(f"| {k} | {pr.get('rent->mortgage',0):.1f} | {pr.get('mortgage->rent',0):.1f} | {pr.get('mortgage->owned',0):.1f} | {pr.get('creditToGdpEnd',0):.3f} | {pr.get('rentShareEnd',0):.1%} | {v['minRealAggBankEquity']:.1f} | {v['shareTicksNegativeAggEquity']:.0%} | {v['cumulativeFailuresPerRun']:.1f} |")
L += ['', '### T11 (new): one-step vs gradual (gradualWeight 1) transition, S0, length 12, hc 0.5', '', '| month | one-step Gini | gradual Gini | one-step top-10% | gradual top-10% |', '|---|---|---|---|---|']
for m in d['T11']['one-step']:
    a, b = d['T11']['one-step'][m], d['T11']['gradual1'][m]
    L.append(f"| {m} | {a['gini']:.3f} | {b['gini']:.3f} | {a['top10']:.1%} | {b['top10']:.1%} |")
open('/workspace/econ-sim/results-v10/validity.md', 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[-40:]))
