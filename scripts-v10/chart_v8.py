"""Round 8 fix-check chart: v7 vs v8 on the six v7 fix items (numbers from data-v10/review probes, results-v10/wage_flh_attribution.txt, zero_cons)."""
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt, numpy as np
fig, axs = plt.subplots(2, 3, figsize=(18, 9))
def bars(ax, labels, series, title, log=False, ylab=''):
    x = np.arange(len(labels)); w = 0.8 / len(series)
    for i, (name, vals, c) in enumerate(series):
        b = ax.bar(x + (i - (len(series) - 1) / 2) * w, vals, w, label=name, color=c)
        for r, v in zip(b, vals): ax.text(r.get_x() + r.get_width() / 2, v, f'{v:.3g}', ha='center', va='bottom', fontsize=7)
    ax.set_xticks(x); ax.set_xticklabels(labels, fontsize=8); ax.set_title(title, fontsize=9); ax.set_ylabel(ylab)
    if log: ax.set_yscale('log')
    ax.legend(fontsize=7)
bars(axs[0,0], ['u %', 'CPI %/yr', 'money ×', 'failures'], [('v7 default (cs 0.01)', [15.7, -2.5, 0.56, 17.2], 'black'), ('v7 cs0', [8.0, 6.7, 1.62, 4.4], 'tab:cyan'), ('v8 default', [5.0, 2.0, 1.15, 3.1], 'magenta')], '(1) M fiat, choiceSpeed: v8 cs0 ≡ cs0.01 (decoupled), 10 seeds')
bars(axs[0,1], ['M money ×', 'M CPI %', 'S3 money ×'], [('v7 HEAD', [3227, 54, 6014], 'black'), ('v7 + P_QE_EXCESS patch', [1.49, 8.3, 1.38], 'tab:cyan'), ('v8', [1.29, 5.2, 1.45], 'magenta')], '(2) assetPurchase fiat (log): money multiple and CPI', log=True)
bars(axs[0,2], ['M Δu (btc−fiat, pp)', 'M fiat u %'], [('v7 cs0 (flh on)', [6.35, 7.9], 'tab:cyan'), ('v8 (M pins flh off)', [2.22, 4.9], 'magenta')], '(3) M preset firmLevelHiring pin (X1, 20 seeds)')
bars(axs[1,0], ['S2 calm', 'S2 demand −15%', 'S2 boom +15%'], [('v7 cs0', [6.6, 154, np.nan], 'tab:cyan'), ('v8 stim 1.75', [4.81, 10.3, 9.75], 'magenta'), ('v8 stim 0', [1.91, 2.84, 2.39], 'tab:gray')], '(4) S2 fiat money multiple at m240 (log); v7 boom not run', log=True)
bars(axs[1,1], ['S2 fiat E1 (40 runs)', 'M hoard3 fiat X1 (20)', 'S2 fiat demand probe (6)'], [('v7 cs0', [16, 2, np.nan], 'tab:cyan'), ('v8', [14, 6, 6], 'magenta')], '(5) runs with zero median consumption at m240 (v7 probe n/a)')
bars(axs[1,2], ['money × el0', 'CPI % el0', 'u % el0', 'money × rig0', 'CPI % rig0'], [('v7 cs0, M (flh on)', [34, 27.9, 20.5, 8.7, 16.7], 'tab:cyan'), ('v8, M + flh on', [12.35, 23.0, 19.1, 1.95, 9.1], 'magenta'), ('v8, M as shipped (flh off)', [1.21, 3.5, 6.0, 1.21, 3.1], 'tab:gray')], '(6) M fiat wage spiral, 6 seeds (log)', log=True)
fig.suptitle('Round 8: v7 fix list checked against v8 65bef47 (500 HH / 50 firms / 3 banks, 240 months, AI off)', fontsize=11)
fig.tight_layout(); fig.savefig('charts-v10/v8_fix_checks.png', dpi=110); print('saved')
