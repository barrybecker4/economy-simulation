"""Dump every data-v10/review/*.json group to results-v10/V10_probes.md, plus the rebate-off and legacy gap tables."""
import json, glob, os
K = ['n', 'errors', 'unemployment_y2_20', 'inflation_y2_20', 'moneySupply_end_rel', 'cumulativeFailures', 'medianRealCons_end', 'gini_end',
     'policyRateMax', 'unemployment_m60_96', 'money_m96_over_m60', 'cpi_m96_over_m60', 'wageGrowthYr_y2_20', 'wageCutMonthShare',
     'stimPosMonths', 'stimNegMonths', 'stimMinAnnual', 'stimMaxAnnual', 'maxUJumpAll', 'fiatShare_end']
def fmt(v):
    if v is None: return '-'
    if isinstance(v, float): return f'{v:.4g}'
    return str(v)
L = ['# Round 10 probe groups (scripts-v10/review_check.mjs, v10 ee3e4c3)', '',
     'v8 defaults (choiceSpeed 0). _noRebate = patched-v10 P_NO_REBATE. Seeds per group in the n column. 500 HH / 50 firms / 3 banks, 240 months, AI off, random shocks off unless the id says otherwise.', '']
for f in sorted(glob.glob('data-v10/review/*.json')):
    try: d = json.load(open(f))
    except Exception: continue
    ks = [k for k in K if any(k in r and r[k] is not None for r in d.values())]
    L += [f'## {os.path.basename(f)[:-5]}', '', '| cond | ' + ' | '.join(ks) + ' |', '|---|' + '---|' * len(ks)]
    for c, r in d.items():
        L.append(f'| {c} | ' + ' | '.join(fmt(r.get(k)) for k in ks) + ' |')
        if r.get('errMsg'): L.append(f'| ↳ error | {r["errMsg"]} |')
    L.append('')
# rebate-off gap table
def gap(d, s):
    f, b = d.get(f'{s}|fiat'), d.get(f'{s}|bitcoin')
    if not f or not b or not f.get('n') or not b.get('n'): return None
    return 100 * (b['medianRealCons_end'] / f['medianRealCons_end'] - 1), 100 * (b['unemployment_y2_20'] - f['unemployment_y2_20'])
L += ['## Rebate on vs off (P_NO_REBATE), bitcoin minus fiat, 10 seeds (mean-of-medians consumption ratio)', '', '| structure | default rebate on | default rebate off | cs0 rebate on | cs0 rebate off | legacy pins |', '|---|---|---|---|---|---|']
D = {k: json.load(open(f'data-v10/review/{k}.json')) for k in ['base', 'base_noRebate', 'base_cs0', 'base_noRebate_cs0', 'base_legacy'] if os.path.exists(f'data-v10/review/{k}.json') and os.path.getsize(f'data-v10/review/{k}.json') > 0}
for s in ['S0', 'S1', 'S2', 'S3', 'M', 'D']:
    cells = []
    for k in ['base', 'base_noRebate', 'base_cs0', 'base_noRebate_cs0', 'base_legacy']:
        g = gap(D[k], s) if k in D else None
        cells.append('-' if g is None else f'{g[0]:+.1f}% / {g[1]:+.2f} pp')
    L.append(f'| {s} | ' + ' | '.join(cells) + ' |')
open('results-v10/V10_probes.md', 'w').write('\n'.join(L) + '\n'); print('\n'.join(L[-9:]))
