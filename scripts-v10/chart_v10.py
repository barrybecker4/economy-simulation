"""Round 10 fix-check chart: v9 vs v10 on items 1-4 plus v9-fix regressions. Reads data-v9/v10 review probes, results-v10/E4_shock_table.json, wage_flh files."""
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt, numpy as np, json
fig, axs = plt.subplots(2, 3, figsize=(19, 9))
V9, V10 = 'gold', 'tab:brown'
def bars(ax, labels, series, title, log=False):
    x = np.arange(len(labels)); w = 0.8 / len(series)
    for i, (name, vals, c) in enumerate(series):
        b = ax.bar(x + (i - (len(series) - 1) / 2) * w, vals, w, label=name, color=c)
        for r, v in zip(b, vals):
            if not np.isnan(v): ax.text(r.get_x() + r.get_width() / 2, v, f'{v:.3g}', ha='center', va='bottom', fontsize=7)
    ax.set_xticks(x); ax.set_xticklabels(labels, fontsize=8); ax.set_title(title, fontsize=9); ax.axhline(0, color='k', lw=0.5)
    if log: ax.set_yscale('log')
    ax.legend(fontsize=7)
b9 = json.load(open('data-v9/review/base.json')); b10 = json.load(open('data-v10/review/base.json')); bp = json.load(open('data-v9/review/base_excessSign.json'))
S = ['S1', 'S3', 'M', 'D']
bars(axs[0,0], S, [('v9', [100 * b9[f'{s}|bitcoin']['inflation_y2_20'] for s in S], V9), ('v9 + P_EXCESS_SIGN', [100 * bp[f'{s}|bitcoin']['inflation_y2_20'] for s in S], 'tab:green'), ('v10', [100 * b10[f'{s}|bitcoin']['inflation_y2_20'] for s in S], V10)], '(1) bitcoin CPI %/yr, yrs 2–20 (10 seeds): prices fall again')
E = {(r['cs'].split()[0], r['cond']): r for r in json.load(open('results-v10/E4_shock_table.json'))}
g = lambda v, c, k: E.get((v, c), {}).get(k, np.nan)
rows = [('S2 fiat demand', 'S2|fiat|demand|rig0.7'), ('S2 btc demand', 'S2|bitcoin|demand|rig0.7'), ('M fiat demand', 'M|fiat|demand|rig0.7'), ('M btc demand', 'M|bitcoin|demand|rig0.7')]
bars(axs[0,1], [r[0] for r in rows], [('v9 GDP loss %', [g('v9', c, 'gdploss') for _, c in rows], V9), ('v10 GDP loss %', [g('v10', c, 'gdploss') for _, c in rows], V10), ('v9 Δu pp', [g('v9', c, 'du') for _, c in rows], 'khaki'), ('v10 Δu pp', [g('v10', c, 'du') for _, c in rows], 'peru')], '(2) demand shock −15% at m60: GDP loss and Δu, m60–84 (20 seeds)')
rows = [('S2 fiat', 'S2|fiat|supply|rig0.7'), ('S2 fiat+stab', 'S2|fiat+stabilizer|supply|rig0.7'), ('M fiat', 'M|fiat|supply|rig0.7'), ('S2 btc Δu', 'S2|bitcoin|supply|rig0.7'), ('M btc Δu', 'M|bitcoin|supply|rig0.7')]
bars(axs[0,2], [r[0] for r in rows], [('v9', [g('v9', c, 'gdploss' if 'Δu' not in n else 'du') for n, c in rows], V9), ('v10', [g('v10', c, 'gdploss' if 'Δu' not in n else 'du') for n, c in rows], V10)], '(3) supply shock: fiat GDP loss % (first 3) and bitcoin Δu pp (last 2)')
bars(axs[1,0], ['money × el0', 'CPI % el0', 'u % el0', 'money × rig0', 'CPI % rig0', 'wage growth in\novershoot months %/yr'], [('v9 M flh on', [1.37, 4.8, 6.7, 1.38, 4.0, 0.3], V9), ('v10 M flh on', [1.21, 3.5, 6.0, 0.94, 2.3, 3.8], V10)], '(3) M fiat, firm-level hiring on: no spiral; wage damping softened (6 seeds)')
st = {v: json.load(open(f'data-{v}/review/stimsign.json')) for v in ['v9', 'v10']}
lab = ['S2 calm', 'S2 demand', 'M calm', 'M demand']; ids = [('S2', 'none'), ('S2', 'demand'), ('M', 'none'), ('M', 'demand')]
d = lambda v, s, k: 100 * (st[v][f'{s}|fiat|stimdef1.75|{k}']['unemployment_y2_20'] - st[v][f'{s}|fiat|stim0|{k}']['unemployment_y2_20'])
bars(axs[1,1], lab, [('v9', [d('v9', s, k) for s, k in ids], V9), ('v10', [d('v10', s, k) for s, k in ids], V10)], '(4) unemployment, stimulus 1.75 minus 0 (pp, yrs 2–20, 5 seeds): still ≈0 or wrong sign')
bars(axs[1,2], ['M btc u % flh on', 'M btc u % flh off', 'M btc failures', 'S0 btc failures', 'zero-median runs (E1+X1)'], [('v9', [9.8, 5.7, 17.8, 3.6, 0], V9), ('v10', [8.4, 8.3, 24.7, 3.6, 0], V10)], 'v9-fix regression checks')
fig.suptitle('Round 10: REPORT-v9 fix items, v9 ba893c2 vs v10 ee3e4c3 (500 HH / 50 firms / 3 banks, 240 months, AI off)', fontsize=11)
fig.tight_layout(); fig.savefig('charts-v10/v10_fix_checks.png', dpi=110); print('saved')
