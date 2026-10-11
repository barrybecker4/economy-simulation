import { loadScenario } from './packages/core/src/config/load.js';
import { simulate } from './packages/core/src/sim/simulate.js';

console.log('Starting simulation...');
const result = simulate(
  loadScenario({
    name: 'test',
    seed: 1,
    ticks: 3,
    sliders: {},
  }),
);
console.log('Done. Max GDP drop:', result.metrics.series.realGdp[0]);
