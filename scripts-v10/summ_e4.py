"""E4 shock table: GDP loss m60-239 vs paired no-shock run, unemployment change m60-84, peak unemployment (mean and max over seeds)."""
import json, sys, numpy as np
from collections import defaultdict
def load(p):
    g = defaultdict(dict)
    for l in open(p):
        r = json.loads(l)
        if 'series' in r: g[r['cond']][r['seed']] = r
    return g
rows = []
for tag, p in [('v10 default', 'data-v10/E4_shocks.jsonl'), ('v9 default', 'data-v9/E4_shocks.jsonl')]:
    E = load(p)
    for c in E:
        s, pol, k, rig = c.split('|')
        if k == 'none': continue
        base = f'{s}|{pol}|none|{rig}'
        if base not in E: continue
        gl, du, pk = [], [], []
        for sd, r in E[c].items():
            b = E[base].get(sd)
            if not b: continue
            g0, g1 = np.array(b['series']['realGdp'][60:]), np.array(r['series']['realGdp'][60:])
            gl.append((g0.sum() - g1.sum()) / g0.sum())
            du.append(np.mean(r['series']['unemployment'][60:84]) - np.mean(b['series']['unemployment'][60:84]))
            pk.append(max(r['series']['unemployment'][24:]))
        rows.append(dict(cs=tag, cond=c, gdploss=100*np.mean(gl), du=100*np.mean(du), peakU_mean=100*np.mean(pk), peakU_max=100*max(pk)))
for r in rows: print(f"{r['cs']:8s} {r['cond']:34s} gdploss {r['gdploss']:6.2f}%  dU m60-84 {r['du']:+6.2f}pp  peakU {r['peakU_mean']:5.1f} (max {r['peakU_max']:5.1f})")
json.dump(rows, open('results-v10/E4_shock_table.json', 'w'), indent=1)
