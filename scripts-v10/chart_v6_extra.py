import json, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt, numpy as np
L=json.load(open('data-v10/review/legacy_book.json')); Mo=json.load(open('data-v10/review/mortgage_modes.json'))
# legacy book chart
fig,axs=plt.subplots(1,5,figsize=(17,3.6))
mets=[('cons','median real cons',1),('u','unemployment %',100),('cpiAnn','CPI %/yr',100),('failures','bank failures/run',1),('moneyTot','money ×opening',1)]
arms=['fiat','bitcoin','hybrid']; cols={'fiat':'#1f77b4','bitcoin':'#ff7f0e','hybrid':'#2ca02c'}
for ax,(k,lab,sc) in zip(axs,mets):
    x=np.arange(2)
    for i,a in enumerate(arms):
        vals=[L[f'M|{a}|book']['mean'][k]*sc, L[f'M|{a}|noBook']['mean'][k]*sc]
        ax.bar(x+(i-1)*0.27,vals,0.27,label=a,color=cols[a])
    ax.set_xticks(x); ax.set_xticklabels(['legacy book\n(default)','no opening book']); ax.set_title(lab,fontsize=10)
axs[0].legend(fontsize=8)
fig.suptitle('M preset: legacy opening mortgage book on vs off (20 seeds, shock freq 0.1, means)')
fig.tight_layout(); fig.savefig('charts-v10/legacy_book_M.png',dpi=120)
# mortgage modes chart
modes=['nominal','v4','realonly','single','noprepay','researcher','head']
fig,axs=plt.subplots(1,3,figsize=(15,3.8))
for ax,(k,lab) in zip(axs,[('orig','new mortgages / run'),('ownersWithMortgage','owners with mortgage (end)'),('u','unemployment')]):
    x=np.arange(len(modes))
    for i,(a,suf) in enumerate([('fiat',''),('bitcoin',''),('bitcoin','noBook|')]):
        vals=[Mo[f'M|{a}|{suf}mode={m}']['mean'][k] if f'M|{a}|{suf}mode={m}' in Mo else np.nan for m in modes]
        ax.bar(x+(i-1)*0.27,vals,0.27,label=f'{a}{" no book" if suf else ""}')
    ax.set_xticks(x); ax.set_xticklabels(modes,rotation=30,fontsize=8); ax.set_title(lab,fontsize=10)
axs[0].legend(fontsize=8)
fig.suptitle('M preset: mortgage decision modes (patched-v10, 20 seeds). head = v6 HEAD as pushed')
fig.tight_layout(); fig.savefig('charts-v10/mortgage_modes_M.png',dpi=120)
# X2 chart
X=json.load(open('data-v10/review/x2_transition.json'))['results']
fig,axs=plt.subplots(1,2,figsize=(13,4))
groups=['debtor=debtor','debtor=saver','tenure=renter','tenure=mortgagor','tenure=outright','skill=Q1','skill=Q3','skill=Q5','emp=unemployed']
for ax,st in zip(axs,['M','S0tenure']):
    x=np.arange(len(groups))
    for i,arm in enumerate(['switch12|hc=preserve|haircut=0','switch12|hc=0.5|haircut=0','switch12|hc=0.5|haircut=0.3']):
        vals=[X[st][arm]['groups'][g]['dC120_pct'] for g in groups]
        ax.bar(x+(i-1)*0.27,vals,0.27,label=arm.replace('switch12|',''))
    ax.axhline(0,color='k',lw=0.5); ax.set_xticks(x); ax.set_xticklabels(groups,rotation=35,fontsize=8,ha='right'); ax.set_title(f'{st}: Δ real consumption at m120 vs stay fiat (%)',fontsize=10)
axs[0].legend(fontsize=8); fig.tight_layout(); fig.savefig('charts-v10/x2_transition_cost.png',dpi=120)
print('ok')
