export interface Preset {
  id: string;
  name: string;
  detail: string;
  regime: string;
  overrides: Record<string, number>;
}

export const PRESETS: readonly Preset[] = [
  {
    id: 'neutral',
    name: 'Neutral',
    regime: 'fiat',
    overrides: {},
    detail:
      'Fiat, and every parameter at its default. The automatable share still rises from 10 percent to 90 percent. Government spending and the income tax are both 20 percent of the income base, so the treasury starts near balance. The bank capital ratio is 8 percent, and deflation sensitivity is 1.',
  },
  {
    id: 'no-ai',
    name: 'No AI',
    regime: 'fiat',
    overrides: { 'ai.automatableShareStart': 0.3, 'ai.automatableShareEnd': 0.3 },
    detail:
      'Fiat. The initial and final automatable shares are both 30 percent, instead of 10 percent rising to 90 percent. Equal shares freeze the adoption curve: firms do not take up AI in production, and hiring and ownership stay on the path with no AI productivity effect. The midpoint year and the steepness do nothing while the shares are equal. Autonomous agents are unchanged, so their count still rises from zero to half the number of households over five years.',
  },
  {
    id: 'fast-adoption',
    name: 'Fast adoption',
    regime: 'fiat',
    overrides: {
      'ai.adoptionMidpointYear': 5,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.1,
    },
    detail:
      'Fiat. The adoption midpoint moves from year 15 to year 5, and steepness rises from 0.4 to 1.2 per year, so the climb from a 10 percent automatable share to 90 percent happens earlier and in a tighter window. The physical-task share falls from 30 percent to 10 percent. Extra capacity is the gain in the automatable share times one minus that share, so more of the same gain becomes output. Agents, spending, and the regime stay at their defaults.',
  },
  {
    id: 'austrian-leaning',
    name: 'Austrian-leaning',
    regime: 'bitcoin',
    overrides: {
      'bank.capitalRatio': 0.16,
      'government.spendingShareOfGDP': 0.1,
      'deflation.sensitivity': 2,
    },
    detail:
      'Switches the regime to bitcoin. Bitcoin does not grow the money stock with the economy, so the price trend is minus baseline productivity growth, and new loans cannot exceed unused savings. The bank capital ratio rises from 8 percent to 16 percent, which leaves less room to lend from the same equity. Government spending falls from 20 percent to 10 percent of the income base, while the income tax stays at 20 percent, so the treasury takes in more than it spends. Deflation sensitivity rises from 1 to 2. Under bitcoin, prices tend to fall, and that higher sensitivity cuts credit and housing demand more strongly until the penalty reaches its cap of 0.9. Wage rigidity, time preference, and trust in banks stay at their defaults.',
  },
  {
    id: 'keynesian-leaning',
    name: 'Keynesian-leaning',
    regime: 'fiat',
    overrides: {
      'government.spendingShareOfGDP': 0.35,
      'centralBank.inflationWeight': 2.5,
      'centralBank.outputWeight': 1.2,
    },
    detail:
      'Stays on fiat. Government spending rises from 20 percent to 35 percent of the income base. Household spending starts from what remains, so that share starts at 65 percent instead of 80 percent. The income tax stays at 20 percent, and the treasury issues bonds for the shortfall. The inflation weight rises from 1.5 to 2.5, and the output weight rises from 0.5 to 1.2. Those weights apply only under fiat: the policy rate reacts harder when inflation misses its target and when unemployment is away from the natural rate. The bank capital ratio stays at 8 percent.',
  },
];

export function presetById(id: string): Preset {
  const preset = PRESETS.find((item) => item.id === id);
  if (preset === undefined) {
    throw new Error(`Unknown preset ${id}`);
  }
  return preset;
}

export function matchingPreset(
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): string | null {
  const match = PRESETS.find((preset) => sameSettings(preset, regime, overrides));
  return match === undefined ? null : match.id;
}

function sameSettings(
  preset: Preset,
  regime: string,
  overrides: Readonly<Record<string, number | string>>,
): boolean {
  if (preset.regime !== regime) {
    return false;
  }
  const keys = Object.keys(overrides);
  const expected = Object.keys(preset.overrides);
  if (keys.length !== expected.length) {
    return false;
  }
  return expected.every((id) => overrides[id] === preset.overrides[id]);
}
