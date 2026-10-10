"""Summarize runner output into markdown tables (results/*.md) and charts (charts/*.png).
Run: ../.venv/bin/python analyze.py"""
import json, os, glob, math
from collections import defaultdict
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA, RES, CH = (os.path.join(ROOT, d) for d in ('data-v10', 'results-v10', 'charts-v10'))
os.makedirs(RES, exist_ok=True); os.makedirs(CH, exist_ok=True)

ERRORS = []
ZERO_SKIPS = []
def load(name):
    rows = defaultdict(dict)  # cond -> seed -> row
    with open(os.path.join(DATA, name + '.jsonl')) as f:
        for line in f:
            r = json.loads(line)
            if 'error' in r:
                ERRORS.append((name, r['cond'], r['seed'], r['error'])); continue
            rows[r['cond']][r['seed']] = r
    return rows

def val(r, m, t=None):
    T = r['ticks']
    t = T - 1 if t is None else t
    if m in r['series']:
        v = r['series'][m][t]
    elif t == T - 1:
        v = r['end'][m]
    else:
        raise KeyError(m)
    return float('nan') if v is None else float(v)

def avg(r, m, a=0, b=None):
    s = [x for x in r['series'][m][a:b] if x is not None]
    return float(np.mean(s))

def st(xs):
    xs = np.array([x for x in xs if not (isinstance(x, float) and math.isnan(x))], dtype=float)
    if len(xs) == 0: return dict(mean=float('nan'), sd=float('nan'), lo=float('nan'), hi=float('nan'), n=0)
    return dict(mean=xs.mean(), sd=xs.std(ddof=1) if len(xs) > 1 else 0.0,
                lo=np.percentile(xs, 5), hi=np.percentile(xs, 95), n=len(xs))

def fmt(s, d=3, pct=False):
    if s['n'] == 0: return 'n/a'
    k = 100 if pct else 1
    u = '%' if pct else ''
    return f"{s['mean']*k:.{d}f}{u} [{s['lo']*k:.{d}f}, {s['hi']*k:.{d}f}]"

def paired(rows, a, b, f, rel=False):
    """per-seed f(b) - f(a) (or ratio-1 if rel)."""
    out = []
    for seed, ra in rows[a].items():
        rb = rows[b].get(seed)
        if rb is None: continue
        va, vb = f(ra), f(rb)
        if rel and va == 0:
            ZERO_SKIPS.append(a); continue  # collapsed run (median consumption 0); excluded from ratio
        out.append(vb / va - 1 if rel else vb - va)
    return st(out)

def sign_share(rows, a, b, f):
    d = [f(rows[b][s]) - f(rows[a][s]) for s in rows[a] if s in rows[b]]
    return sum(1 for x in d if x > 0) / len(d)

def table(header, lines):
    out = '| ' + ' | '.join(header) + ' |\n|' + '|'.join(['---'] * len(header)) + '|\n'
    for l in lines: out += '| ' + ' | '.join(str(x) for x in l) + ' |\n'
    return out

def write(name, text):
    open(os.path.join(RES, name + '.md'), 'w').write(text)

def mean_series(rows, cond, m):
    arr = np.array([[np.nan if v is None else v for v in r['series'][m]] for r in rows[cond].values()], dtype=float)
    return np.nanmean(arr, axis=0), np.nanpercentile(arr, 10, axis=0), np.nanpercentile(arr, 90, axis=0)

def audit_ok(rows):
    return all(r['auditOk'] for c in rows.values() for r in c.values())

AUDIT = {}
ERRORS = []

