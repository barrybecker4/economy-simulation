import json, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt, numpy as np
R='data-v10/review/'; L=lambda n: json.load(open(R+n+'.json'))
C={'fiat':'#1f77b4','bitcoin':'#ff7f0e','hybrid':'#2ca02c'}
# 1 wage rule
W=L('wages'); E=L('wageElast')
fig,axs=plt.subplots(1,3,figsize=(16,4))
rigs=['rig0','rig0.5','rig0.7','rigdef0.9','rig0.95']
for ax,st in zip(axs[:2],['S0','M']):
    x=np.arange(len(rigs))
    for i,r in enumerate(['fiat','bitcoin']):
        ax.bar(x+(i-.5)*.38,[W[f'{st}|{r}|{g}']['unemployment_y2_20']*100 for g in rigs],.38,color=C[r],label=r)
    ax.set_xticks(x); ax.set_xticklabels(['0','0.5','0.7','0.9 (default)','0.95']); ax.set_xlabel('wage.nominalRigidity'); ax.set_ylabel('avg unemployment %'); ax.set_title(f'{st}: unemployment by wage rigidity (shock 0, 20 seeds)',fontsize=10); ax.set_ylim(0,14)
axs[0].legend()
ax=axs[2]; arms=[('S0','elastdef0.5'),('S0','elast0'),('M','elastdef0.5'),('M','elast0')]; x=np.arange(4)
for i,r in enumerate(['fiat','bitcoin']):
    ax.bar(x+(i-.5)*.38,[E[f'{s}|{r}|{e}|rigdef0.9']['unemployment_y2_20']*100 for s,e in arms],.38,color=C[r])
ax.set_xticks(x); ax.set_xticklabels(['S0 elast 0.5\n(default)','S0 elast 0','M elast 0.5\n(default)','M elast 0']); ax.set_title('Hiring elasticity 0 removes the wage-lag channel',fontsize=10); ax.set_ylim(0,14)
fig.tight_layout(); fig.savefig('charts-v10/v6_wage_rule.png',dpi=120)
# 2 crisis printing
S=L('slump'); fig,axs=plt.subplots(1,3,figsize=(16,4))
groups=[('M','fiat','stim0.05|'),('M','fiat',''),('M','fiat','stim2|'),('M','bitcoin',''),('S0','fiat','stim0.05|'),('S0','fiat',''),('S0','fiat','stim2|'),('S0','bitcoin','')]
lab=[f'{s} {r}\n{(p[:-1] if p else ("stim1 (default)" if r=="fiat" else "no rule"))}' for s,r,p in groups]
mets=[('money_m96_over_m60','Δ broad money m60→96 vs calm, %',lambda a,b:(a/b-1)*100),('inflation_m60_96','Δ CPI m60–96 vs calm, pp/yr',lambda a,b:(a-b)*100),('unemployment_m60_96','Δ unemployment m60–96 vs calm, pp',lambda a,b:(a-b)*100)]
for ax,(k,t,fn) in zip(axs,mets):
    for j,shock in enumerate(['demand','credit']):
        v=[fn(S[f'{s}|{r}|{p}{shock}'][k],S[f'{s}|{r}|{p}none'][k]) for s,r,p in groups]
        ax.bar(np.arange(len(groups))+(j-.5)*.4,v,.4,label=f'forced {shock} slump',color=['#d62728','#9467bd'][j])
    ax.axhline(0,color='k',lw=.6); ax.set_xticks(range(len(groups))); ax.set_xticklabels(lab,fontsize=7); ax.set_title(t,fontsize=10)
axs[0].legend(fontsize=8)
fig.suptitle('Crisis printing (centralBank.stimulus): forced slump at month 60 vs same-seed calm run, 20 seeds',fontsize=11)
fig.tight_layout(); fig.savefig('charts-v10/v6_crisis_printing.png',dpi=120)
# 3 book x premium gaps + bimodality
G=L('gaps'); fig,axs=plt.subplots(1,3,figsize=(16,4))
cells=[('0.62','0'),('0.62','0.5'),('0','0'),('0','0.5')]; lbl=['book on\npremium 0\n(default)','book on\npremium 0.5','no book\npremium 0','no book\npremium 0.5']
for ax,(k,t,sc) in zip(axs[:2],[('_u','Δ unemployment bitcoin−fiat, pp',100),('_cons','Δ median real cons bitcoin−fiat, %',None)]):
    for i,(b,p) in enumerate(cells):
        f=np.array(G[f'M|fiat|book{b}|premium{p}'][k]); bt=np.array(G[f'M|bitcoin|book{b}|premium{p}'][k])
        d=(bt-f)*100 if sc else (bt/f-1)*100
        ax.scatter(np.full(len(d),i)+np.random.uniform(-.12,.12,len(d)),d,s=14,color='#ff7f0e'); ax.plot([i-.25,i+.25],[d.mean()]*2,color='k')
    ax.axhline(0,color='k',lw=.6); ax.set_xticks(range(4)); ax.set_xticklabels(lbl,fontsize=8); ax.set_title(t+' (dots = seeds, bar = mean)',fontsize=9)
ax=axs[2]
for r,m in [('bitcoin','o'),('fiat','s')]:
    v=G[f'M|{r}|book0.62|premium0']; ax.scatter(v['_fail'],v['_cons'],color=C[r],marker=m,label=r)
v=G['M|bitcoin|book0.62|premium0.5']; ax.scatter(v['_fail'],v['_cons'],color='#8c564b',marker='^',label='bitcoin, premium 0.5')
ax.set_xlabel('bank failures per run'); ax.set_ylabel('median real consumption yr 20'); ax.legend(fontsize=8); ax.set_title('M: high bitcoin consumption = the bank-collapse seeds',fontsize=10)
fig.suptitle('M preset, shock frequency 0.1, 20 paired seeds',fontsize=11)
fig.tight_layout(); fig.savefig('charts-v10/v6_M_book_premium.png',dpi=120)
# 4 real mortgage
RM=L('realmort'); fig,axs=plt.subplots(1,4,figsize=(16,3.6))
arms=[('transition12','haircut0'),('transition12','haircut0.3'),('transition24','haircut0'),('transition24','haircut0.3')]
for ax,(k,t,sc) in zip(axs,[('totalMoney_m239','money × opening',1),('inflation_y2_20','CPI %/yr',100),('unemployment_y2_20','unemployment %',100),('cumulativeFailures','bank failures/run',1)]):
    x=np.arange(4)
    for i,o in enumerate(['off','on']):
        ax.bar(x+(i-.5)*.38,[RM[f'M|{a}|realMortgage={o}|{h}'][k]*sc for a,h in arms],.38,label=f'realMortgage {o}',color=['#7f7f7f','#e377c2'][i])
    ax.set_xticks(x); ax.set_xticklabels([f'{a[10:]}m\n{h}' for a,h in arms],fontsize=8); ax.set_title(t,fontsize=10)
axs[0].legend(fontsize=8); fig.suptitle('M fiat→bitcoin transition: transition.realMortgage off vs on (20 seeds, shock 0)',fontsize=11)
fig.tight_layout(); fig.savefig('charts-v10/v6_real_mortgage.png',dpi=120)
print('ok')
