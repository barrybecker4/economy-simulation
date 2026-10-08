import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import type { MetricId } from '../metrics/metrics.js';
import type { SimulationResult } from '../engine/engine.js';
import { simulate } from '../sim/simulate.js';

const scale = {
  'scale.households': 40,
  'scale.firms': 4,
  'scale.banks': 1,
  'shock.frequency': 0,
};

describe('probe', () => {
  it('prints claim diagnostics', () => {
    const quiet = run({
      ...scale,
      'regime.type': 'bitcoin',
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
    });
    const fast = run({
      ...scale,
      'regime.type': 'bitcoin',
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'wage.nominalRigidity': 0.9,
    });
    const fastLong = run(
      {
        ...scale,
        'regime.type': 'bitcoin',
        'ai.adoptionMidpointYear': 3,
        'ai.adoptionSteepness': 1.2,
        'wage.nominalRigidity': 0.9,
        'ai.bullishness': 1,
        'ai.physicalTaskShare': 0.1,
      },
      120,
    );
    const quietLong = run(
      {
        ...scale,
        'regime.type': 'bitcoin',
        'ai.automatableShareStart': 0.3,
        'ai.automatableShareEnd': 0.3,
        'ai.bullishness': 1,
        'ai.physicalTaskShare': 0.1,
      },
      120,
    );
    const shocks = { ...scale, 'shock.frequency': 1, 'shock.size': 0.1 };
    const fiat = run({ ...shocks, 'regime.type': 'fiat' });
    const bitcoin = run({ ...shocks, 'regime.type': 'bitcoin' });
    const fiatLed = run({
      ...shocks,
      'regime.type': 'fiat',
      'production.demandWeight': 1,
    });
    const bitcoinLed = run({
      ...shocks,
      'regime.type': 'bitcoin',
      'production.demandWeight': 1,
    });
    const matched = run({
      ...scale,
      'regime.type': 'bitcoin',
      'shock.frequency': 1,
      'bitcoin.lendingModel': 'maturityMatched',
    });
    const full = run({
      ...scale,
      'regime.type': 'bitcoin',
      'shock.frequency': 1,
      'bitcoin.lendingModel': 'fullReserve',
    });
    console.log(
      JSON.stringify(
        {
          h1: {
            quiet: last(quiet, 'priceLevel'),
            fast: last(fast, 'priceLevel'),
            quietAi: last(quiet, 'aiShareOfOutput'),
            fastAi: last(fast, 'aiShareOfOutput'),
            quietLong: last(quietLong, 'priceLevel'),
            fastLong: last(fastLong, 'priceLevel'),
            quietLongAi: last(quietLong, 'aiShareOfOutput'),
            fastLongAi: last(fastLong, 'aiShareOfOutput'),
          },
          h2: {
            fiat: last(fiat, 'realGdp'),
            bitcoin: last(bitcoin, 'realGdp'),
            demand: series(fiat, 'demandImpulse').filter((value) => value !== 0).length,
            credit: series(fiat, 'creditImpulse').filter((value) => value !== 0).length,
            productivity: series(fiat, 'productivityImpulse').filter((value) => value !== 0).length,
            fiatLed: last(fiatLed, 'realGdp'),
            bitcoinLed: last(bitcoinLed, 'realGdp'),
            seriesEqual: series(fiat, 'realGdp').every(
              (value, index) => value === series(bitcoin, 'realGdp')[index],
            ),
          },
          h5: {
            matchedRatio: last(matched, 'loanToSavings'),
            fullRatio: last(full, 'loanToSavings'),
            matchedCredit: last(matched, 'creditToGdp'),
            fullCredit: last(full, 'creditToGdp'),
          },
        },
        null,
        2,
      ),
    );
    expect(true).toBe(true);
  });
});

function run(sliders: Record<string, number | string>, ticks = 36): SimulationResult {
  return simulate(loadScenario({ name: 'probe', seed: 4, ticks, sliders }));
}

function series(result: SimulationResult, id: MetricId): number[] {
  return result.metrics.series[id].flatMap((value) => (value === null ? [] : [value]));
}

function last(result: SimulationResult, id: MetricId): number {
  return series(result, id).at(-1) ?? 0;
}
