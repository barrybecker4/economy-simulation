"""Round 7 charts: choiceSpeed bypass, M bimodality, stimulus sign, wage rule, assetPurchase runaway, S3 hoard3."""
import json, numpy as np, matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt
R = lambda k: json.load(open(f'data-v10/review/{k}.json'))
# 1 choiceSpeed bypass
cs = R('cs'); fig, axs = plt.subplots(1, 3, figsize=(15, 4.2))
for ax, key, t, sc in ((axs[0], 'unemployment_y2_20', 'Unemployment yrs 2–20 (%)', 100), (axs[1], 'inflation_y2_20', 'CPI inflation yrs 2–20 (%/yr)', 100), (axs[2], 'cumulativeFailures', 'Bank failures (cumulative)', 1)):
    for i, s in enumerate(['M', 'S0']):
        for j, reg in enumerate(['fiat', 'bitcoin', 'hybrid']):
            for k, c in enumerate([0, 0.01]):
                x = i * 4 + j + (k - 0.5) * 0.38
                ax.bar(x, cs[f'{s}|{reg}|cs{c}'][key] * sc, 0.36, color=['tab:blue', 'tab:orange'][k], label=(f'choiceSpeed {c}' if i == j == 0 else None))
    ax.set_xticks([0, 1, 2, 4, 5, 6]); ax.set_xticklabels(['M fiat', 'M btc', 'M hyb', 'S0 fiat', 'S0 btc', 'S0 hyb'], fontsize=8); ax.set_title(t, fontsize=10); ax.axhline(0, color='k', lw=.6)
axs[0].legend(fontsize=8); fig.suptitle('v7: money.choiceSpeed default 0.01 routes every regime through the blended rule (10 seeds)', fontsize=10)
fig.tight_layout(); fig.savefig('charts-v10/v7_choicespeed_bypass.png', dpi=110)
# 2 M bimodality
B = json.load(open('results-v10/M_bimodality.json')); fig, ax = plt.subplots(figsize=(9, 4.2))
for i, (k, v) in enumerate(B.items()):
    ax.scatter(np.full(len(v['per_seed']), i) + np.random.uniform(-.12, .12, len(v['per_seed'])), v['per_seed'], s=18)
    ax.plot([i - .25, i + .25], [v['median']] * 2, color='k')
ax.set_xticks(range(len(B))); ax.set_xticklabels(list(B.keys()), fontsize=8); ax.axhline(0, color='k', lw=.6)
ax.set_ylabel('bitcoin − fiat median real consumption, yr 20 (%)'); ax.set_title('M preset, hoard 0, 20 seeds per arm: v6 bimodality vs v7 arms', fontsize=10)
fig.tight_layout(); fig.savefig('charts-v10/v7_M_bimodality.png', dpi=110)
# 3 stimulus sign
st = R('stimsign_cs0'); en = R('endo_cs0b'); fig, ax = plt.subplots(figsize=(12, 4.2))
rows = [(k, v) for k, v in list(st.items()) + list(en.items()) if v.get('n') and 'stimdef' in k or (v.get('n') and 'lag12' in k)]
x = np.arange(len(rows))
ax.bar(x - .2, [v['stimPosMonths'] for _, v in rows], .4, label='months with positive pressure (expand)')
ax.bar(x + .2, [v['stimNegMonths'] for _, v in rows], .4, label='months with negative pressure (withdraw)')
ax.set_xticks(x); ax.set_xticklabels([k.replace('|stimdef1.75', '').replace('fiat|', '') for k, _ in rows], rotation=60, ha='right', fontsize=7)
ax.set_title('Crisis stimulus at choiceSpeed 0: signed observed-gap pressure, months of 240 (stimulus 1.75; 0 gives zero injection)', fontsize=10); ax.legend(fontsize=8)
fig.tight_layout(); fig.savefig('charts-v10/v7_stimulus_sign.png', dpi=110)
# 4 wage rule
w = R('wages_cs0'); fig, ax = plt.subplots(figsize=(10, 4.2)); rigs = ['rigdef0.9', 'rig0.95', 'rig0.7', 'rig0.5', 'rig0']
for i, s in enumerate(['S0', 'S3', 'M']):
    for j, reg in enumerate(['fiat', 'bitcoin']):
        ax.plot(range(5), [w[f'{s}|{reg}|{r}']['wageGrowthYr_y2_20'] * 100 for r in rigs], marker='o', ls=['-', '--'][j], label=f'{s} {reg}')
ax.set_xticks(range(5)); ax.set_xticklabels(['0.9 (def)', '0.95', '0.7', '0.5', '0']); ax.set_xlabel('wage.nominalRigidity'); ax.axhline(0, color='k', lw=.6)
ax.set_ylabel('posted wage growth yrs 2–20 (%/yr)'); ax.set_title('Wages still fall in bitcoin deflation at every rigidity (choiceSpeed 0, 6 seeds)', fontsize=10); ax.legend(fontsize=8, ncol=3)
fig.tight_layout(); fig.savefig('charts-v10/v7_wage_rule.png', dpi=110)
# 5 QE runaway
q, qp = R('qe_cs0'), R('qe_cs0_patchExcess'); fig, ax = plt.subplots(figsize=(9, 4.2)); ks = list(q.keys())
ax.bar(np.arange(len(ks)) - .2, [q[k]['moneySupply_end_rel'] for k in ks], .4, label='v7 HEAD'); ax.bar(np.arange(len(ks)) + .2, [qp[k]['moneySupply_end_rel'] for k in ks], .4, label='patched: unwind only excess reserves')
ax.set_yscale('log'); ax.set_xticks(range(len(ks))); ax.set_xticklabels([k.replace('|fiat|ch=', '\n') for k in ks], fontsize=8); ax.set_ylabel('money yr 20 / yr 0 (log)')
ax.set_title('assetPurchase runaway: withdrawal → reserve shortfall → accommodation credits firms (cs0, 6 seeds)', fontsize=10); ax.legend(fontsize=8)
fig.tight_layout(); fig.savefig('charts-v10/v7_assetpurchase_runaway.png', dpi=110)
print('ok')
