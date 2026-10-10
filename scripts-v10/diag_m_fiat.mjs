// Which v7 default change moves M fiat? One-at-a-time revert of each changed default (seed 1-2, shock 0).
import fs from 'node:fs';
const LIB = '../repo-v10/packages/core/dist';
const { loadScenario } = await import(`${LIB}/config/load.js`);
const { simulate } = await import(`${LIB}/sim/simulate.js`);
const { FEATURE_OFF } = await import(`${LIB}/sim/feature-off.js`);
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const NOAI = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0 };
const regime = process.argv[2] ?? 'fiat';
const seeds = [1, 2];
const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
function go(label, extra) {
  const o = seeds.map((seed) => { const r = simulate(loadScenario({ name: 'd', seed, ticks: 240, sliders: { ...NOAI, ...MON, 'regime.type': regime, ...extra } }), null).metrics.series;
    return [m(r.unemployment.slice(24)), m(r.inflation.slice(24)), r.moneySupply[239] / r.moneySupply[0], r.bankFailures[239], r.medianRealConsumption[239]]; });
  const a = o[0].map((_, i) => m(o.map((x) => x[i])));
  console.log(`${label.padEnd(42)} u ${(a[0]*100).toFixed(1)}  cpi ${(a[1]*100).toFixed(2)}  money ${a[2].toFixed(2)}  fail ${a[3].toFixed(1)}  cons ${a[4].toFixed(3)}`);
}
go('v7 defaults', {});
const legacyNoMon = Object.fromEntries(Object.entries(FEATURE_OFF).filter(([k]) => !(k in MON)));
go('all v6 defaults (except preset keys)', legacyNoMon);
for (const [k, v] of Object.entries(legacyNoMon)) go(`revert ${k}=${v}`, { [k]: v });
