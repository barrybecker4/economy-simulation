import { loadScenario } from './packages/core/dist/config/load.js';
import { simulate } from './packages/core/dist/sim/simulate.js';

const result = simulate(
  loadScenario({
    name: 'test-hazard',
    seed: 1,
    ticks: 30,
    sliders: {},
  }),
);

console.log('\nFirm equity and failures by month:');
for (let t = 10; t < 30; t++) {
  const snap = result.history[t];
  if (!snap) continue;
  
  const negCount = snap.firms.filter((f) => {
    const equity = f.deposit + f.capital * f.price - f.loan;
    return equity < 0;
  }).length;
  
  const realGdp = result.metrics.series.realGdp[t] || 0;
  const prevGdp = result.metrics.series.realGdp[t - 1] || 1;
  const drop = prevGdp > 0 ? ((prevGdp - realGdp) / prevGdp) * 100 : 0;
  
  console.log(
    `Month ${t}: ${negCount} neg equity firms, GDP drop: ${drop.toFixed(1)}%`,
  );
}

const maxDrop = Math.max(
  ...result.metrics.series.realGdp
    .slice(1)
    .map((curr, i) => {
      const prev = result.metrics.series.realGdp[i] || 1;
      return prev > 0 ? (prev - curr) / prev : 0;
    }),
);

console.log(`\nMax 1-month GDP drop: ${(maxDrop * 100).toFixed(1)}%`);
