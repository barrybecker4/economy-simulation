"""Generate experiment specs for runner.mjs. Run: python3 make_specs.py"""
import json, os, copy
OUT = os.path.join(os.path.dirname(__file__), '..', 'specs-v10')
os.makedirs(OUT, exist_ok=True)
SEEDS = list(range(1, 21))
NOAI = {"ai.automatableShareStart": 0.3, "ai.automatableShareEnd": 0.3,
        "scale.households": 500, "scale.firms": 50, "scale.banks": 3}
# v7: the registry defaults changed for ~45 sliders (commit 0840e07/0126a36 "better defaults"), including
# prices.trendWeight 1->0.75, production.demandWeight 0->0.5 and labor.firmLevelHiring off->on. S0-S3 keep their
# v1-v6 meaning by pinning those three sliders; "D" is the pure v7 registry default.
STRUCT = {
    "S0": {"prices.trendWeight": 1, "production.demandWeight": 0, "labor.firmLevelHiring": "off"},
    "S1": {"prices.trendWeight": 0, "production.demandWeight": 0, "labor.firmLevelHiring": "off"},
    "S2": {"prices.trendWeight": 1, "production.demandWeight": 1, "labor.firmLevelHiring": "on"},
    "S3": {"prices.trendWeight": 0, "production.demandWeight": 1, "labor.firmLevelHiring": "on"},
}
# every slider whose default changed 1ca86eb -> v7, pinned to its v6 default (isolates the bug-fix commits)
LEGACY = {"expectations.anchorWeight": 0, "household.openingDepositMonths": 36, "household.skillSigma": 0.5,
    "household.realReturnSensitivity": 0, "firm.investmentHurdle": "off", "prices.trendWeight": 1, "population.growth": 0,
    "centralBank.outputWeight": 0.5, "bank.capitalRatio": 0.08, "bank.resolution": "off", "credit.endogenousWeight": 0,
    "credit.leverageStart": 0.02, "credit.householdMortgageShare": 0, "credit.rateTransmission": 0,
    "productivity.endogenousWeight": 0, "population.bequests": "firstHousehold", "bitcoin.marketPriceWeight": 0,
    "household.durableShare": 0, "bank.depositPassThrough": 0, "bank.depositInterestSubsidy": 0,
    "centralBank.bondPurchaseShare": 0, "centralBank.stimulus": 1, "centralBank.stimulusLag": 6, "centralBank.spendNewMoney": 0,
    "government.stabilizer": 0, "government.bondRate": 0, "goods.housingSupplyGrowth": 0, "housing.marketClearing": "off",
    "housing.monetaryPremium": 0, "housing.tenureChoice": "off", "ai.adoptionMidpointYear": 10, "ai.bullishness": 0,
    "ai.roboticsStartYear": 20, "ai.roboticsRampYears": 16, "ai.computeProductivity": 0, "agent.marketDepth": 0,
    "labor.firmLevelHiring": "off", "production.demandWeight": 0, "money.choiceSpeed": 0, "money.stablecoinStart": 0,
    "money.cbdcStart": 0, "money.fiatLegalTender": 1, "money.bitcoinTrust": 0.3}
MONETARY = json.load(open(os.path.join(os.path.dirname(__file__), '..', 'repo-v10', 'scenarios', 'presets', 'monetary.json')))["sliders"]
FIAT = {"regime.type": "fiat"}
# v3 opt-in fixes (all default to the old behavior)
ALLFIX = {"centralBank.injectionChannel": "newLoans", "centralBank.spendNewMoney": 1,
          "household.durableShare": 0.3, "credit.rateTransmission": 1, "productivity.endogenousWeight": 1,
          "bank.resolution": "merge", "credit.householdMortgageShare": 0.25}
HOUSING_FIX = {"credit.householdMortgageShare": 0.25, "housing.mortgageLtv": 0.95, "bank.resolution": "merge"}
BTC = {"regime.type": "bitcoin"}
SERIES = ["unemployment", "priceLevel", "realGdp", "medianRealConsumption", "medianRealWealth",
          "giniWealth", "creditToGdp", "realWage", "inflation"]

