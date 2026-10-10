"""Round 9 fix-check chart: v8 vs v9 on items A (rationing), B (stimulus cap), C (wage spiral / firm-level hiring), plus the new excess-demand sign bug."""
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt, numpy as np, json
fig, axs = plt.subplots(2, 3, figsize=(19, 9))
def bars(ax, labels, series, title, log=False):
    x = np.arange(len(labels)); w = 0.8 / len(series)
    for i, (name, vals, c) in enumerate(series):
        b = ax.bar(x + (i - (len(series) - 1) / 2) * w, vals, w, label=name, color=c)
        for r, v in zip(b, vals):
            if not np.isnan(v): ax.text(r.get_x() + r.get_width() / 2, v, f'{v:.3g}', ha='center', va='bottom', fontsize=7)
    ax.set_xticks(x); ax.set_xticklabels(labels, fontsize=8); ax.set_title(title, fontsize=9)
    if log: ax.set_yscale('log')
    ax.legend(fontsize=7)
V8, V9 = 'magenta', 'gold'
bars(axs[0,0], ['S2 fiat E1 (/40)', 'M hoard3 fiat X1 (/20)', 'S2 fiat demand probe (/6)'], [('v8', [14, 6, 6], V8), ('v9', [0, 0, 0], V9)], '(A) runs with zero median consumption at m240')
bars(axs[0,1], ['S2 calm', 'S2 demand −15%', 'S2 boom +15%'], [('v8 stim 1.75', [4.81, 10.3, 9.75], V8), ('v9 stim 1.75', [2.38, 2.25, 2.08], V9), ('v9 stim 0', [2.37, 2.23, 2.12], 'tab:gray')], '(B) S2 fiat money multiple at m240 (log)', log=True)
bars(axs[0,2], ['calm', 'demand', 'boom'], [('v9 stim 0', [6.49, 5.70, 7.05], 'tab:gray'), ('v9 stim 1.75', [6.48, 5.67, 7.05], V9), ('v8 stim 0', [10.3, 15.0, 14.7], 'pink'), ('v8 stim 1.75', [10.3, 15.0, 15.3], V8)], '(B) S2 fiat unemployment % yrs 2–20: stimulus has no effect')
bars(axs[1,0], ['money × el0', 'CPI % el0', 'u % el0', 'money × rig0', 'CPI % rig0', 'u % rig0'], [('v8 M + flh on', [12.35, 23.0, 19.1, 1.95, 9.1, 9.1], V8), ('v9 M + flh on', [1.37, 4.8, 6.7, 1.38, 4.0, 6.2], V9)], '(C) M fiat wage spiral with firm-level hiring on, 6 seeds (log)', log=True)
bars(axs[1,1], ['u % flh on', 'u % flh off', 'failures flh on', 'failures flh off', 'CPI %/yr flh on'], [('v8', [18.2, 7.4, 28.3, 7.3, -6.2], V8), ('v9', [9.8, 5.7, 17.8, 19.8, -0.2], V9)], '(C) M bitcoin, firm-level hiring on vs off, 6 seeds')
try:
    b9 = json.load(open('data-v10/review/base.json')); bp = json.load(open('data-v10/review/base_excessSign.json')); b8 = json.load(open('data-v8/review/base.json'))
    gp = lambda r: sum(r['_gdpPost']) / len(r['_gdpPost'])
    def c(d, s): return 100 * (gp(d[f'{s}|bitcoin']) / gp(d[f'{s}|fiat']) - 1)
    S = ['S0', 'S1', 'S2', 'S3', 'M', 'D']
    bars(axs[1,2], S, [('v8', [c(b8, s) for s in S], V8), ('v9', [c(b9, s) for s in S], V9), ('v9 + P_EXCESS_SIGN patch', [c(bp, s) for s in S], 'tab:green')], 'NEW: bitcoin − fiat real GDP % (m60–144, 10 seeds); v9 excess demand floored at 0')
except Exception as ex:
    axs[1,2].set_title(f'patch probe pending: {ex}', fontsize=8)
fig.suptitle('Round 9: REPORT-v8 fix items, v8 65bef47 vs v9 ba893c2 (500 HH / 50 firms / 3 banks, 240 months, AI off)', fontsize=11)
fig.tight_layout(); fig.savefig('charts-v10/v9_fix_checks.png', dpi=110); print('saved')
