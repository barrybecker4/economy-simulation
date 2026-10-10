import json,sys,statistics as st
f=sys.argv[1]; d=json.load(open(f))
keys=['cons','u','cpiAnn','expInfl','failures','moneyTot','moneyDep','orig','orig12','prepay','foreclosures','mortgageShare','ownedShare','rentShare','ownersWithMortgage','credit','mortBookOverOpeningMoney','bankEquityChangeOverOpeningMoney']
print('arm'.ljust(42),' '.join(k[:8].rjust(8) for k in keys))
for k,v in d.items():
    m=v['mean']; print(k[:42].ljust(42),' '.join(f"{m.get(x,float('nan')):8.3f}" for x in keys), 'crash',len(v.get('crashSeeds',[])))
