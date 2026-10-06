import { describe, expect, it } from 'vitest';
import { loadScenario } from '../config/load.js';
import { createEconomy } from './init.js';
import { loadParameters } from './parameters.js';
import { onTransition } from './transition.js';

describe('fiat to bitcoin transition', () => {
  it('reassigns deposits without creating or destroying the positive total', () => {
    const economy = createEconomy(
      loadParameters(
        loadScenario({
          name: 'transition-deposits',
          seed: 1,
          ticks: 1,
          sliders: {
            'scale.households': 20,
            'scale.firms': 4,
            'scale.banks': 1,
            'transition.lengthMonths': 1,
            'transition.debtHaircut': 0,
            'transition.holderConcentration': 0.99,
          },
        }),
      ),
      1,
      null,
    );
    const before = economy.households.reduce(
      (sum, household) => sum + Math.max(0, household.deposit),
      0,
    );
    onTransition(economy);
    const after = economy.households.reduce((sum, household) => sum + household.deposit, 0);
    expect(after).toBe(before);
    expect(economy.params.regime).toBe('bitcoin');
  });
});
