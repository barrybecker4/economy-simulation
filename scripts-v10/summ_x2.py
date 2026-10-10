import json
d=json.load(open('data-v10/review/x2_transition.json'))['results']
order=['all','debtor=debtor','debtor=saver','tenure=renter','tenure=mortgagor','tenure=outright','emp=employed','emp=unemployed','skill=Q1','skill=Q2','skill=Q3','skill=Q4','skill=Q5']
lines=[]
for st,arms in d.items():
    lines.append(f"\n### {st} (stayFiat crashes: {arms.get('_stayFiatCrashes')})\n")
    for arm,v in arms.items():
        if arm.startswith('_'): continue
        lines.append(f"\n**{arm}** — n seeds {v['nSeeds']}, crashes {v['crashes']}, Δinflation m13–120 {v['dInfl_m13_120']*100:+.1f} pp (switch arm {v['inflSwitch']*100:+.1f}%), Δu {v['dU_m13_120']*100:+.1f} pp\n")
        lines.append("| group | n (HH×seeds) | ΔrealNW m120 % | ΔrealNW/HH m120 | stay NW/HH | Δcons m60 % | Δcons m120 % | Δunemp-months/HH | Δforeclosures/100HH |")
        lines.append("|---|---|---|---|---|---|---|---|---|")
        for g in order:
            r=v['groups'].get(g)
            if not r: continue
            lines.append(f"| {g} | {r['n']} | {r['dNW120_pct']:+.1f} | {r['dNW120_perHH']:+.2f} | {r['stayNW120_perHH']:.2f} | {r['dC60_pct']:+.1f} | {r['dC120_pct']:+.1f} | {r['dUnempMonths_perHH']:+.2f} | {r['dForeclosures_per100HH']:+.1f} |")
open('results-v10/X2_transition_cost.md','w').write("# X2: who bears the transition cost (switch at month 12 vs stay fiat, same seed; groups fixed at month 10; real NW = (deposits+btc−debt)/P)\n"+"\n".join(lines)+"\n")
print("\n".join(lines))
