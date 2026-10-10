// Which v7 default changes move the M bitcoin-minus-fiat gap? Base = v7 defaults + M preset + choiceSpeed 0
// (like-for-like). One-at-a-time revert of each changed default to its v6 (FEATURE_OFF) value. Seeds 1-4, shock 0, 240 months.
import fs from 'node:fs';
const LIB = '../repo-v10/packages/core/dist';
const { loadScenario } = await import(`${LIB}/config/load.js`);
const { simulate } = await import(`${LIB}/sim/simulate.js`);
const { FEATURE_OFF } = await import(`${LIB}/sim/feature-off.js`);
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const S = process.argv[2] ?? 'M';
const STR = S === 'M' ? MON : { 'prices.trendWeight': 1, 'production.demandWeight': 0, 'labor.firmLevelHiring': 'off' };
const BASE = { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3, 'shock.frequency': 0, ...STR, 'money.choiceSpeed': 0 };
const seeds = [1, 2, 3, 4];
const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const out = {};
function one(regime, extra, seed) { const r = simulate(loadScenario({ name: 'd', seed, ticks: 240, sliders: { ...BASE, 'regime.type': regime, ...extra } }), null).metrics.series;
  return { u: m(r.unemployment.slice(24)), c: r.medianRealConsumption[239], infl: m(r.inflation.slice(24)), fail: r.bankFailures[239] }; }
function go(label, extra) {
  const f = seeds.map((s) => one('fiat', extra, s)), b = seeds.map((s) => one('bitcoin', extra, s));
  const dc = m(seeds.map((_, i) => b[i].c / f[i].c - 1)), du = m(seeds.map((_, i) => b[i].u - f[i].u));
  out[label] = { dcons: dc, du, uF: m(f.map((x) => x.u)), uB: m(b.map((x) => x.u)), inflF: m(f.map((x) => x.infl)), inflB: m(b.map((x) => x.infl)), failF: m(f.map((x) => x.fail)), failB: m(b.map((x) => x.fail)) };
  const o = out[label];
  process.stderr.write(`${label.padEnd(44)} dcons ${(dc*100).toFixed(1).padStart(6)} du ${(du*100).toFixed(2).padStart(6)}  uF ${(o.uF*100).toFixed(1)} uB ${(o.uB*100).toFixed(1)} inflF ${(o.inflF*100).toFixed(1)} inflB ${(o.inflB*100).toFixed(1)} failF ${o.failF.toFixed(1)} failB ${o.failB.toFixed(1)}\n`);
}
go('v7 defaults, choiceSpeed 0', {});
const leg = Object.fromEntries(Object.entries(FEATURE_OFF).filter(([k]) => !(k in STR) && k !== 'money.choiceSpeed'));
go('all v6 defaults (FEATURE_OFF, preset kept)', leg);
for (const [k, v] of Object.entries(leg)) go(`revert ${k}=${v}`, { [k]: v });
console.log(JSON.stringify(out));
