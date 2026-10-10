import json, glob, os, numpy as np
D = {}
for f in sorted(glob.glob('/workspace/econ-sim/data-v10/review/*.json')):
    D.update(json.load(open(f)))
cols = ['n','errors','treasuryShare_m48','treasuryShare_m239','totalMoney_m48','totalMoney_m239','privateMoney_m239','taxOverGovSpend_cum','rebatedShareOfOpeningMoney','inflation_y2_20','unemployment_y2_20','medianRealCons_end','gini_end','velocity_end','creditToGdp_end','rentShare_end','cumulativeFailures','originations_total','originations_tick1','originations_after12','foreclosures_total','windfall_depositChangeMonthsIncome']
lines = ['| condition | ' + ' | '.join(cols) + ' |', '|' + '---|' * (len(cols) + 1)]
def fmt(v):
    if v is None: return '–'
    if isinstance(v, float): return f'{v:.3f}' if abs(v) < 100 else f'{v:.0f}'
    return str(v)
for k, v in D.items():
    lines.append(f'| {k} | ' + ' | '.join(fmt(v.get(c)) for c in cols) + ' |')
def pct(a): a = np.array(a); return f'{a.mean()*100:+.1f}% [{np.percentile(a,5)*100:+.1f}, {np.percentile(a,95)*100:+.1f}]'
def pp(a): a = np.array(a); return f'{a.mean()*100:+.2f}pp [{np.percentile(a,5)*100:+.2f}, {np.percentile(a,95)*100:+.2f}]'
lines += ['', '## Paired bitcoin − fiat gaps (20 seeds; mean [5th, 95th pct])', '', '| variant | Δ median real consumption (yr 20, %) | Δ unemployment (yrs 2–20) | fiat infl | btc infl |', '|---|---|---|---|---|']
for k in D:
    if '|fiat' in k and not k.startswith('S2'):
        kb = k.replace('|fiat', '|bitcoin')
        if kb not in D: continue
        f, b = D[k], D[kb]
        dc = [bb / ff - 1 for ff, bb in zip(f['_cons'], b['_cons'])]
        du = [bb - ff for ff, bb in zip(f['_u'], b['_u'])]
        lines.append(f"| {k.replace('|fiat','')} | {pct(dc)} | {pp(du)} | {f['inflation_y2_20']*100:+.2f}% | {b['inflation_y2_20']*100:+.2f}% |")
lines += ['', '## S2 adverse supply shock (−10% productivity at month 60): shocked − unshocked, months 60–83 unemployment and months 60–143 GDP', '', '| policy | variant | Δ unemployment m60–83 | GDP loss m60–143 |', '|---|---|---|---|']
for tag in ('orig', 'noSupplyMult'):
    for p in ('fiat', 'fiat+stabilizer', 'bitcoin'):
        a, s = D[f'S2|{p}|none|{tag}'], D[f'S2|{p}|supply|{tag}']
        du = [y - x for x, y in zip(a['_uShock'], s['_uShock'])]
        gl = [1 - y / x for x, y in zip(a['_gdpPost'], s['_gdpPost'])]
        lines.append(f'| {p} | {tag} | {pp(du)} | {pct(gl)} |')
open('/workspace/econ-sim/results-v10/review_check.md', 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