# ---------------- E1 ----------------
def e1():
    R = load('E1_regime_structure'); AUDIT['E1'] = audit_ok(R)
    SN = {'S0': 'S0 trend prices, supply-side output (default)', 'S1': 'S1 demand-driven prices',
          'S2': 'S2 demand-constrained output+hiring', 'S3': 'S3 demand prices + demand output'}
    L = []
    for s in ('S0', 'S1', 'S2', 'S3'):
        for h in (0, 3):
            a, b = f'{s}|hoard{h}|fiat', f'{s}|hoard{h}|bitcoin'
            L.append([SN[s], h,
                fmt(st([val(r, 'medianRealConsumption') for r in R[a].values()]), 3),
                fmt(st([val(r, 'medianRealConsumption') for r in R[b].values()]), 3),
                fmt(paired(R, a, b, lambda r: val(r, 'medianRealConsumption'), rel=True), 1, True),
                fmt(paired(R, a, b, lambda r: avg(r, 'unemployment', 12)), 2, True),
                fmt(paired(R, a, b, lambda r: val(r, 'realGdp'), rel=True), 1, True),
                fmt(paired(R, a, b, lambda r: val(r, 'medianRealWealth'), rel=True), 1, True),
                fmt(paired(R, a, b, lambda r: val(r, 'giniWealth')), 3),
                f"{sign_share(R, a, b, lambda r: val(r, 'medianRealConsumption')):.0%}"])
    txt = '### E1: bitcoin minus fiat, year 20, no AI, random shocks (freq 0.1), 20 seeds\n\n'
    txt += 'Values are mean [5th, 95th percentile] across seeds; differences are paired by seed.\n\n'
    txt += table(['structure', 'hoarding (realReturnSensitivity)', 'fiat median real cons.', 'bitcoin median real cons.',
                  'Δ median real cons.', 'Δ avg unemployment (yrs 2-20, pp)', 'Δ real GDP', 'Δ median real wealth', 'Δ wealth Gini',
                  'seeds where bitcoin median cons. higher'], L)
    # extra levels table
    L2 = []
    for s in ('S0', 'S1', 'S2', 'S3'):
        for rn in ('fiat', 'bitcoin'):
            cnd = f'{s}|hoard0|{rn}'
            rs = R[cnd].values()
            L2.append([s, rn, fmt(st([avg(r, 'inflation', 12) for r in rs]), 2, True),
                       fmt(st([avg(r, 'unemployment', 12) for r in rs]), 1, True),
                       fmt(st([val(r, 'realGdp') for r in rs]), 0), fmt(st([val(r, 'realWage') for r in rs]), 3),
                       fmt(st([val(r, 'moneySupply') / val(r, 'moneySupply', None) for r in rs]), 2) if False else
                       f"{np.mean([r['end']['moneySupply'] for r in rs]):.3g}"])
    txt += '\n\nLevels (hoarding 0):\n\n' + table(['structure', 'regime', 'avg annual inflation', 'avg unemployment', 'real GDP yr20', 'real wage yr20', 'broad money yr20 (start ≈ 2.40e6)'], L2)
    write('E1', txt)
    # chart: median real consumption paths
    fig, axs = plt.subplots(1, 4, figsize=(18, 4), sharey=False)
    for ax, s in zip(axs, ('S0', 'S1', 'S2', 'S3')):
        for rn, col in (('fiat', 'tab:blue'), ('bitcoin', 'tab:orange')):
            m, lo, hi = mean_series(R, f'{s}|hoard0|{rn}', 'medianRealConsumption')
            x = np.arange(len(m)) / 12
            ax.plot(x, m, color=col, label=rn); ax.fill_between(x, lo, hi, color=col, alpha=0.2)
        ax.set_title(SN[s], fontsize=9); ax.set_xlabel('years')
    axs[0].set_ylabel('median real consumption'); axs[0].legend()
    fig.suptitle('E1: median real consumption, fiat vs bitcoin (no AI, hoarding 0; band = 10–90% of 20 seeds)')
    fig.tight_layout(); fig.savefig(os.path.join(CH, 'e1_consumption_by_structure.png'), dpi=110); plt.close(fig)
    fig, axs = plt.subplots(1, 4, figsize=(18, 4))
    for ax, s in zip(axs, ('S0', 'S1', 'S2', 'S3')):
        for rn, col in (('fiat', 'tab:blue'), ('bitcoin', 'tab:orange')):
            m, lo, hi = mean_series(R, f'{s}|hoard0|{rn}', 'unemployment')
            x = np.arange(len(m)) / 12
            ax.plot(x, m * 100, color=col, label=rn); ax.fill_between(x, lo * 100, hi * 100, color=col, alpha=0.2)
        ax.set_title(SN[s], fontsize=9); ax.set_xlabel('years')
    axs[0].set_ylabel('unemployment %'); axs[0].legend()
    fig.tight_layout(); fig.savefig(os.path.join(CH, 'e1_unemployment_by_structure.png'), dpi=110); plt.close(fig)

def e1b():
    R = load('E1b_targets'); AUDIT['E1b'] = audit_ok(R)
    L = []
    for s in ('S0', 'S2'):
        for c in (f'{s}|fiat_target0.0', f'{s}|fiat_target0.02', f'{s}|fiat_target0.04', f'{s}|bitcoin'):
            rs = R[c].values()
            L.append([c, fmt(st([avg(r, 'inflation', 12) for r in rs]), 2, True), fmt(st([val(r, 'medianRealConsumption') for r in rs]), 3),
                      fmt(st([avg(r, 'unemployment', 12) for r in rs]), 1, True), fmt(st([val(r, 'medianRealWealth') for r in rs]), 1),
                      fmt(st([val(r, 'giniWealth') for r in rs]), 3)])
    write('E1b', '### E1b: inflation target sweep (0% ≈ stable-price / gold-like proxy) vs bitcoin, year 20\n\n' +
          table(['condition', 'avg inflation', 'median real cons.', 'avg unemployment', 'median real wealth', 'wealth Gini'], L))