def spec(name, conds, ticks=240, base=None, snaps=(0, 59, 119, 239), series=SERIES):
    s = {"name": name, "ticks": ticks, "seeds": SEEDS, "snapshotTicks": list(snaps),
         "base": {"sliders": {**NOAI, **(base or {})}}, "seriesMetrics": series, "conditions": conds}
    json.dump(s, open(os.path.join(OUT, name + '.json'), 'w'), indent=1)
    return len(conds)

def c(id, *dicts, **kw):
    d = {}
    for x in dicts: d.update(x)
    return {"id": id, "sliders": d, **kw}

n = 0
# E1: regime x structure x hoarding (random shocks at default frequency)
conds = []
for s, sv in STRUCT.items():
    for hoard in (0, 3):
        for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
            conds.append(c(f"{s}|hoard{hoard}|{rn}", sv, rv, {"household.realReturnSensitivity": hoard}))
for hoard in (0, 3):
    for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
        conds.append(c(f"D|hoard{hoard}|{rn}", rv, {"household.realReturnSensitivity": hoard}))
for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
    conds.append(c(f"D|hoarddef|{rn}", rv))
n += spec("E1_regime_structure", conds, series=SERIES + ["moneySupply", "bankFailures"])
# E1L: same cells with every changed default pinned back to v6 (bug fixes only)
conds = []
for s_, sv in list(STRUCT.items()) + [("M", None)]:
    for hoard in (0, 3):
        for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
            if s_ == "M": conds.append(c(f"M|hoard{hoard}|{rn}", LEGACY, MONETARY, rv, {"household.realReturnSensitivity": hoard}))
            else: conds.append(c(f"{s_}|hoard{hoard}|{rn}", LEGACY, sv, rv, {"household.realReturnSensitivity": hoard}))
for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
    conds.append(c(f"M|nobook|{rn}", LEGACY, MONETARY, rv, {"housing.openingMortgageShareOfOwners": 0}))
n += spec("E1L_legacy_defaults", conds, series=SERIES + ["moneySupply", "bankFailures"])
conds = []
for hoard in (0, 3):
    for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
        conds.append(c(f"M|hoard{hoard}|{rn}", MONETARY, rv, {"household.realReturnSensitivity": hoard}))
for tgt in (0.0, 0.04):
    conds.append(c(f"M|fiat_target{tgt}", MONETARY, FIAT, {"centralBank.inflationTarget": tgt}))
conds.append(c("M|fiat_moneyGrowth0.05", MONETARY, FIAT, {"centralBank.moneyGrowth": 0.05}))
conds.append(c("M|fiat_moneyGrowth0.05_stim0.05", MONETARY, FIAT, {"centralBank.moneyGrowth": 0.05, "centralBank.stimulus": 0.05}))
conds.append(c("M|fiat_stim0.05", MONETARY, FIAT, {"centralBank.stimulus": 0.05}))
conds.append(c("M|fiat_stim0", MONETARY, FIAT, {"centralBank.stimulus": 0}))
conds.append(c("M|fiat_moneyGrowth0.05_stim0", MONETARY, FIAT, {"centralBank.moneyGrowth": 0.05, "centralBank.stimulus": 0}))
conds.append(c("M|fiat_zombie0.5", MONETARY, FIAT, {"centralBank.zombieSupport": 0.5}))
conds.append(c("M|fiat_premium0", MONETARY, FIAT, {"housing.monetaryPremium": 0}))
conds.append(c("M|bitcoin_premium0", MONETARY, BTC, {"housing.monetaryPremium": 0}))
conds.append(c("M|fiat_stim2", MONETARY, FIAT, {"centralBank.stimulus": 2}))
conds.append(c("M|fiat_rig0.7", MONETARY, FIAT, {"wage.nominalRigidity": 0.7}))
conds.append(c("M|bitcoin_rig0.7", MONETARY, BTC, {"wage.nominalRigidity": 0.7}))
conds.append(c("M|fiat_premium0.5", MONETARY, FIAT, {"housing.monetaryPremium": 0.5}))
conds.append(c("M|bitcoin_premium0.5", MONETARY, BTC, {"housing.monetaryPremium": 0.5}))
conds.append(c("M|fiat_nobook", MONETARY, FIAT, {"housing.openingMortgageShareOfOwners": 0}))
conds.append(c("M|bitcoin_nobook", MONETARY, BTC, {"housing.openingMortgageShareOfOwners": 0}))
conds.append(c("S0|fiat_moneyGrowth0.05", STRUCT["S0"], FIAT, {"centralBank.moneyGrowth": 0.05}))
conds.append(c("S3|fiat_moneyGrowth0.05", STRUCT["S3"], FIAT, {"centralBank.moneyGrowth": 0.05}))
n += spec("X1_monetary_preset", conds, series=SERIES + ["moneySupply", "bottomQuintileWealthShare", "bankFailures", "defaults", "mortgageToRent", "rentShare"])

