import { describe, it, expect } from 'vitest';
import { simulate } from './simulate.js';
import { loadScenario } from '../config/load.js';

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function series(result: any, id: string): number[] {
  return (result.metrics.series[id] || []).filter((v: number | null) => v !== null);
}

/**
 * Regression test for issue #8: money velocity calibration.
 * 
 * Ensures annualized velocity (×12) is within or clearly near the real-world
 * range of 1.1-2.2/yr for US M2V.
 */
describe('velocity regression (issue #8)', () => {
  const TARGET_MIN = 1.1;
  const TARGET_MAX = 2.2;
  const TOLERANCE = 0.15; // Allow 15% below target minimum

  it('achieves realistic velocity for standard fiat scenario', () => {
    const result = simulate(
      loadScenario({
        name: 'standard',
        seed: 1,
        ticks: 240,
        sliders: {
          'regime.type': 'fiat',
          'shock.frequency': 0,
          'scale.households': 500,
          'scale.firms': 50,
          'scale.banks': 3,
          'ai.automatableShareStart': 0.3,
          'ai.automatableShareEnd': 0.3,
        },
      })
    );

    expect(result.audit.ok).toBe(true);

    const vels = series(result, 'velocity');
    const last12 = vels.slice(-12);
    const monthly = mean(last12);
    const annualized = monthly * 12;

    console.log(`Standard fiat annualized velocity: ${annualized.toFixed(2)}/yr`);

    // Should be in or clearly near the target range
    expect(annualized).toBeGreaterThanOrEqual(TARGET_MIN * (1 - TOLERANCE));
    expect(annualized).toBeLessThanOrEqual(TARGET_MAX * 1.2);
  });

  it('achieves realistic velocity for monetary preset', () => {
    const result = simulate(
      loadScenario({
        name: 'monetary',
        seed: 1,
        ticks: 240,
        sliders: {
          'regime.type': 'fiat',
          'shock.frequency': 0,
          'scale.households': 500,
          'scale.firms': 50,
          'scale.banks': 3,
          'ai.automatableShareStart': 0.3,
          'ai.automatableShareEnd': 0.3,
        },
      })
    );

    expect(result.audit.ok).toBe(true);

    const vels = series(result, 'velocity');
    const last12 = vels.slice(-12);
    const monthly = mean(last12);
    const annualized = monthly * 12;

    console.log(`Monetary preset annualized velocity: ${annualized.toFixed(2)}/yr`);

    expect(annualized).toBeGreaterThanOrEqual(TARGET_MIN * (1 - TOLERANCE));
    expect(annualized).toBeLessThanOrEqual(TARGET_MAX * 1.2);
  });

  it('bitcoin velocity differs but is reported', () => {
    const result = simulate(
      loadScenario({
        name: 'standard',
        seed: 1,
        ticks: 240,
        sliders: {
          'regime.type': 'bitcoin',
          'shock.frequency': 0,
          'scale.households': 500,
          'scale.firms': 50,
          'scale.banks': 3,
          'ai.automatableShareStart': 0.3,
          'ai.automatableShareEnd': 0.3,
        },
      })
    );

    expect(result.audit.ok).toBe(true);

    const vels = series(result, 'velocity');
    const last12 = vels.slice(-12);
    const monthly = mean(last12);
    const annualized = monthly * 12;

    console.log(`Bitcoin annualized velocity: ${annualized.toFixed(2)}/yr`);
    
    // Bitcoin may legitimately differ due to deflation dynamics
    // Just verify it's positive and reasonable
    expect(annualized).toBeGreaterThan(0.3);
    expect(annualized).toBeLessThan(5.0);
  });
});
