"""Compact print of a review_check group json."""
import json, sys
K = sys.argv[2].split(',') if len(sys.argv) > 2 else ['unemployment_y2_20', 'inflation_y2_20', 'moneySupply_end_rel', 'cumulativeFailures', 'medianRealCons_end', 'policyRateMax', 'fiatShare_end']
d = json.load(open(sys.argv[1]))
def f(v):
    if v is None: return '-'
    if isinstance(v, dict): return '{' + ','.join(f'{k[:6]}:{x:+.3f}' for k, x in v.items() if x is not None) + '}'
    if isinstance(v, (int, float)): return f'{v:.4g}'
    return str(v)[:40]
print('cond'.ljust(40) + ' '.join(k[:12].rjust(12) for k in K))
for c, r in d.items():
    print(c[:40].ljust(40) + ' '.join(f(r.get(k)).rjust(12) for k in K) + (f"  ERR{r['errors']}" if r.get('errors') else ''))
