"""Headline E1-style table for one jsonl: per structure x hoard, bitcoin-minus-fiat consumption (paired, mean [5,95]) and unemployment gap."""
import json, sys, numpy as np
from collections import defaultdict
def load(p):
    g = defaultdict(dict); err = 0
    for l in open(p):
        r = json.loads(l)
        if 'series' in r: g[r['cond']][r['seed']] = r
        else: err += 1
    return g, err
def row(E, a, b):
    d, du, n = [], [], 0
    for sd, ra in E[a].items():
        rb = E[b].get(sd)
        if not rb: continue
        ca, cb = ra['series']['medianRealConsumption'][239], rb['series']['medianRealConsumption'][239]
        d.append(cb / ca - 1 if ca > 0 else np.nan); du.append(np.mean(rb['series']['unemployment'][24:240]) - np.mean(ra['series']['unemployment'][24:240]))
    if not d: return None
    return dict(dcons=100*np.nanmean(d), lo=100*np.nanpercentile(d, 5), hi=100*np.nanpercentile(d, 95), med=100*np.nanmedian(d), du=100*np.mean(du), n=len(d))
def lvl(E, c):
    R = list(E[c].values())
    f = lambda fn: float(np.mean([fn(r) for r in R]))
    return dict(u=100*f(lambda r: np.mean(r['series']['unemployment'][24:240])), infl=100*f(lambda r: np.mean(r['series']['inflation'][24:240])),
                money=f(lambda r: r['series']['moneySupply'][239]/r['series']['moneySupply'][0]) if 'moneySupply' in R[0]['series'] else None, fail=f(lambda r: r['series']['bankFailures'][239]) if 'bankFailures' in R[0]['series'] else None)
if __name__ == '__main__':
    E, err = load(sys.argv[1]); print('errors', err)
    conds = sorted({c.rsplit('|', 1)[0] for c in E})
    for base in conds:
        r = row(E, base + '|fiat', base + '|bitcoin')
        if r: print(f"{base:16s} dcons {r['dcons']:+6.1f} [{r['lo']:+6.1f},{r['hi']:+6.1f}] med {r['med']:+6.1f}  du {r['du']:+5.2f}pp  n{r['n']}  fiat {lvl(E, base+'|fiat')}  btc {lvl(E, base+'|bitcoin')}")
