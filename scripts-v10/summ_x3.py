import json
d=json.load(open('data-v10/review/x3_deflation.json'))
L=["# X3: good vs bad deflation (shock freq 0.1, 240 ticks, 20 seeds; means; g = productivity.baseGrowth %/yr; floor = downward wage floor %/yr via patched P_WAGE_FLOOR)\n"]
def fmt(k,v):
    if isinstance(v,(int,float)): return f"{v:.3g}"
    sc=100 if k in ('dInfl','dU','dRealWage','dCons','dGdp') else 1
    return f"{v['mean']*sc:+.1f} [{v['p5']*sc:+.1f}, {v['p95']*sc:+.1f}]"
mets=['infl','u','realWage','cons','gdp','money','foreclosures']
for key,blk in d.items():
    L.append(f"\n## {key}\n\n| arm | n | crashes | "+" | ".join(mets)+" |\n|---|---|---|"+"---|"*len(mets))
    for arm,v in blk.items():
        if arm.startswith('_'): continue
        L.append(f"| {arm} | {v['n']} | {len(v['crashes'])} | "+" | ".join(f"{v[m]['mean']*(100 if m in ('infl','u') else 1):.3g}" for m in mets)+" |")
    c=blk.get('_contrasts',{})
    if c:
        first=next(iter(c.values()))
        ks=list(first.keys()) if isinstance(first,dict) else []
        L.append("\nPaired contrasts (mean of per-seed paired differences [5th, 95th pct of per-seed differences]; cons/gdp/realWage in %, infl/u in pp; dDefaultsReal is in model currency units — ignore magnitude):\n")
        L.append("| contrast | "+" | ".join(ks)+" |\n|---|"+"---|"*len(ks))
        for cn,cv in c.items():
            if not isinstance(cv,dict): L.append(f"| {cn} | {cv} |"); continue
            L.append(f"| {cn} | "+" | ".join(fmt(k,cv[k]) for k in ks)+" |")
open('results-v10/X3_good_bad_deflation.md','w').write("\n".join(L)+"\n"); print("\n".join(L))
