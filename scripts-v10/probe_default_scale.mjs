// R7 check: M preset at the new default scale (4000/200/4) vs suite scale (500/50/3). shock freq 0, 240 ticks. args: regime seed scale
import fs from 'node:fs';
const LIB = '../repo-v10/packages/core/dist';
const { loadScenario, runSimulation } = await import(`${LIB}/index.js`);
const { World } = await import(`${LIB}/sim/world.js`);
const { totalDeposits } = await import(`${LIB}/sim/banking.js`);
const MON = JSON.parse(fs.readFileSync('../repo-v10/scenarios/presets/monetary.json')).sliders;
const [regime, seed, scale] = [process.argv[2], Number(process.argv[3]), process.argv[4]];
const sl = { ...MON, 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3, 'shock.frequency': 0, 'regime.type': regime };
if (scale === 'suite') Object.assign(sl, { 'scale.households': 500, 'scale.firms': 50, 'scale.banks': 3 });
const t0 = Date.now();
try {
  const config = loadScenario({ name: 'scale', seed, ticks: 240, sliders: sl });
  const w = new World(config); const e = w.economy; const h = w.handlers();
  let D0 = null, D = null; const wf = h.welfare;
  h.welfare = (ctx) => { wf(ctx); D = totalDeposits(e); if (D0 === null) D0 = D; };
  const res = runSimulation(config, h);
  const s = res.metrics.series; const N = s.unemployment.length;
  const avg = (a, i0, i1) => a.slice(i0, i1).reduce((x, y) => x + y, 0) / (i1 - i0);
  console.log(JSON.stringify({ regime, seed, scale, households: e.households.length, banks: e.banks.length, u: avg(s.unemployment, 24, N), infl: avg(s.inflation, 24, N), money: D / D0, failures: e.cumulativeFailures, cons: s.medianRealConsumption[N - 1], secs: (Date.now() - t0) / 1000 }));
} catch (e) { console.log(JSON.stringify({ regime, seed, scale, error: String(e.message).slice(0, 200) })); }