# E1b: gold-like proxy (fiat with 0% target) and higher-target fiat vs bitcoin
conds = []
for s in ("S0", "S2"):
    for tgt in (0.0, 0.02, 0.04):
        conds.append(c(f"{s}|fiat_target{tgt}", STRUCT[s], FIAT, {"centralBank.inflationTarget": tgt}))
    conds.append(c(f"{s}|bitcoin", STRUCT[s], BTC))
n += spec("E1b_targets", conds)

# E2: distribution / early holders via 12-month transition
conds = []
for s in ("S0", "S2"):
    conds.append(c(f"{s}|steady_fiat", STRUCT[s], FIAT))
    conds.append(c(f"{s}|steady_bitcoin", STRUCT[s], BTC))
    for hc in (0.0, 0.5, 0.99):
        conds.append(c(f"{s}|transition_hc{hc}", STRUCT[s], FIAT,
                       {"transition.lengthMonths": 12, "transition.holderConcentration": hc}))
conds += [c("M|steady_fiat", MONETARY, FIAT), c("M|steady_bitcoin", MONETARY, BTC)] + [c(f"M|transition_hc{hc}", MONETARY, FIAT, {"transition.lengthMonths": 12, "transition.holderConcentration": hc}) for hc in (0.0, 0.5, 0.99)]
conds += [c("M|transition_hc0.5|realMortgage", MONETARY, FIAT, {"transition.lengthMonths": 12, "transition.holderConcentration": 0.5, "transition.realMortgage": "on"})]
n += spec("E2_distribution", conds, snaps=(0, 11, 12, 59, 119, 239),
          series=SERIES + ["bottomQuintileWealthShare", "topDecileWealthShare", "meanRealWealth"])

# E3: debt and housing with tenure choice and housing market on
conds = []
HOUSE = {"housing.tenureChoice": "on", "housing.marketClearing": "on"}
for g in (0.01, 0.03):
    for ds in (0, 1, 5):
        for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
            conds.append(c(f"g{g}|defl{ds}|{rn}", HOUSE, rv, {"productivity.baseGrowth": g, "deflation.sensitivity": ds}))
for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
    for ds in (0, 1, 5):
        conds.append(c(f"M|defl{ds}|{rn}", MONETARY, HOUSE, rv, {"deflation.sensitivity": ds}))
for g, ds in ((0.01, 1), (0.03, 5)):
    for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
        conds.append(c(f"g{g}|defl{ds}|{rn}|housingFix", HOUSE, HOUSING_FIX, rv, {"productivity.baseGrowth": g, "deflation.sensitivity": ds}))
n += spec("E3_debt_housing", conds,
          series=SERIES + ["mortgageShare", "ownedShare", "rentShare", "medianDebtService", "consumerCreditToGdp", "priceHousing", "defaults",
                           "mortgageOriginations", "rentToMortgage", "mortgageToRent", "bankFailures", "moneySupply"])

# E4: recession / supply / credit shocks, no random shocks, forced at month 60
conds = []
SHOCKS = {"none": None, "demand": {"tick": 60, "kind": "demand", "size": -0.15},
          "supply": {"tick": 60, "kind": "productivity", "size": -0.10},
          "credit": {"tick": 60, "kind": "credit", "size": 0.15}}
POL = {"fiat": {**FIAT, "government.stabilizer": 0}, "fiat+stabilizer": {**FIAT, "government.stabilizer": 1}, "fiat+stab+stim0": {**FIAT, "government.stabilizer": 1, "centralBank.stimulus": 0},
       "bitcoin": BTC, "hybrid": {"regime.type": "hybrid"}}
