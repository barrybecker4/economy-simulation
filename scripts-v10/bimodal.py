"""M hoard0 bitcoin-minus-fiat consumption per seed (bimodality) for v6, v7 default, v7 cs0, v7 legacy pins; plus correlation with bitcoin bank failures."""
import json, numpy as np
from collections import defaultdict
def load(p):
    g = defaultdict(dict)
    for l in open(p):
        r = json.loads(l)
        if 'series' in r: g[r['cond']][r['seed']] = r
    return g
out = {}
for lab, path, a, b in [('v6', 'data-v6/X1_monetary_preset.jsonl', 'M|hoard0|fiat', 'M|hoard0|bitcoin'),
                        ('v7 default', 'data-v7/X1_monetary_preset.jsonl', 'M|hoard0|fiat', 'M|hoard0|bitcoin'),
                        ('v7 cs0', 'data-v7/X1_monetary_preset_cs0.jsonl', 'M|hoard0|fiat', 'M|hoard0|bitcoin'),
                        ('v8 default', 'data-v8/X1_monetary_preset.jsonl', 'M|hoard0|fiat', 'M|hoard0|bitcoin'),
                        ('v10 default', 'data-v10/X1_monetary_preset.jsonl', 'M|hoard0|fiat', 'M|hoard0|bitcoin'),
                        ('v9 default', 'data-v9/X1_monetary_preset.jsonl', 'M|hoard0|fiat', 'M|hoard0|bitcoin'),
                        ('v10 legacy pins', 'data-v10/E1L_legacy_defaults.jsonl', 'M|hoard0|fiat', 'M|hoard0|bitcoin'),
                        ('v10 legacy nobook', 'data-v10/E1L_legacy_defaults.jsonl', 'M|nobook|fiat', 'M|nobook|bitcoin')]:
    E = load(path); d = []; fl = []
    for sd in sorted(E[a]):
        if sd in E[b]:
            d.append(100 * (E[b][sd]['series']['medianRealConsumption'][239] / E[a][sd]['series']['medianRealConsumption'][239] - 1))
            s = E[b][sd]['series']; fl.append(s['bankFailures'][239] if 'bankFailures' in s else np.nan)
    d = np.array(d); fl = np.array(fl)
    corr = float(np.corrcoef(d, fl)[0, 1]) if not np.isnan(fl).any() and fl.std() > 0 else None
    out[lab] = dict(per_seed=[round(x, 1) for x in d], mean=float(d.mean()), median=float(np.median(d)), sd=float(d.std()), share_pos=float((d > 0).mean()),
                    gap_between_clusters=None, corr_with_btc_failures=corr)
    print(f"{lab:18s} mean {d.mean():+6.1f} median {np.median(d):+6.1f} sd {d.std():5.1f} share>0 {(d>0).mean():.2f} corr(fail) {corr}  seeds: {' '.join(f'{x:+.0f}' for x in sorted(d))}")
json.dump(out, open('results-v10/M_bimodality.json', 'w'), indent=1)
