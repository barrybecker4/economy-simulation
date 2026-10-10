"""Share of runs whose median real consumption hits 0 in some month after month 24 (stock-out rationing artifact)."""
import json, glob, os, collections
for d in ['data-v9', 'data-v10']:
    for f in sorted(glob.glob(f'{d}/E1*.jsonl') + glob.glob(f'{d}/X1*.jsonl')):
        tot = z = 0; byc = collections.Counter()
        for l in open(f):
            r = json.loads(l)
            if 'series' not in r: continue
            tot += 1
            if min(r['series']['medianRealConsumption'][24:240]) <= 0: z += 1; byc[r['cond']] += 1
        print(f'{f:45s} runs {tot:4d} zero-median-cons runs {z:4d} ({100*z/max(1,tot):.1f}%) ', dict(byc.most_common(6)))
