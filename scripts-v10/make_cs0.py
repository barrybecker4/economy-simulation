"""Clone headline specs with money.choiceSpeed = 0 (like-for-like regime rule, the v1-v6 comparison)."""
import json
for n in ['E1_regime_structure', 'E4_shocks', 'X1_monetary_preset', 'E6_sensitivity_M', 'E3_debt_housing']:
    s = json.load(open(f'specs-v10/{n}.json'))
    s['name'] = n + '_cs0'
    for c in s['conditions']:
        c['sliders'] = {**c['sliders'], 'money.choiceSpeed': 0}
    json.dump(s, open(f'specs-v10/{n}_cs0.json', 'w'), indent=1)
    print(n, len(s['conditions']))
