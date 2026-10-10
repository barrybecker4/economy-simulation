import json, numpy as np, collections
def load(name):
    g = collections.defaultdict(dict)
    for l in open(f'/workspace/econ-sim/data-v10/{name}.jsonl'):
        r = json.loads(l)
        if 'series' in r: g[r['cond']][r['seed']] = r
    return g
out = {}
E4 = load('E4_shocks')
for s, pol in (('S0', 'fiat'), ('S0', 'bitcoin'), ('S2', 'fiat'), ('S2', 'bitcoin'), ('S0', 'fiat+stabilizer')):
    a, b = E4[f'{s}|{pol}|none|rig0.7'], E4[f'{s}|{pol}|demand|rig0.7']
    xs, ys, peaks_u, peaks_y = [], [], [], []
    for sd in a:
        un, us = np.array(a[sd]['series']['unemployment']), np.array(b[sd]['series']['unemployment'])
        gn, gs = np.array(a[sd]['series']['realGdp']), np.array(b[sd]['series']['realGdp'])
        du = (us - un)[60:84] * 100; dy = (gs / gn - 1)[60:84] * 100
        xs += list(dy); ys += list(du); peaks_u.append(du.max()); peaks_y.append(dy.min())
    slope = np.polyfit(xs, ys, 1)[0]
    out[f'okun {s} {pol}'] = dict(slope=slope, peak_du=np.mean(peaks_u), trough_dy=np.mean(peaks_y), ratio=np.mean(peaks_u) / -np.mean(peaks_y))
E3 = load('E3_debt_housing')
for c in ('g0.01|defl1|fiat', 'g0.01|defl1|bitcoin', 'M|defl1|fiat', 'M|defl1|bitcoin', 'g0.01|defl1|fiat|housingFix', 'g0.01|defl1|bitcoin|housingFix'):
    rates, peak = [], []
    for sd, r in E3[c].items():
        S = r['series']
        mort = np.array(S['mortgageShare']) * 500
        fc = np.array([x or 0 for x in S['mortgageToRent']])
        yrs = []
        for y in range(20):
            m = mort[12*y:12*y+12].mean()
            yrs.append(fc[12*y:12*y+12].sum() / m if m > 0.5 else np.nan)
        rates.append(np.nanmean(yrs) if not np.all(np.isnan(yrs)) else np.nan); peak.append(np.nanmax(yrs) if not np.all(np.isnan(yrs)) else np.nan)
    out[f'foreclosure {c}'] = dict(avg_annual_rate=float(np.nanmean(rates)), peak_annual_rate=float(np.nanmean(peak)),
        rent_end=float(np.mean([r['series']['rentShare'][239] for r in E3[c].values()])), credit_end=float(np.mean([r['series']['creditToGdp'][239] for r in E3[c].values()])),
        mortgage_share_y1=float(np.mean([r['series']['mortgageShare'][12] for r in E3[c].values()])))
E1 = load('E1_regime_structure')
for c in ('S0|hoard0|fiat', 'S0|hoard0|bitcoin', 'S3|hoard0|fiat', 'S3|hoard0|bitcoin'):
    out[f'E1 {c}'] = dict(velocity_month=float(np.mean([r['series']['velocity'][239] for r in E1[c].values()])) if 'velocity' in next(iter(E1[c].values()))['series'] else None,
        gini=float(np.mean([r['end']['giniWealth'] for r in E1[c].values()])), top10=float(np.mean([r['end']['topDecileWealthShare'] for r in E1[c].values()])),
        credit=float(np.mean([r['end']['creditToGdp'] for r in E1[c].values()])), u=float(np.mean([np.mean(r['series']['unemployment'][24:]) for r in E1[c].values()])) if 'unemployment' in next(iter(E1[c].values()))['series'] else None,
        infl=float(np.mean([np.mean(r['series']['inflation'][24:]) for r in E1[c].values()])) if 'inflation' in next(iter(E1[c].values()))['series'] else None,
        vel_end_from_end=float(np.mean([r['end']['velocity'] for r in E1[c].values()])))
X1 = load('X1_monetary_preset')
for c in X1:
    rs = X1[c].values()
    out[f'X1 {c}'] = dict(vel=float(np.mean([r['end']['velocity'] for r in rs])), gini=float(np.mean([r['end']['giniWealth'] for r in rs])), credit=float(np.mean([r['end']['creditToGdp'] for r in rs])), rent=float(np.mean([r['end']['rentShare'] for r in rs])))
for k, v in out.items(): print(k, {a: (round(b, 4) if isinstance(b, float) else b) for a, b in v.items()})
json.dump(out, open('/workspace/econ-sim/results-v10/benchmarks_calc.json', 'w'), indent=1, default=float)