# ---------------- E2 ----------------
def e2():
    R = load('E2_distribution'); AUDIT['E2'] = audit_ok(R)
    L = []; Q = []
    for s in ('S0', 'S2', 'M'):
        for c in ('steady_fiat', 'steady_bitcoin', 'transition_hc0.0', 'transition_hc0.5', 'transition_hc0.99'):
            cnd = f'{s}|{c}'; rs = list(R[cnd].values())
            L.append([cnd,
                fmt(st([val(r, 'giniWealth', 0) for r in rs]), 3), fmt(st([val(r, 'giniWealth', 12) for r in rs]), 3),
                fmt(st([val(r, 'giniWealth', 119) for r in rs]), 3), fmt(st([val(r, 'giniWealth', 239) for r in rs]), 3),
                fmt(st([val(r, 'bottomQuintileWealthShare', 239) for r in rs]), 1, True),
                fmt(st([val(r, 'topDecileWealthShare', 239) for r in rs]), 1, True),
                fmt(st([val(r, 'medianRealWealth', 239) / val(r, 'meanRealWealth', 239) for r in rs]), 2),
                fmt(st([val(r, 'medianRealConsumption', 239) for r in rs]), 3)])
            # skill-quintile real deposits relative to steady fiat
            for q in range(5):
                pass
        # quintile table at yr 20: real deposits by skill quintile
        for c in ('steady_fiat', 'steady_bitcoin', 'transition_hc0.0', 'transition_hc0.5', 'transition_hc0.99'):
            cnd = f'{s}|{c}'; rs = list(R[cnd].values())
            row = [cnd]
            for q in range(5):
                row.append(f"{np.mean([r['snaps']['239']['skillQuintiles'][q]['realDeposit'] for r in rs]):.1f}")
            row.append(f"{np.mean([r['snaps']['239']['skillQuintiles'][0]['realCons'] for r in rs]):.3f}")
            Q.append(row)
    txt = '### E2: distribution under steady regimes and a 12-month fiat→bitcoin transition (deposits reassigned by skill^(1+4·hc) at month 12)\n\n'
    txt += table(['condition', 'Gini m0 (start)', 'Gini m12 (just after rebase at m11)', 'Gini yr10', 'Gini yr20', 'bottom-20% wealth share yr20',
                  'top-10% wealth share yr20', 'median/mean wealth yr20', 'median real cons. yr20'], L)
    txt += '\n\nMean real deposits per household by skill quintile at year 20 (Q1 = lowest skill), and Q1 real consumption:\n\n'
    txt += table(['condition', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q1 real cons.'], Q)
    write('E2', txt)
    fig, axs = plt.subplots(1, 3, figsize=(19, 4))
    for ax, s in zip(axs, ('S0', 'S2', 'M')):
        for c, col in (('steady_fiat', 'tab:blue'), ('steady_bitcoin', 'tab:orange'), ('transition_hc0.0', 'tab:green'),
                       ('transition_hc0.5', 'tab:red'), ('transition_hc0.99', 'tab:purple')):
            m, lo, hi = mean_series(R, f'{s}|{c}', 'giniWealth'); x = np.arange(len(m)) / 12
            ax.plot(x, m, color=col, label=c)
        ax.set_title(f'{s}: wealth Gini'); ax.set_xlabel('years')
    axs[0].legend(fontsize=8); fig.tight_layout(); fig.savefig(os.path.join(CH, 'e2_gini_paths.png'), dpi=110); plt.close(fig)

# ---------------- E3 ----------------
def quint_row(label, rs):
    row = [label]
    for q in range(5):
        sq = [r['snaps']['239']['skillQuintiles'][q] for r in rs]
        row.append(f"{np.mean([x['owners'] + x['mortgagors'] for x in sq]):.0%} own / {np.mean([x.get('renters', 0) for x in sq]):.0%} rent / debt {np.mean([x['realDebt'] for x in sq]):.0f}")
    return row

def e3():
    R = load('E3_debt_housing'); AUDIT['E3'] = audit_ok(R)
    L = []; Q = []
    for g in (0.01, 0.03):
        for ds in (0, 1, 5):
            for rn in ('fiat', 'bitcoin'):
                cnd = f'g{g}|defl{ds}|{rn}'; rs = list(R[cnd].values())
                L.append([f'g={g}', ds, rn, fmt(st([avg(r, 'inflation', 12) for r in rs]), 1, True),
                          fmt(st([val(r, 'mortgageShare') for r in rs]), 1, True), fmt(st([val(r, 'ownedShare') for r in rs]), 1, True),
                          fmt(st([val(r, 'rentShare') for r in rs]), 1, True), fmt(st([val(r, 'medianDebtService') for r in rs]), 3),
                          fmt(st([val(r, 'creditToGdp') for r in rs]), 3), fmt(st([val(r, 'consumerCreditToGdp') for r in rs]), 3),
                          fmt(st([val(r, 'priceHousing') / val(r, 'priceLevel') for r in rs]), 2),
                          f"{np.mean([sum((x or 0) / p for x, p in zip(r['series']['defaults'], r['series']['priceLevel'])) for r in rs]):.1f}",
                          fmt(st([val(r, 'medianRealConsumption') for r in rs]), 3)])
                Q.append(quint_row(f'g={g} defl={ds} {rn}', rs))
    for rn in ('fiat', 'bitcoin'):
        for ds in (0, 1, 5):
            cnd = f'M|defl{ds}|{rn}'
            if cnd not in R: continue
            rs = list(R[cnd].values())
            L.append(['M preset', ds, rn, fmt(st([avg(r, 'inflation', 12) for r in rs]), 1, True),
                      fmt(st([val(r, 'mortgageShare') for r in rs]), 1, True), fmt(st([val(r, 'ownedShare') for r in rs]), 1, True),
                      fmt(st([val(r, 'rentShare') for r in rs]), 1, True), fmt(st([val(r, 'medianDebtService') for r in rs]), 3),
                      fmt(st([val(r, 'creditToGdp') for r in rs]), 3), fmt(st([val(r, 'consumerCreditToGdp') for r in rs]), 3),
                      fmt(st([val(r, 'priceHousing') / val(r, 'priceLevel') for r in rs]), 2),
                      f"{np.mean([sum((x or 0) / p for x, p in zip(r['series']['defaults'], r['series']['priceLevel'])) for r in rs]):.1f}",
                      fmt(st([val(r, 'medianRealConsumption') for r in rs]), 3)])
            Q.append(quint_row(f'M defl={ds} {rn}', rs))
    for g, ds in ((0.01, 1), (0.03, 5)):
        for rn in ('fiat', 'bitcoin'):
            cnd = f'g{g}|defl{ds}|{rn}|housingFix'
            if cnd not in R: continue
            rs = list(R[cnd].values())
            L.append([f'g={g} housingFix', ds, rn, fmt(st([avg(r, 'inflation', 12) for r in rs]), 1, True),
                      fmt(st([val(r, 'mortgageShare') for r in rs]), 1, True), fmt(st([val(r, 'ownedShare') for r in rs]), 1, True),
                      fmt(st([val(r, 'rentShare') for r in rs]), 1, True), fmt(st([val(r, 'medianDebtService') for r in rs]), 3),
                      fmt(st([val(r, 'creditToGdp') for r in rs]), 3), fmt(st([val(r, 'consumerCreditToGdp') for r in rs]), 3),
                      fmt(st([val(r, 'priceHousing') / val(r, 'priceLevel') for r in rs]), 2),
                      f"{np.mean([sum((x or 0) / p for x, p in zip(r['series']['defaults'], r['series']['priceLevel'])) for r in rs]):.1f}",
                      fmt(st([val(r, 'medianRealConsumption') for r in rs]), 3)])
            Q.append(quint_row(f'g={g} defl={ds} {rn} housingFix', rs))
    F = []
    for cnd in R:
        rs = list(R[cnd].values())
        if 'rentToMortgage' not in rs[0]['series']: continue
        F.append([cnd, f"{np.mean([sum(x or 0 for x in r['series']['mortgageOriginations']) for r in rs]):.1f}",
                  f"{np.mean([sum(x or 0 for x in r['series']['rentToMortgage']) for r in rs]):.1f}",
                  f"{np.mean([sum(x or 0 for x in r['series']['mortgageToRent']) for r in rs]):.1f}",
                  f"{np.mean([r['series']['creditToGdp'][0] for r in rs]):.2f} → {np.mean([val(r, 'creditToGdp') for r in rs]):.2f}",
                  f"{np.mean([max(x or 0 for x in r['series']['bankFailures']) for r in rs]):.1f}"])
    txt0 = '\n\nMortgage flows per 20-year run (sums of monthly counts; 500 households), credit/GDP start → yr 20, bank failures:\n\n' + table(['condition', 'mortgage originations', 'renter → mortgage', 'foreclosures (mortgage → rent)', 'credit/GDP', 'cumulative bank failures'], F)
    txt = '### E3: debt, credit and housing (tenure choice on, housing market clearing on), year 20. housingFix = credit.householdMortgageShare 0.25, LTV 0.95, bank.resolution merge\n\n'
    txt += table(['prod growth', 'deflation sensitivity', 'regime', 'avg inflation', 'mortgage share', 'owned (cash) share', 'rent share',
                  'median debt service', 'credit/GDP', 'consumer credit/GDP', 'housing price / CPI', 'cum. real defaults (Σ defaults_t / CPI_t)', 'median real cons.'], L)
    txt += '\n\nOwner share (owned+mortgage) / renter share / mean real household debt, by skill quintile at year 20:\n\n'
    txt += table(['condition', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5'], Q)
    txt += txt0
    write('E3', txt)
    fig, axs = plt.subplots(1, 2, figsize=(13, 4))
    for ax, m in zip(axs, ('mortgageShare', 'rentShare')):
        for cnd, col, ls in (('g0.01|defl1|fiat', 'tab:blue', '-'), ('g0.01|defl1|bitcoin', 'tab:orange', '-'),
                             ('g0.03|defl1|bitcoin', 'tab:red', '-'), ('g0.03|defl5|bitcoin', 'tab:purple', '--'),
                             ('M|defl1|fiat', 'tab:green', ':'), ('M|defl1|bitcoin', 'tab:brown', ':')):
            mm, lo, hi = mean_series(R, cnd, m); x = np.arange(len(mm)) / 12
            ax.plot(x, mm * 100, color=col, ls=ls, label=cnd)
        ax.set_title(m + ' (%)'); ax.set_xlabel('years')
    axs[0].legend(fontsize=8); fig.tight_layout(); fig.savefig(os.path.join(CH, 'e3_tenure.png'), dpi=110); plt.close(fig)

# ---------------- E4 ----------------
def e4():
    R = load('E4_shocks'); AUDIT['E4'] = audit_ok(R)
    def metrics(rows, none_c, shock_c):
        peak, loss, months, end_gap, lvl = [], [], [], [], []
        for seed, rn in rows[none_c].items():
            if seed not in rows.get(shock_c, {}):
                continue
            rs = rows[shock_c][seed]
            un, us = np.array(rn['series']['unemployment']), np.array(rs['series']['unemployment'])
            gn, gs = np.array(rn['series']['realGdp']), np.array(rs['series']['realGdp'])
            gap = us[60:] - un[60:]
            peak.append(gap.max()); loss.append((gn[60:].sum() - gs[60:].sum()) / gn[60:].sum())
            months.append(int((gap > 0.01).sum())); end_gap.append(gap[-12:].mean()); lvl.append(us[60:96].mean())
        return st(peak), st(loss), st(months), st(end_gap), st(lvl)
    L = []
    for s in ('S0', 'S2', 'M'):
        for pol in ('fiat', 'fiat+stabilizer', 'bitcoin', 'hybrid'):
            for sh in ('demand', 'supply', 'credit'):
                nc, sc = f'{s}|{pol}|none|rig0.7', f'{s}|{pol}|{sh}|rig0.7'
                if nc not in R or sc not in R or not R[nc]:
                    continue
                p, l, m, e, v = metrics(R, nc, sc)
                L.append([s, pol, sh, fmt(v, 1, True), fmt(p, 1, True), fmt(l, 2, True), fmt(m, 0), fmt(e, 1, True)])
    for rig in (0.0, 0.95, '0.95flex0.3'):
        for pol in ('fiat', 'fiat+stabilizer', 'bitcoin'):
            if f'S2|{pol}|none|rig{rig}' not in R: continue
            p, l, m, e, v = metrics(R, f'S2|{pol}|none|rig{rig}', f'S2|{pol}|demand|rig{rig}')
            L.append([f'S2 rig={rig}', pol, 'demand', fmt(v, 1, True), fmt(p, 1, True), fmt(l, 2, True), fmt(m, 0), fmt(e, 1, True)])
    # baseline unemployment levels without shocks
    B = []
    for s in ('S0', 'S2', 'M'):
        for pol in ('fiat', 'fiat+stabilizer', 'bitcoin', 'hybrid'):
            rs = R[f'{s}|{pol}|none|rig0.7'].values()
            B.append([s, pol, fmt(st([avg(r, 'unemployment', 60) for r in rs]), 1, True),
                      f"{max(r['end']['bankFailures'] or 0 for r in R[f'{s}|{pol}|credit|rig0.7'].values())}"])
    txt = '### E4: forced shock at month 60 (no random shocks), paired against the same seed without the shock, 20 seeds\n\n'
    txt += 'Demand = −15% spending/hiring impulse for 12 months then +7.5% for 12; supply = capacity −10% for 12 months; credit = +15% lending impulse for 12 months, 10% of firm loans written off, then −15% for 12 months.\n\n'
    txt += table(['structure', 'policy', 'shock', 'avg unemployment level m60–95 (shock run)', 'peak unemployment gap (pp)', 'cum. real GDP loss, m60–143', 'months with gap > 1pp', 'gap in last 12 months (pp)'], L)
    C = []
    for cnd in sorted(c for c in R if 'rig0.95' in c):
        rs = list(R[cnd].values())
        C.append([cnd, fmt(st([val(r, 'unemployment') for r in rs]), 1, True), f"{sum(1 for r in rs if val(r, 'medianRealConsumption') == 0)}/{len(rs)}"])
    txt += '\n\nRigidity 0.95 collapse check (end of run, month 143): unemployment and runs with median consumption 0 (flex0.3 label kept; emergencyFlex removed in v4 so these rows equal rig0.95):\n\n' + table(['condition', 'unemployment m143', 'runs with median consumption 0'], C)
    txt += '\n\nNo-shock unemployment (months 60–143) and max bank failures in the credit-shock run:\n\n' + table(['structure', 'policy', 'avg unemployment, no shock', 'bank failures (credit shock)'], B)
    write('E4', txt)
    fig, axs = plt.subplots(1, 3, figsize=(19, 4))
    for ax, s in zip(axs, ('S0', 'S2', 'M')):
        for pol, col in (('fiat', 'tab:blue'), ('fiat+stabilizer', 'tab:green'), ('bitcoin', 'tab:orange')):
            gaps = []
            for seed, rn in R[f'{s}|{pol}|none|rig0.7'].items():
                rs = R[f'{s}|{pol}|demand|rig0.7'][seed]
                gaps.append(np.array(rs['series']['unemployment']) - np.array(rn['series']['unemployment']))
            g = np.mean(gaps, axis=0) * 100; x = np.arange(len(g)) - 60
            ax.plot(x[48:], g[48:], color=col, label=pol)
        ax.axvline(0, color='k', lw=0.5); ax.set_title(f'{s}: unemployment gap after demand shock (pp)'); ax.set_xlabel('months since shock')
    axs[0].legend(); fig.tight_layout(); fig.savefig(os.path.join(CH, 'e4_demand_shock.png'), dpi=110); plt.close(fig)

# ---------------- E5 ----------------
def e5():
    R = load('E5_savers'); AUDIT['E5'] = audit_ok(R)
    L = []
    for cnd in R:
        if True:
            rs = list(R[cnd].values())
            row = [cnd, '', fmt(st([avg(r, 'inflation', 12) for r in rs]), 2, True)]
            for q in (0, 2, 4):
                row.append(fmt(st([r['snaps']['239']['skillQuintiles'][q]['realDeposit'] / r['snaps']['0']['skillQuintiles'][q]['realDeposit'] for r in rs]), 2))
            row.append(fmt(st([val(r, 'medianRealConsumption') for r in rs]), 3))
            row.append(fmt(st([val(r, 'giniWealth') for r in rs]), 3))
            row.append(f"{np.mean([r['series']['velocity'][-1] for r in rs]):.4f}" if 'velocity' in rs[0]['series'] else '')
            row.append(fmt(st([(val(r, 'moneySupply', 239) / val(r, 'moneySupply', 0)) ** (12 / 239) - 1 for r in rs]), 2, True) if 'moneySupply' in rs[0]['series'] else '')
            L.append(row)
    txt = '### E5: purchasing power of household deposits (no AI), real deposits at year 20 ÷ month 0, by skill quintile\n\n'
    txt += 'Condition = structure | deposit pass-through | regime | v3 option (subsidy1 = bank.depositInterestSubsidy 1; ch = centralBank.injectionChannel).\n\n'
    txt += table(['condition', '', 'avg inflation', 'Q1 (lowest skill)', 'Q3', 'Q5 (highest skill)', 'median real cons.', 'wealth Gini', 'velocity yr20 (/month)', 'broad money growth'], L)
    write('E5', txt)

# ---------------- E6 ----------------
def e6():
    out = '### E6: one-at-a-time sensitivity of the bitcoin-minus-fiat gap, year 20, 20 seeds\n\n'
    for s in ('S0', 'S2', 'M'):
        R = load(f'E6_sensitivity_{s}'); AUDIT[f'E6_{s}'] = audit_ok(R)
        names = []
        for c in R:
            v = c.split('|')[1]
            if v not in names: names.append(v)
        L = []; tor = []
        for v in names:
            a, b = f'{s}|{v}|fiat', f'{s}|{v}|bitcoin'
            dc = paired(R, a, b, lambda r: val(r, 'medianRealConsumption'), rel=True)
            du = paired(R, a, b, lambda r: avg(r, 'unemployment', 12))
            dw = paired(R, a, b, lambda r: val(r, 'medianRealWealth'), rel=True)
            dg = paired(R, a, b, lambda r: val(r, 'giniWealth'))
            fc = st([val(r, 'medianRealConsumption') for r in R[a].values()]); bc = st([val(r, 'medianRealConsumption') for r in R[b].values()])
            L.append([v, f"{fc['mean']:.3f}", f"{bc['mean']:.3f}", fmt(dc, 1, True), fmt(du, 2, True), fmt(dw, 1, True), fmt(dg, 3)])
            tor.append((v, dc['mean'] * 100, du['mean'] * 100))
        out += f'\n#### Structure {s}\n\n' + table(['variant', 'fiat median cons.', 'bitcoin median cons.', 'Δ median real cons. (btc−fiat)', 'Δ avg unemployment (pp)', 'Δ median real wealth', 'Δ wealth Gini'], L)
        fig, axs = plt.subplots(1, 2, figsize=(14, 7))
        base_c = [t for t in tor if t[0] == 'base'][0]
        tor_s = sorted(tor, key=lambda t: t[1])
        axs[0].barh([t[0] for t in tor_s], [t[1] for t in tor_s], color=['tab:orange' if t[1] > 0 else 'tab:blue' for t in tor_s])
        axs[0].axvline(base_c[1], color='k', ls='--', lw=0.8); axs[0].axvline(0, color='k', lw=0.8)
        axs[0].set_xlabel('bitcoin − fiat median real consumption, % (yr 20)')
        tor_u = sorted(tor, key=lambda t: t[2])
        axs[1].barh([t[0] for t in tor_u], [t[2] for t in tor_u], color=['tab:blue' if t[2] > 0 else 'tab:orange' for t in tor_u])
        axs[1].axvline(base_c[2], color='k', ls='--', lw=0.8); axs[1].axvline(0, color='k', lw=0.8)
        axs[1].set_xlabel('bitcoin − fiat avg unemployment, pp (yrs 2–20)')
        fig.suptitle(f'E6 sensitivity ({s}); dashed = base case. Orange = favors bitcoin')
        fig.tight_layout(); fig.savefig(os.path.join(CH, f'e6_tornado_{s}.png'), dpi=110); plt.close(fig)
    write('E6', out)

# ---------------- E7 ----------------
def e7():
    R = load('E7_hurdle'); AUDIT['E7'] = audit_ok(R)
    L = []
    for s in ('S0', 'S2'):
        for rn in ('fiat', 'bitcoin'):
            base = f'{s}|hurdleOff|{rn}'
            for v in ('hurdleOff', 'prem0.02', 'prem0.04', 'prem0.06', 'prem0.08'):
                cnd = f'{s}|{v}|{rn}'; rs = list(R[cnd].values())
                L.append([s, rn, v, fmt(st([r['snaps']['239']['firmCapital'] for r in rs]), 0),
                          fmt(paired(R, base, cnd, lambda r: val(r, 'realGdp'), rel=True), 1, True),
                          fmt(paired(R, base, cnd, lambda r: avg(r, 'unemployment', 12)), 2, True),
                          fmt(paired(R, base, cnd, lambda r: val(r, 'medianRealConsumption'), rel=True), 1, True),
                          fmt(st([val(r, 'profitSharingShare') for r in rs]), 2)])
    write('E7', '### E7: investment hurdle (firm installs full capital gap only if prodGrowth + markup/4 > real return on money + premium), year 20\n\n' +
          table(['structure', 'regime', 'hurdle', 'firm capital yr20', 'Δ real GDP vs hurdle off', 'Δ avg unemployment (pp)', 'Δ median real cons.', 'profit-sharing share'], L))

# ---------------- E8 ----------------
def e8():
    R = load('E8_transition'); AUDIT['E8'] = audit_ok(R)
    L = []
    for s in ('S0', 'S2', 'M'):
        base = f'{s}|steady_fiat'
        conds = [base, f'{s}|steady_bitcoin'] + [f'{s}|len{L_}|haircut{h}' for L_ in (1, 12, 60) for h in (0, 0.3)] + [c for c in (f'{s}|len12|haircut0.3|gradual1', f'{s}|len60|haircut0.3|gradual1') if c in R]
        for cnd in conds:
            rs = list(R[cnd].values())
            L.append([cnd, fmt(st([val(r, 'medianRealConsumption') for r in rs]), 3),
                      fmt(paired(R, base, cnd, lambda r: val(r, 'medianRealConsumption'), rel=True), 1, True),
                      fmt(st([avg(r, 'unemployment', 0) for r in rs]), 1, True),
                      fmt(st([max(r['series']['unemployment']) for r in rs]), 1, True),
                      fmt(st([val(r, 'medianRealWealth') for r in rs]), 1), fmt(st([val(r, 'giniWealth') for r in rs]), 3),
                      fmt(st([r['snaps']['119']['skillQuintiles'][0]['realDeposit'] for r in rs]), 1)])
    write('E8', '### E8: transition timing and debt haircut, outcomes at year 10 (tenure choice on; holder concentration 0.5)\n\n' +
          'Note: with gradualWeight 0 a transition of length L runs fiat rules for L months, then rebases in one step. gradual1 rows spread the haircut and deposit reassignment evenly across the window (transition.gradualWeight 1); the regime still flips in one step at the end.\n\n' +
          table(['condition', 'median real cons. yr10', 'Δ vs steady fiat', 'avg unemployment yrs 1-10', 'peak unemployment', 'median real wealth', 'wealth Gini', 'Q1 real deposits'], L))

# ---------------- E9 ----------------
def e9():
    R = load('E9_ai'); AUDIT['E9'] = audit_ok(R)
    L = []
    for cnd in ('AI|fiat', 'AI|bitcoin', 'AI|bitcoin_fiatFriction', 'AIdefault|fiat', 'AIdefault|bitcoin'):
        rs = list(R[cnd].values())
        L.append([cnd, fmt(st([val(r, 'medianRealConsumption') for r in rs]), 3), fmt(st([avg(r, 'unemployment', 12) for r in rs]), 1, True),
                  fmt(st([val(r, 'realGdp') for r in rs]), 0), fmt(st([val(r, 'giniWealth') for r in rs]), 3),
                  fmt(st([val(r, 'medianRealWealth') for r in rs]), 1)])
    write('E9', '### E9: AI on (S0), year 20. AI|* rows use the v1 AI defaults (midpoint 10, steepness 0.4, bullishness 1, physical 0.3, robotics 8/12) for comparability; AIdefault|* use the v3 registry defaults\n\n' +
          table(['condition', 'median real cons.', 'avg unemployment', 'real GDP', 'wealth Gini', 'median real wealth'], L))

def x1():
    R = load('X1_monetary_preset'); AUDIT['X1'] = audit_ok(R)
    L = []
    for c in ('M|hoard0|fiat', 'M|hoard0|bitcoin', 'M|hoard3|fiat', 'M|hoard3|bitcoin', 'M|fiat_target0.0', 'M|fiat_target0.04', 'M|fiat_moneyGrowth0.05', 'M|fiat_moneyGrowth0.05_stim0.05', 'M|fiat_stim0.05', 'M|fiat_stim2', 'M|fiat_rig0.7', 'M|bitcoin_rig0.7', 'M|fiat_premium0.5', 'M|bitcoin_premium0.5', 'M|fiat_nobook', 'M|bitcoin_nobook', 'S0|fiat_moneyGrowth0.05', 'S3|fiat_moneyGrowth0.05'):
        rs = list(R[c].values())
        L.append([c, fmt(st([avg(r, 'inflation', 12) for r in rs]), 2, True),
                  fmt(st([(val(r, 'moneySupply', 239) / val(r, 'moneySupply', 0)) ** (12 / 239) - 1 for r in rs]), 2, True),
                  fmt(st([val(r, 'medianRealConsumption') for r in rs]), 3), fmt(st([avg(r, 'unemployment', 12) for r in rs]), 1, True),
                  fmt(st([val(r, 'realGdp') for r in rs]), 0), fmt(st([val(r, 'medianRealWealth') for r in rs]), 1), fmt(st([val(r, 'giniWealth') for r in rs]), 3)])
    P = []
    for h in (0, 3):
        a, b = f'M|hoard{h}|fiat', f'M|hoard{h}|bitcoin'
        P.append([f'M hoard{h}', fmt(paired(R, a, b, lambda r: val(r, 'medianRealConsumption'), rel=True), 1, True),
                  fmt(paired(R, a, b, lambda r: avg(r, 'unemployment', 12)), 2, True), fmt(paired(R, a, b, lambda r: val(r, 'realGdp'), rel=True), 1, True),
                  fmt(paired(R, a, b, lambda r: val(r, 'medianRealWealth'), rel=True), 1, True), fmt(paired(R, a, b, lambda r: val(r, 'giniWealth')), 3),
                  f"{sign_share(R, a, b, lambda r: val(r, 'medianRealConsumption')):.0%}"])
    txt = '### X1 (new in v2): Barry\'s monetary preset (scenarios/presets/monetary.json) and frozen-fiat-money checks, year 20\n\n'
    txt += table(['condition', 'avg inflation', 'annual broad-money growth', 'median real cons.', 'avg unemployment', 'real GDP', 'median real wealth', 'wealth Gini'], L)
    txt += '\n\nBitcoin minus fiat under the monetary preset (paired):\n\n' + table(['structure', 'Δ median real cons.', 'Δ avg unemployment', 'Δ real GDP', 'Δ median real wealth', 'Δ Gini', 'seeds bitcoin higher'], P)
    write('X1', txt)
    fig, axs = plt.subplots(1, 3, figsize=(18, 4))
    for ax, m in zip(axs, ('medianRealConsumption', 'unemployment', 'moneySupply')):
        for cnd, col in (('M|hoard0|fiat', 'tab:blue'), ('M|hoard0|bitcoin', 'tab:orange'), ('M|fiat_moneyGrowth0.05', 'tab:gray')):
            mm, lo, hi = mean_series(R, cnd, m); x = np.arange(len(mm)) / 12
            ax.plot(x, mm, color=col, label=cnd); ax.fill_between(x, lo, hi, color=col, alpha=0.15)
        ax.set_title(m); ax.set_xlabel('years')
    axs[0].legend(fontsize=8); fig.suptitle('X1: monetary preset, fiat vs bitcoin vs fiat with frozen money')
    fig.tight_layout(); fig.savefig(os.path.join(CH, 'x1_monetary_preset.png'), dpi=110); plt.close(fig)

def x2():
    R = load('X2_fixes'); AUDIT['X2'] = audit_ok(R)
    L = []; P = []
    for sname in ('S1', 'S3', 'M', 'S3all', 'Mall'):
        for h in (0, 3):
            a, b = f'{sname}|hoard{h}|fiat', f'{sname}|hoard{h}|bitcoin'
            if a not in R or b not in R: continue
            P.append([f'{sname} hoard{h}', f"{np.mean([val(r, 'medianRealConsumption') for r in R[a].values()]):.3f}", f"{np.mean([val(r, 'medianRealConsumption') for r in R[b].values()]):.3f}",
                      fmt(paired(R, a, b, lambda r: val(r, 'medianRealConsumption'), rel=True), 1, True),
                      fmt(paired(R, a, b, lambda r: avg(r, 'unemployment', 12)), 2, True), fmt(paired(R, a, b, lambda r: val(r, 'realGdp'), rel=True), 1, True),
                      fmt(paired(R, a, b, lambda r: val(r, 'giniWealth')), 3), f"{sign_share(R, a, b, lambda r: val(r, 'medianRealConsumption')):.0%}"])
    for cnd in R:
        rs = list(R[cnd].values())
        L.append([cnd, fmt(st([avg(r, 'inflation', 12) for r in rs]), 2, True),
                  fmt(st([(val(r, 'moneySupply', 239) / val(r, 'moneySupply', 0)) ** (12 / 239) - 1 for r in rs]), 2, True),
                  f"{np.mean([r['series']['velocity'][-1] for r in rs]):.4f}",
                  fmt(st([val(r, 'medianRealConsumption') for r in rs]), 3), fmt(st([avg(r, 'unemployment', 12) for r in rs]), 1, True),
                  fmt(st([val(r, 'realGdp') for r in rs]), 0), fmt(st([val(r, 'giniWealth') for r in rs]), 3),
                  fmt(st([val(r, 'bottomQuintileWealthShare') for r in rs]), 1, True), fmt(st([val(r, 'topDecileWealthShare') for r in rs]), 1, True),
                  f"{np.mean([r['snaps']['239']['skillQuintiles'][0]['realDeposit'] / r['snaps']['0']['skillQuintiles'][0]['realDeposit'] for r in rs]):.2f}",
                  f"{np.mean([r['snaps']['239']['skillQuintiles'][4]['realDeposit'] / r['snaps']['0']['skillQuintiles'][4]['realDeposit'] for r in rs]):.2f}"])
    txt = "### X2 (new in v3): Barry's opt-in fixes. S3all/Mall = S3/M plus injectionChannel newLoans, spendNewMoney 1, durableShare 0.3, rateTransmission 1, endogenous productivity 1, resolution merge (emergencyFlex removed in v4), householdMortgageShare 0.25. ch=X|spendN = injection channel X with spendNewMoney N. pop-0.01 = population.growth −1%/yr with the named bequest rule. Year 20\n\n"
    txt += 'Bitcoin minus fiat (paired):\n\n' + table(['structure', 'fiat median cons.', 'bitcoin median cons.', 'Δ median real cons.', 'Δ avg unemployment', 'Δ real GDP', 'Δ Gini', 'seeds bitcoin higher'], P)
    txt += '\n\nLevels:\n\n' + table(['condition', 'avg inflation', 'broad money growth', 'velocity yr20 (/month)', 'median real cons.', 'avg unemployment', 'real GDP', 'wealth Gini', 'bottom-20% share', 'top-10% share', 'Q1 real deposits yr20/yr0', 'Q5 real deposits yr20/yr0'], L)
    write('X2', txt)
    fig, axs = plt.subplots(1, 3, figsize=(18, 4))
    for ax, m in zip(axs, ('medianRealConsumption', 'unemployment', 'inflation')):
        for cnd, col, ls in (('S3|hoard0|fiat', 'tab:blue', '-'), ('S3|hoard0|bitcoin', 'tab:orange', '-'), ('S3all|hoard0|fiat', 'tab:blue', '--'), ('S3all|hoard0|bitcoin', 'tab:orange', '--'),
                             ('Mall|hoard0|fiat', 'tab:green', ':'), ('Mall|hoard0|bitcoin', 'tab:red', ':')):
            if cnd not in R: continue
            mm, lo, hi = mean_series(R, cnd, m); x = np.arange(len(mm)) / 12
            ax.plot(x, mm, color=col, ls=ls, label=cnd)
        ax.set_title(m); ax.set_xlabel('years')
    axs[0].legend(fontsize=7); fig.suptitle('X2: S3 and preset with all of the v3 opt-in fixes (dashed/dotted) vs S3 defaults (solid)')
    fig.tight_layout(); fig.savefig(os.path.join(CH, 'x2_all_fixes.png'), dpi=110); plt.close(fig)

if __name__ == '__main__':
    import sys
    todo = sys.argv[1:] or ['e1', 'e1b', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'x1', 'x2']
    for t in todo:
        try:
            globals()[t](); print('ok', t)
        except FileNotFoundError as ex:
            print('missing data for', t, ex)
    print('audit identity held in every run:', AUDIT)
    print('crashed runs:', ERRORS)
    print('ratio pairs skipped (fiat median cons = 0):', {c: ZERO_SKIPS.count(c) for c in set(ZERO_SKIPS)})
    json.dump({'audit': AUDIT, 'errors': ERRORS, 'zero_consumption_ratio_skips': {c: ZERO_SKIPS.count(c) for c in set(ZERO_SKIPS)}}, open(os.path.join(RES, 'run_health.json'), 'w'), indent=1)
