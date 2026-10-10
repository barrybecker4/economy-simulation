import json, glob, numpy as np, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
D = {}
for f in glob.glob('/workspace/econ-sim/data-v10/review/*.json'): D.update(json.load(open(f)))
rows = [('S1', 'S1'), ('S1|rebate', 'S1 + surplus rebated'), ('S3', 'S3'), ('S3|rebate', 'S3 + surplus rebated'),
        ('M', 'M preset'), ('M|resOff', 'M, resolution off'), ('M|rebate', 'M + rebate'), ('M|rebate|resOff', 'M + rebate, res. off'),
        ('M|windfallFix', 'M + windfall fix'), ('M|treasuryBailin', 'M + treasury bailed in'), ('M|B123fix', 'M + B1–B3 fixes'), ('M|B123fix|resOff', 'M + B1–B3, res. off')]
fig, axs = plt.subplots(1, 3, figsize=(16, 5.5), sharey=True)
y = np.arange(len(rows))[::-1]
for ax, (key, title, scale) in zip(axs, (('_cons', 'Δ median real consumption btc−fiat (%), yr 20', 100), ('_u', 'Δ avg unemployment btc−fiat (pp), yrs 2–20', 100), ('infl', 'bitcoin avg inflation (%/yr)', 100))):
    for i, (k, lab) in enumerate(rows):
        f, b = D[k.replace('|', '|fiat|', 1) if '|' in k else k + '|fiat'], D[k.replace('|', '|bitcoin|', 1) if '|' in k else k + '|bitcoin']
        if key == 'infl':
            m, lo, hi = b['inflation_y2_20'] * scale, 0, 0
        else:
            d = np.array([bb / ff - 1 if key == '_cons' else bb - ff for ff, bb in zip(f[key], b[key])]) * scale
            m, lo, hi = d.mean(), d.mean() - np.percentile(d, 5), np.percentile(d, 95) - d.mean()
        ax.barh(y[i], m, xerr=[[lo], [hi]], color='tab:purple' if 'M' in k else 'tab:blue', alpha=0.8, capsize=3)
    ax.axvline(0, color='k', lw=0.7); ax.set_title(title, fontsize=10)
    if key == 'infl': ax.axvspan(-3, -1, color='green', alpha=0.15, label='benign gold-standard band (−1 to −3%)'); ax.legend(fontsize=8, loc='lower left')
axs[0].set_yticks(y); axs[0].set_yticklabels([l for _, l in rows], fontsize=9)
fig.suptitle('v3 artifact sensitivity (20 seeds, bars 5–95%): treasury-surplus rebate (B1), bank resolution off / treasury bail-in (B2), mortgage windfall fix (B3)', fontsize=10)
fig.tight_layout(); fig.savefig('/workspace/econ-sim/charts-v10/artifact_sensitivity.png', dpi=110); print('ok')