for s in ("S0", "S2"):
    for pn, pv in POL.items():
        for sn, sh in SHOCKS.items():
            d = c(f"{s}|{pn}|{sn}|rig0.7", STRUCT[s], pv)
            if sh: d["shock"] = sh
            conds.append(d)
for rig in (0.0, 0.95):
    for pn in ("fiat", "fiat+stabilizer", "bitcoin"):
        for sn in ("none", "demand"):
            d = c(f"S2|{pn}|{sn}|rig{rig}", STRUCT["S2"], POL[pn], {"wage.nominalRigidity": rig})
            if SHOCKS[sn]: d["shock"] = SHOCKS[sn]
            conds.append(d)
for pn, pv in POL.items():
    for sn, sh in SHOCKS.items():
        d = c(f"M|{pn}|{sn}|rig0.7", MONETARY, pv)
        if sh: d["shock"] = sh
        conds.append(d)
for pn in ("fiat", "fiat+stabilizer", "bitcoin"):
    for sn in ("none", "demand"):
        d = c(f"S2|{pn}|{sn}|rig0.95flex0.3", STRUCT["S2"], POL[pn], {"wage.nominalRigidity": 0.95})  # emergencyFlex removed in v4  # emergencyFlex removed in v4; label kept for table continuity
        if SHOCKS[sn]: d["shock"] = SHOCKS[sn]
        conds.append(d)
n += spec("E4_shocks", conds, ticks=144, base={"shock.frequency": 0}, snaps=(59, 143),
          series=["unemployment", "realGdp", "priceLevel", "medianRealConsumption", "defaults", "bankFailures"])

# E5: savers -- deposit pass-through
conds = []
for pt in (0, 0.5, 1):
    for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
        conds.append(c(f"S0|pass{pt}|{rn}", STRUCT["S0"], rv, {"bank.depositPassThrough": pt}))
conds.append(c("S0|pass1|fiat|subsidy1", STRUCT["S0"], FIAT, {"bank.depositPassThrough": 1, "bank.depositInterestSubsidy": 1}))
for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
    conds.append(c(f"S3|pass1|{rn}", STRUCT["S3"], rv, {"bank.depositPassThrough": 1}))
conds.append(c("S3|pass1|fiat|subsidy1", STRUCT["S3"], FIAT, {"bank.depositPassThrough": 1, "bank.depositInterestSubsidy": 1}))
for s_ in ("S0", "S3"):
    for ch in ("governmentSpending", "newLoans", "assetPurchase"):
        conds.append(c(f"{s_}|pass1|fiat|ch={ch}", STRUCT[s_], FIAT, {"bank.depositPassThrough": 1, "centralBank.injectionChannel": ch}))
n += spec("E5_savers", conds, series=SERIES + ["moneySupply", "velocity", "bottomQuintileWealthShare"])

