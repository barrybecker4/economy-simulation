"""Tables for the round-6 mechanism and steering probes (review_check groups). Writes ../results-v10/V6_mechanisms.md"""
import json, os, sys, numpy as np
R = os.path.join(os.path.dirname(__file__), '..', 'data-v10', 'review')
COLS = [('n','n',0),('unemployment_y2_20','u %',100),('inflation_y2_20','CPI %/yr',100),('totalMoney_m239','money ×',1),('cumulativeFailures','failures',1),
        ('medianRealCons_end','med cons',1),('wageGrowthYr','wage %/yr',100),('wageCutMonthShare','wage-cut months',100),('postedOverAgreed_y2_20','posted/agreed −1 %',100),
        ('foreclosures_total','foreclosures',1),('rentShare_end','renters %',100),('equity_end_rel','bank equity/M0',1)]
def load(g):
    p = os.path.join(R, g + '.json')
    return json.load(open(p)) if os.path.exists(p) and os.path.getsize(p) else {}
def fmt(v, k):
    if v is None: return '—'
    return f'{v*k:.2f}' if k == 100 else (f'{v:.0f}' if k == 0 else f'{v:.3f}')
def table(g, cols=COLS):
    d = load(g)
    if not d: return f'({g}: no data)\n'
    L = ['| arm | ' + ' | '.join(c[1] for c in cols) + ' |', '|' + '---|' * (len(cols) + 1)]
    for k, v in d.items():
        L.append(f'| {k} | ' + ' | '.join(fmt(v.get(c[0]), c[2]) for c in cols) + ' |')
    return '\n'.join(L) + '\n'
def paired(g, a, b, key, rel=False):
    d = load(g); A, B = d[a], d[b]
    sa = dict(zip(A['_seedsOk'], A[key])); sb = dict(zip(B['_seedsOk'], B[key]))
    v = [(sb[s] / sa[s] - 1) if rel else (sb[s] - sa[s]) for s in sa if s in sb and (not rel or sa[s])]
    return np.mean(v), np.percentile(v, 5), np.percentile(v, 95), len(v)
out = ['# Round-6 mechanism probes (review_check.mjs groups; shock frequency 0 unless the arm says otherwise; 20 seeds, stimulus 10)\n']
for g, title, cols in [
    ('wages', 'Wage negotiation by rigidity (default 0.9)', COLS), ('wagesNoBook', 'Wages, M with no opening book', COLS),
    ('wageElast', 'Hiring elasticity 0 ("no adjustment friction" benchmark) and rigidity 0', COLS),
    ('freeze', 'Near-frozen fiat (moneyGrowth floor 0.05) vs bitcoin; stimulus 0.05 / 1 / 2', COLS),
    ('premium', 'Housing monetary premium', COLS), ('gaps', 'M gaps by legacy book × premium (shock frequency 0.1)', COLS),
    ('realmort', 'Transition real mortgage', COLS), ('sink', 'Bank-equity sink: pass-through × book', COLS),
    ('base', 'Base arms (shock 0)', COLS), ('hybrid', 'Hybrid', COLS), ('resolution', 'Resolution off', COLS), ('subsidy', 'Subsidy', COLS),
    ('channels', 'Channels (S3 fiat)', COLS), ('hoardNewLoans', 'Hoard3 channels', COLS), ('tenure', 'S0 tenure', COLS), ('mortgage', 'Mortgage', COLS)]:
    out.append(f'## {title} (`{g}`)\n\n' + table(g, cols))
SC = [('n','n',0),('unemployment_m60_96','u m60–96 %',100),('inflation_m60_96','CPI m60–96 %/yr',100),('money_m96_over_m60','money m96/m60',1),('cpi_m96_over_m60','CPI m96/m60',1),('moneyGrowthYr_m60_84','money g m60–84 %/yr',100),('cumulativeFailures','failures',1)]
for g in ('slump', 'stimulus'):
    d = load(g)
    if not d: continue
    out.append(f'## Forced shocks at month 60 (`{g}`)\n\n' + table(g, SC))
    rows = ['| arm | Δmoney vs calm % | ΔCPI vs calm pp (m60–96 avg) | Δu vs calm pp (m60–96) |', '|---|---|---|---|']
    for k in d:
        if k.endswith('|none'): continue
        base = k.rsplit('|', 1)[0] + '|none'
        if base not in d or 'money_m96_over_m60' not in d[k]: continue
        a, b = d[base], d[k]
        rows.append(f"| {k} | {(b['money_m96_over_m60']/a['money_m96_over_m60']-1)*100:+.1f} | {(b['inflation_m60_96']-a['inflation_m60_96'])*100:+.2f} | {(b['unemployment_m60_96']-a['unemployment_m60_96'])*100:+.2f} |")
    out.append('Relative to the calm arm with the same settings (month 96 vs month 60):\n\n' + '\n'.join(rows) + '\n')
# paired M gaps from 'gaps'
d = load('gaps')
if d:
    rows = ['| book | premium | Δu bitcoin−fiat pp | ΔCPI pp/yr | Δmedian cons % [5,95] | Δfailures | bitcoin money × | hybrid−fiat Δcons % |', '|---|---|---|---|---|---|---|---|']
    for bk in ('0.62', '0'):
        for pm in ('0', '0.5'):
            f, b, h = f'M|fiat|book{bk}|premium{pm}', f'M|bitcoin|book{bk}|premium{pm}', f'M|hybrid|book{bk}|premium{pm}'
            if f not in d or b not in d: continue
            du = paired('gaps', f, b, '_u'); dc = paired('gaps', f, b, '_cons', True); dp = paired('gaps', f, b, '_cpiYr'); df = paired('gaps', f, b, '_fail')
            dh = paired('gaps', f, h, '_cons', True) if h in d else (np.nan,)*4
            rows.append(f'| {bk} | {pm} | {du[0]*100:+.2f} [{du[1]*100:+.1f}, {du[2]*100:+.1f}] | {dp[0]*100:+.2f} | {dc[0]*100:+.1f} [{dc[1]*100:+.1f}, {dc[2]*100:+.1f}] | {df[0]:+.1f} | {d[b]["totalMoney_m239"]:.2f} | {dh[0]*100:+.1f} |')
    out.append('## M bitcoin − fiat gaps, paired by seed, by legacy book × monetary premium (shock frequency 0.1, 20 seeds)\n\n' + '\n'.join(rows) + '\n')
open(os.path.join(os.path.dirname(__file__), '..', 'results-v10', 'V6_mechanisms.md'), 'w').write('\n'.join(out))
print('\n'.join(out))
