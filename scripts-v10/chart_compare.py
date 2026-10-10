"""v1–v8 gap chart (v7 at shipped defaults and at money.choiceSpeed 0)."""
import json, os, numpy as np, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
C = json.load(open(os.path.join(ROOT, 'results-v10', 'compare_v1_v2_v3_v4_v5_v6_v7_v8_v9_v10.json')))
labs = ['S0','S1','S2','S3','M']; names=['S0 default','S1 demand prices','S2 demand output','S3 both','M preset']
fig, axs = plt.subplots(1, 3, figsize=(22, 5))
x = np.arange(len(labs)); w = 0.078
cols = {'1':'tab:gray','2':'tab:orange','3':'tab:purple','4':'tab:green','5':'tab:blue','6':'tab:red','7':'black','7cs0':'tab:cyan','8':'magenta','9':'gold','10':'tab:brown'}
for ax, key, title in ((axs[0],'dcons','Δ median real consumption, btc − fiat (%), yr 20'),
                       (axs[1],'du','Δ avg unemployment, btc − fiat (pp), yrs 2–20'),
                       (axs[2],'dgdp','Δ avg real GDP, btc − fiat (%), yrs 2–20')):
    for i, ver in enumerate(('1','2','3','4','5','6','7','7cs0','8','9','10')):
        m, lo, hi, xs = [], [], [], []
        for j, s in enumerate(labs):
            k = f'M h0 {key}' if s=='M' else f'E1 {s} h0 {key}'
            if str(ver) not in C and ver not in C: continue
            Cv = C[ver] if ver in C else C[str(ver)]
            if k not in Cv or Cv[k] is None: continue
            v = Cv[k]
            if isinstance(v, list):
                m.append(v[0]*100); lo.append((v[0]-v[1])*100); hi.append((v[2]-v[0])*100)
            else:
                m.append(v*100); lo.append(0); hi.append(0)
            xs.append(j)
        ax.bar(np.array(xs)+(i-5)*w, m, w, color=cols[ver], label=('v7 choiceSpeed 0' if ver=='7cs0' else f'v{ver}'),
               yerr=[lo,hi] if key in ('dcons','dgdp') and lo else None, capsize=2)
    ax.axhline(0, color='k', lw=0.7); ax.set_xticks(x); ax.set_xticklabels(names, fontsize=9); ax.set_title(title, fontsize=10)
axs[0].legend(fontsize=8)
fig.suptitle('Bitcoin advantage by model version: v1 7635350, v2 f3cb3e5, v3 2065180, v4 05d422c, v5 031fa97, v6 1ca86eb, v7 d8ac6ca, v8 65bef47, v9 ba893c2, v10 ee3e4c3\n(S0–S3 pinned to their v1–v6 meaning; v7 black = shipped defaults incl. choiceSpeed 0.01; cyan = v7 choiceSpeed 0; magenta = v8, gold = v9, brown = v10 defaults)', fontsize=10)
fig.tight_layout(); fig.savefig(os.path.join(ROOT,'charts-v10','v1_v2_v3_v4_v5_v6_v7_v8_v9_v10_gap.png'), dpi=110); print('saved')