# E6: one-at-a-time sensitivity of the bitcoin-minus-fiat gap
VARIANTS = [("base", {}),
    ("hoard=2", {"household.realReturnSensitivity": 2}), ("hoard=5", {"household.realReturnSensitivity": 5}),
    ("wageRigidity=0", {"wage.nominalRigidity": 0}), ("wageRigidity=0.95", {"wage.nominalRigidity": 0.95}),
    ("priceTrendWeight=0.5", {"prices.trendWeight": 0.5}), ("priceTrendWeight=0", {"prices.trendWeight": 0}),
    ("deflSens=0", {"deflation.sensitivity": 0}), ("deflSens=5", {"deflation.sensitivity": 5}),
    ("endoCredit=1", {"credit.endogenousWeight": 1}),
    ("skillSigma=0.2", {"household.skillSigma": 0.2}), ("skillSigma=1.0", {"household.skillSigma": 1.0}),
    ("prodGrowth=0", {"productivity.baseGrowth": 0}), ("prodGrowth=0.03", {"productivity.baseGrowth": 0.03}),
    ("anchor=0.5", {"expectations.anchorWeight": 0.5}), ("anchor=1", {"expectations.anchorWeight": 1}),
    ("hurdle=on,prem0.06", {"firm.investmentHurdle": "on", "firm.hurdlePremium": 0.06}),
    ("fullReserve", {"bitcoin.lendingModel": "fullReserve"}),
    ("shocks=0", {"shock.frequency": 0}), ("shocks=0.5", {"shock.frequency": 0.5}),
    ("wageElasticity=0", {"labor.wageElasticity": 0}), ("wageElasticity=2", {"labor.wageElasticity": 2}),
    ("inflTimePref=0", {"household.inflationTimePreference": 0}), ("inflTimePref=0.4", {"household.inflationTimePreference": 0.4}),
    ("depositPass=1", {"bank.depositPassThrough": 1}),
    ("stabilizer=1", {"government.stabilizer": 1}),
    ("fiatMoneyGrowth=0.05", {"centralBank.moneyGrowth": 0.05}),
    ("wageRigidity=0.7", {"wage.nominalRigidity": 0.7}),
    ("stimulus=0.05", {"centralBank.stimulus": 0.05}), ("stimulus=2", {"centralBank.stimulus": 2}),
    ("stimulusLag=1", {"centralBank.stimulusLag": 1}), ("stimulusLag=24", {"centralBank.stimulusLag": 24}),
    ("monetaryPremium=0.5", {"housing.monetaryPremium": 0.5}), ("monetaryPremium=0", {"housing.monetaryPremium": 0}),
    ("stimulus=0", {"centralBank.stimulus": 0}), ("zombieSupport=0.5", {"centralBank.zombieSupport": 0.5}),
    ("stabilizer=0", {"government.stabilizer": 0}), ("moneyChoice=0", {"money.choiceSpeed": 0}),
    ("firmLevelHiring=off", {"labor.firmLevelHiring": "off"}), ("bookOff", {"housing.openingMortgageShareOfOwners": 0}),
    ("v6defaults", "LEGACY"),
    # v3 opt-in fixes
    ("inject=governmentSpending", {"centralBank.injectionChannel": "governmentSpending"}),
    ("inject=newLoans", {"centralBank.injectionChannel": "newLoans"}),
    ("inject=assetPurchase", {"centralBank.injectionChannel": "assetPurchase"}),
    ("spendNewMoney=1", {"centralBank.spendNewMoney": 1}),
    ("depositSubsidy=1", {"bank.depositInterestSubsidy": 1}),
    ("durableShare=0.5", {"household.durableShare": 0.5}),
    ("rateTransmission=1", {"credit.rateTransmission": 1}),
    ("endoProductivity=1", {"productivity.endogenousWeight": 1}),
    ("resolution=merge", {"bank.resolution": "merge"}),
    ("allFixes", ALLFIX),
]
STRUCT_E6 = dict(STRUCT); STRUCT_E6["M"] = MONETARY
for s in ("S0", "S2", "M"):
    conds = []
    for vn, vv in VARIANTS:
        for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
            vv_ = LEGACY if vv == "LEGACY" else vv
            conds.append(c(f"{s}|{vn}|{rn}", STRUCT_E6[s], vv_, rv) if vv != "LEGACY" else c(f"{s}|{vn}|{rn}", LEGACY, STRUCT_E6[s], rv))
    n += spec(f"E6_sensitivity_{s}", conds, series=["unemployment", "realGdp"])

# E7: investment hurdle
conds = []
for s in ("S0", "S2"):
    for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
        conds.append(c(f"{s}|hurdleOff|{rn}", STRUCT[s], rv, {"firm.investmentHurdle": "off"}))
        for prem in (0.02, 0.04, 0.06, 0.08):
            conds.append(c(f"{s}|prem{prem}|{rn}", STRUCT[s], rv, {"firm.investmentHurdle": "on", "firm.hurdlePremium": prem}))
n += spec("E7_hurdle", conds, series=["unemployment", "realGdp", "medianRealConsumption"])

# E8: transition speed and debt haircut, 10-year horizon
conds = []
for s in ("S0", "S2"):
    conds.append(c(f"{s}|steady_fiat", STRUCT[s], FIAT))
    conds.append(c(f"{s}|steady_bitcoin", STRUCT[s], BTC))
    for L in (1, 12, 60):
        for hc in (0, 0.3):
            conds.append(c(f"{s}|len{L}|haircut{hc}", STRUCT[s], FIAT, {"transition.lengthMonths": L, "transition.debtHaircut": hc,
                           "transition.holderConcentration": 0.5, "housing.tenureChoice": "on"}))
