import json,random,statistics as st,sys
d=json.load(open('data-v10/review/legacy_book.json'))
md=json.load(open('data-v10/review/mortgage_modes.json'))
d.update(md)
def ps(arm): return d[arm]['perSeed']
def paired(a,b,key,rel):
    A,B=ps(a),ps(b); seeds=sorted(set(A)&set(B),key=int)
    diffs=[]
    for s in seeds:
        x,y=A[s].get(key),B[s].get(key)
        if x is None or y is None: continue
        diffs.append((x/y-1)*100 if rel else (x-y)*(100 if key in('u','cpiAnn') else 1))
    random.seed(1); bs=[]
    for _ in range(2000):
        smp=[random.choice(diffs) for _ in diffs]; bs.append(st.median(smp))
    bs.sort(); return st.median(diffs),bs[50],bs[1949],len(diffs)
rows=[]
out={}
for tag,suffix in [('book','book'),('noBook','noBook'),('book hoard3','book|hoard3'),('noBook hoard3','noBook|hoard3'),('book sigma0.5','book|sigma0.5'),('noBook sigma0.5','noBook|sigma0.5')]:
    b=f'M|bitcoin|{suffix}'; f=f'M|fiat|{suffix}'
    r={}
    for key,rel,lab in [('cons',True,'Δcons %'),('u',False,'Δu pp'),('cpiAnn',False,'ΔCPI pp/yr'),('failures',False,'Δfailures'),('moneyTot',False,'Δmoney (×open)')]:
        m,lo,hi,n=paired(b,f,key,rel); r[lab]=(round(m,2),round(lo,2),round(hi,2),n)
    out[tag]=r
    print(tag, r)
# book effect within regime
for reg in ['fiat','bitcoin','hybrid']:
    r={}
    for key,rel in [('cons',True),('u',False),('cpiAnn',False),('failures',False),('moneyTot',False),('orig',False)]:
        m,lo,hi,n=paired(f'M|{reg}|book',f'M|{reg}|noBook',key,rel); r[key]=(round(m,3),round(lo,3),round(hi,3))
    out['bookEffect_'+reg]=r; print('book effect',reg,r)
# bail-in share
for s in ['book','noBook']:
    mg=d[f'M|bitcoin|{s}']['mean']['moneyTot']; ro=d[f'M|bitcoin|{s}|resOff']['mean']['moneyTot']
    print(s,'merge',mg,'resOff',ro,'bail-in share of drain',(ro-mg)/(1-mg) if mg<1 else None)
    out['bailinShare_'+s]=dict(merge=mg,resOff=ro,share=(ro-mg)/(1-mg) if mg<1 else None)
json.dump(out,open('results-v10/legacy_book_paired.json','w'),indent=1)
