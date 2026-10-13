import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';
import { FEATURE_OFF } from './feature-off.js';

const small = {
  ...FEATURE_OFF,
  'scale.households': 60,
  'scale.firms': 6,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('job-stayer wage cut measurement', () => {
  it('tracks individual job-stayer wage cuts in S0 bitcoin', () => {
    const result = simulate(
      loadScenario({
        name: 'job-stayer-test',
        seed: 7,
        ticks: 240,
        sliders: {
          ...small,
          'regime.type': 'bitcoin',
          'ai.automatableShareStart': 0.3,
          'ai.automatableShareEnd': 0.3,
        },
      }),
    );
    expect(result.audit.ok).toBe(true);

    // Calculate average job-stayer cut rate after month 24
    const cutShareSeries = series(result, 'jobStayerCutShare');
    const stayerCountSeries = series(result, 'jobStayerCount');
    
    let totalCutShare = 0;
    let months = 0;
    
    for (let t = 24; t < cutShareSeries.length; t++) {
      const share = cutShareSeries[t];
      const count = stayerCountSeries[t];
      if (share !== undefined && count !== undefined && count > 0) {
        totalCutShare += share;
        months++;
      }
    }
    
    const avgCutShare = months > 0 ? totalCutShare / months : 0;
    
    console.log(`\nS0 Bitcoin Job-Stayer Stats (months 24-240):`);
    console.log(`Average job-stayer cut share: ${(avgCutShare * 100).toFixed(2)}%`);
    console.log(`Target: < 5% normally, < 12% in deep recessions`);
    
    // The target from the issue is about 2% normally, up to 10-12% in deep recessions
    // In S0 bitcoin with mild deflation, we should see cuts but they should be rare
    expect(avgCutShare).toBeLessThan(0.10); // Less than 10%
  });

  it('tracks individual job-stayer wage cuts in M bitcoin', () => {
    const result = simulate(
      loadScenario({
        name: 'job-stayer-test-m',
        seed: 7,
        ticks: 240,
        sliders: {
          ...small,
          'regime.type': 'bitcoin',
          'ai.automatableShareStart': 0.1,
          'ai.automatableShareEnd': 0.9,
          'ai.adoptionMidpointYear': 8,
        },
      }),
    );
    expect(result.audit.ok).toBe(true);

    // Calculate average job-stayer cut rate after month 24
    const cutShareSeries = series(result, 'jobStayerCutShare');
    const stayerCountSeries = series(result, 'jobStayerCount');
    
    let totalCutShare = 0;
    let months = 0;
    
    for (let t = 24; t < cutShareSeries.length; t++) {
      const share = cutShareSeries[t];
      const count = stayerCountSeries[t];
      if (share !== undefined && count !== undefined && count > 0) {
        totalCutShare += share;
        months++;
      }
    }
    
    const avgCutShare = months > 0 ? totalCutShare / months : 0;
    
    console.log(`\nM Bitcoin Job-Stayer Stats (months 24-240):`);
    console.log(`Average job-stayer cut share: ${(avgCutShare * 100).toFixed(2)}%`);
    console.log(`Target: < 15% outside deep-recession years`);
    
    // In M bitcoin with faster AI adoption and more deflation, cuts can be higher
    // but should still be well below the aggregate measure
    expect(avgCutShare).toBeLessThan(0.20); // Less than 20%
  });

  it('shows minimal cuts in fiat', () => {
    const result = simulate(
      loadScenario({
        name: 'job-stayer-test-fiat',
        seed: 7,
        ticks: 240,
        sliders: {
          ...small,
          'regime.type': 'fiat',
          'ai.automatableShareStart': 0.3,
          'ai.automatableShareEnd': 0.3,
        },
      }),
    );
    expect(result.audit.ok).toBe(true);

    // Calculate average job-stayer cut rate after month 24
    const cutShareSeries = series(result, 'jobStayerCutShare');
    const stayerCountSeries = series(result, 'jobStayerCount');
    
    let totalCutShare = 0;
    let months = 0;
    
    for (let t = 24; t < cutShareSeries.length; t++) {
      const share = cutShareSeries[t];
      const count = stayerCountSeries[t];
      if (share !== undefined && count !== undefined && count > 0) {
        totalCutShare += share;
        months++;
      }
    }
    
    const avgCutShare = months > 0 ? totalCutShare / months : 0;
    
    console.log(`\nFiat Job-Stayer Stats (months 24-240):`);
    console.log(`Average job-stayer cut share: ${(avgCutShare * 100).toFixed(2)}%`);
    console.log(`Target: ~2% normally (real-world with inflation)`);
    
    // In fiat with inflation, cuts should be very rare
    expect(avgCutShare).toBeLessThan(0.05); // Less than 5%
  });
});

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}