conds += [c("M|steady_fiat", MONETARY, FIAT), c("M|steady_bitcoin", MONETARY, BTC)] + [c(f"M|len{L}|haircut{hc}", MONETARY, FIAT, {"transition.lengthMonths": L, "transition.debtHaircut": hc, "transition.holderConcentration": 0.5}) for L in (1, 12, 60) for hc in (0, 0.3)]
conds += [c(f"M|len{L}|haircut0|realMortgage", MONETARY, FIAT, {"transition.lengthMonths": L, "transition.debtHaircut": 0, "transition.holderConcentration": 0.5, "transition.realMortgage": "on"}) for L in (1, 12, 60)]
for s_, sv_ in (("S0", {**STRUCT["S0"], "housing.tenureChoice": "on"}), ("S2", {**STRUCT["S2"], "housing.tenureChoice": "on"}), ("M", MONETARY)):
    for L in (12, 60):
        conds.append(c(f"{s_}|len{L}|haircut0.3|gradual1", sv_, FIAT, {"transition.lengthMonths": L, "transition.debtHaircut": 0.3,
                       "transition.holderConcentration": 0.5, "transition.gradualWeight": 1}))
n += spec("E8_transition", conds, ticks=120, snaps=(0, 11, 59, 119), series=SERIES + ["moneySupply", "bankFailures"])

# X2 (v3): Barry's new opt-in fixes, all at once and one channel at a time
conds = []
S3ALL = {**STRUCT["S3"], **ALLFIX}; MALL = {**MONETARY, **ALLFIX}
for sname, sv in (("S1", STRUCT["S1"]), ("S3", STRUCT["S3"]), ("M", MONETARY), ("S3all", S3ALL), ("Mall", MALL)):
    for hoard in (0, 3):
        for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
            conds.append(c(f"{sname}|hoard{hoard}|{rn}", sv, rv, {"household.realReturnSensitivity": hoard}))
for sname, sv in (("S1", STRUCT["S1"]), ("S3", STRUCT["S3"]), ("M", MONETARY)):
    for ch in ("proRataDeposits", "governmentSpending", "newLoans", "assetPurchase"):
        for snm in (0, 1):
            if ch == "proRataDeposits" and snm == 0: continue  # = base
            conds.append(c(f"{sname}|fiat|ch={ch}|spend{snm}", sv, FIAT, {"centralBank.injectionChannel": ch, "centralBank.spendNewMoney": snm}))
for sname, sv in (("S0", STRUCT["S0"]), ("S3", STRUCT["S3"])):
    for bq in ("firstHousehold", "skillWeighted"):
        for rn, rv in (("fiat", FIAT), ("bitcoin", BTC)):
            conds.append(c(f"{sname}|pop-0.01|{bq}|{rn}", sv, rv, {"population.growth": -0.01, "population.bequests": bq}))
n += spec("X2_fixes", conds, series=SERIES + ["moneySupply", "velocity", "bottomQuintileWealthShare", "topDecileWealthShare", "creditToGdp", "bankFailures", "mortgageOriginations", "rentToMortgage"])

# E9: AI on (model defaults), friction asymmetry check
AI_V1 = {"ai.adoptionMidpointYear": 10, "ai.adoptionSteepness": 0.4, "ai.bullishness": 1, "ai.physicalTaskShare": 0.3, "ai.roboticsRampYears": 12, "ai.roboticsStartYear": 8}
conds = [c("AI|fiat", AI_V1, FIAT), c("AI|bitcoin", AI_V1, BTC), c("AI|bitcoin_fiatFriction", AI_V1, BTC, {"ai.paymentFrictionBitcoin": 0.02}),
         c("AIdefault|fiat", FIAT), c("AIdefault|bitcoin", BTC)]
s9 = {"scale.households": 500, "scale.firms": 50, "scale.banks": 3}
spec_ = {"name": "E9_ai", "ticks": 240, "seeds": SEEDS, "snapshotTicks": [0, 119, 239],
         "base": {"sliders": s9}, "seriesMetrics": SERIES, "conditions": conds}
json.dump(spec_, open(os.path.join(OUT, 'E9_ai.json'), 'w'), indent=1)
n += 5
print("conditions:", n, "runs:", n * len(SEEDS))
