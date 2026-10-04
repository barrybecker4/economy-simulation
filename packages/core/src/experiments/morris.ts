import { loadScenario } from '../config/load.js';
import { getSlider } from '../config/registry.js';
import { simulate } from '../sim/simulate.js';

export interface MorrisEffect {
  id: string;
  effect: number;
}

/** One-at-a-time elementary effects on end-of-run real GDP. */
export function morrisScreen(ids: readonly string[], seed: number, ticks: number): MorrisEffect[] {
  const base = endGdp(seed, ticks, {});
  const effects = ids.map((id) => {
    const slider = getSlider(id);
    if (!slider || slider.kind !== 'number') {
      return { id, effect: 0 };
    }
    const high = endGdp(seed, ticks, { [id]: slider.max });
    const span = slider.max - slider.min;
    return { id, effect: span === 0 ? 0 : (high - base) / span };
  });
  return effects.sort((left, right) => Math.abs(right.effect) - Math.abs(left.effect));
}

function endGdp(seed: number, ticks: number, sliders: Record<string, number>): number {
  const result = simulate(
    loadScenario({
      name: 'morris',
      seed,
      ticks,
      sliders: {
        'shock.frequency': 0,
        'scale.households': 40,
        'scale.firms': 4,
        'scale.banks': 1,
        ...sliders,
      },
    }),
  );
  const values = result.metrics.series.realGdp;
  return values[values.length - 1] ?? 0;
}
