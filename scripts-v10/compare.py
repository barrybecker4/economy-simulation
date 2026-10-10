"""Side-by-side v1..v8 key numbers for REPORT-v8.md. '7cs0' = v7 with money.choiceSpeed 0 (specs *_cs0)."""
import json, os, glob, numpy as np
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DIRS = {1: 'data', 2: 'data-v2', 3: 'data-v3', 4: 'data-v4', 5: 'data-v5', 6: 'data-v6', 7: 'data-v7', '7cs0': 'data-v7', 8: 'data-v8', 9: 'data-v9', 10: 'data-v10'}
VERS = (1, 2, 3, 4, 5, 6, 7, '7cs0', 8, 9, 10)

def load(ver, name):
    from collections import defaultdict
    g = defaultdict(dict)
    path = os.path.join(ROOT, DIRS[ver], name + ('_cs0' if ver == '7cs0' else '') + '.jsonl')
    if not os.path.exists(path): return g
    for l in open(path):
        r = json.loads(l)
        if 'series' in r: g[r['cond']][r['seed']] = r
        elif 'error' in r: g[r['cond']][r['seed']] = r
    return g

def mean(R, fn):
    vals = [fn(r) for r in R.values() if 'series' in r]
    return float(np.mean(vals)) if vals else None

def end(r, m): return r['series'][m][239] if m in r['series'] else r['end'].get(m)
def avg(r, m, a=24, b=240): return float(np.mean(r['series'][m][a:b]))

def prel(E, a, b, fn):
    v = []
    for sd, rn in E[a].items():
        if 'series' not in rn or sd not in E[b] or 'series' not in E[b][sd]: continue
        fa, fb = fn(rn), fn(E[b][sd])
        if fa and fa != 0: v.append(fb/fa - 1)
    if not v: return None
    return [float(np.mean(v)), float(np.percentile(v,5)), float(np.percentile(v,95))]

def pdiff(E, a, b, fn):
    v = []
    for sd, rn in E[a].items():
        if 'series' not in rn or sd not in E[b] or 'series' not in E[b][sd]: continue
        v.append(fn(E[b][sd]) - fn(rn))
    if not v: return None
    return float(np.mean(v))

out = {}
for ver in VERS:
    o = {}
    E1 = load(ver, 'E1_regime_structure')
    for s in ('S0','S1','S2','S3','D'):
        for h in (0, 3):
            o[f'E1 {s} h{h} dcons'] = prel(E1, f'{s}|hoard{h}|fiat', f'{s}|hoard{h}|bitcoin', lambda r: end(r,'medianRealConsumption'))
            o[f'E1 {s} h{h} dgdp'] = prel(E1, f'{s}|hoard{h}|fiat', f'{s}|hoard{h}|bitcoin', lambda r: avg(r,'realGdp'))
            o[f'E1 {s} h{h} du'] = pdiff(E1, f'{s}|hoard{h}|fiat', f'{s}|hoard{h}|bitcoin', lambda r: avg(r,'unemployment'))
        for rn in ('fiat','bitcoin'):
            R = E1[f'{s}|hoard0|{rn}']
            o[f'E1 {s} {rn} cons'] = mean(R, lambda r: end(r,'medianRealConsumption'))
            o[f'E1 {s} {rn} u'] = mean(R, lambda r: avg(r,'unemployment'))
            o[f'E1 {s} {rn} infl'] = mean(R, lambda r: avg(r,'inflation'))
            o[f'E1 {s} {rn} gdp'] = mean(R, lambda r: end(r,'realGdp'))
            o[f'E1 {s} {rn} gini'] = mean(R, lambda r: end(r,'giniWealth'))
            o[f'E1 {s} {rn} velocity'] = mean(R, lambda r: end(r,'velocity'))
            o[f'E1 {s} {rn} money'] = mean(R, lambda r: end(r,'moneySupply'))
    if ver != 1:
        X1 = load(ver, 'X1_monetary_preset')
        for h in (0, 3):
            o[f'M h{h} dcons'] = prel(X1, f'M|hoard{h}|fiat', f'M|hoard{h}|bitcoin', lambda r: end(r,'medianRealConsumption'))
            o[f'M h{h} dgdp'] = prel(X1, f'M|hoard{h}|fiat', f'M|hoard{h}|bitcoin', lambda r: avg(r,'realGdp'))
            o[f'M h{h} du'] = pdiff(X1, f'M|hoard{h}|fiat', f'M|hoard{h}|bitcoin', lambda r: avg(r,'unemployment'))
        for rn in ('fiat','bitcoin'):
            R = X1.get(f'M|hoard0|{rn}', {})
            o[f'M {rn} infl'] = mean(R, lambda r: avg(r,'inflation'))
            o[f'M {rn} u'] = mean(R, lambda r: avg(r,'unemployment'))
            o[f'M {rn} cons'] = mean(R, lambda r: end(r,'medianRealConsumption'))
            o[f'M {rn} moneygrowth'] = mean(R, lambda r: (r['series']['moneySupply'][239]/r['series']['moneySupply'][0])**(12/239)-1) if R and 'moneySupply' in next(iter(R.values())).get('series',{}) else None
    E4 = load(ver, 'E4_shocks')
    def gdploss(a, b):
        if a not in E4 or b not in E4: return None
        v=[]
        for sd, rn in E4[a].items():
            if 'series' not in rn or sd not in E4[b] or 'series' not in E4[b][sd]: continue
            gn, gs = np.array(rn['series']['realGdp']), np.array(E4[b][sd]['series']['realGdp'])
            v.append((gn[60:].sum()-gs[60:].sum())/gn[60:].sum())
        return float(np.mean(v)) if v else None
    for pol in ('fiat','fiat+stabilizer','bitcoin'):
        o[f'E4 S2 supply {pol} gdploss'] = gdploss(f'S2|{pol}|none|rig0.7', f'S2|{pol}|supply|rig0.7')
        o[f'E4 S0 demand {pol} gdploss'] = gdploss(f'S0|{pol}|none|rig0.7', f'S0|{pol}|demand|rig0.7')
    errs=tot=0
    fl = glob.glob(os.path.join(ROOT, DIRS[ver], '*.jsonl'))
    if ver == 7: fl = [f for f in fl if '_cs0' not in f]
    if ver == '7cs0': fl = [f for f in fl if '_cs0' in f]
    for f in fl:
        for l in open(f):
            tot += 1
            if '"error"' in l[:300]: errs += 1
    o['runs']=tot; o['crashes']=errs
    out[ver]=o

def f_(x):
    if x is None: return '-'
    if isinstance(x,(list,tuple)): return f'{x[0]:+.3f} [{x[1]:+.3f},{x[2]:+.3f}]'
    return f'{x:.4g}' if isinstance(x,float) else str(x)
for k in out[10]:
    print(f'{k:34s} ' + '  '.join(f'v{v}={f_(out[v].get(k,"-"))}' for v in VERS))
json.dump({str(k): v for k, v in out.items()}, open(os.path.join(ROOT,'results-v10','compare_v1_v2_v3_v4_v5_v6_v7_v8_v9_v10.json'),'w'), indent=1)
