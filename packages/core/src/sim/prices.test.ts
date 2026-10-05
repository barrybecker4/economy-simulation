import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from './simulate.js';

const matched = {
  'goods.electronicsProductivity': 0.01,
  'goods.foodProductivity': 0.01,
  'goods.energyProductivity': 0.01,
  'goods.apparelProductivity': 0.01,
  'goods.transportProductivity': 0.01,
  'goods.medicalProductivity': 0.01,
  'goods.educationProductivity': 0.01,
  'goods.recreationProductivity': 0.01,
  'goods.housingSupplyGrowth': 0.01,
  'shock.frequency': 0,
};

describe('relative prices', () => {
  it('keeps every category on the CPI when productivity and supply match', () => {
    const result = run(matched);
    expect(result.audit.ok).toBe(true);
    const cpi = series(result, 'priceLevel');
    const last = cpi.length - 1;
    const ids = [
      'priceGeneral',
      'priceFood',
      'priceHousing',
      'priceEnergy',
      'priceApparel',
      'priceTransportation',
      'priceMedical',
      'priceEducation',
      'priceRecreation',
      'priceElectronics',
    ] as const;
    for (const id of ids) {
      const values = series(result, id);
      expect(close(values[last] ?? 0, cpi[last] ?? 0)).toBe(true);
    }
  });

  it('makes electronics cheaper when their productivity rises, and housing dearer when supply is tighter', () => {
    const slow = run({ 'goods.electronicsProductivity': 0.02, 'shock.frequency': 0 });
    const fast = run({ 'goods.electronicsProductivity': 0.2, 'shock.frequency': 0 });
    expect(relative(fast, 'priceElectronics', 'priceGeneral')).toBeLessThan(
      relative(slow, 'priceElectronics', 'priceGeneral'),
    );
    const loose = run({ 'goods.housingSupplyGrowth': 0.02, 'shock.frequency': 0 });
    const tight = run({ 'goods.housingSupplyGrowth': -0.01, 'shock.frequency': 0 });
    expect(relative(tight, 'priceHousing', 'priceLevel')).toBeGreaterThan(
      relative(loose, 'priceHousing', 'priceLevel'),
    );
    expect(fast.audit.ok && tight.audit.ok).toBe(true);
  });

  it('holds the CPI near target while electronics and housing move apart', () => {
    const result = run({ 'shock.frequency': 0 });
    const inflation = series(result, 'inflation');
    const late = inflation.slice(24);
    expect(Math.max(...late.map((value) => Math.abs(value - 0.02)))).toBeLessThanOrEqual(0.02);
    expect(relative(result, 'priceElectronics', 'priceGeneral')).toBeLessThan(0.9);
    expect(relative(result, 'priceHousing', 'priceLevel')).toBeGreaterThan(1.05);
    expect(relative(result, 'priceMedical', 'priceFood')).toBeGreaterThan(1);
    expect(relative(result, 'priceApparel', 'priceFood')).toBeLessThan(1);
    const security = series(result, 'housingSecurity');
    expect(security[security.length - 1] ?? 1).toBeLessThan(security[0] ?? 0);
  });
});

function run(sliders: Record<string, number>): SimulationResult {
  return simulate(
    loadScenario({
      name: 'prices',
      seed: 3,
      ticks: 120,
      sliders: {
        'scale.households': 80,
        'scale.firms': 8,
        'scale.banks': 1,
        'ai.roboticsStartYear': 50,
        ...sliders,
      },
    }),
  );
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function relative(result: SimulationResult, left: MetricId, right: MetricId): number {
  const a = series(result, left);
  const b = series(result, right);
  const lastA = a[a.length - 1] ?? 0;
  const lastB = b[b.length - 1] ?? 1;
  return lastA / lastB;
}

function close(left: number, right: number): boolean {
  return Math.abs(left - right) <= Math.max(1e-6, Math.abs(right) * 1e-6);
}
