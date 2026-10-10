import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyCategoryOption,
  applyScenarioWorld,
  composeCategoryOptions,
  composeScenario,
  matchingCategoryOption,
  matchingScenarioWorld,
  optionById,
  PRESET_CATEGORIES,
  SCENARIO_COMPOSITIONS,
  SCENARIO_WORLDS,
} from './presets.js';
import { assertSliderValue, getSlider } from './registry.js';

describe('preset categories', () => {
  it('keeps every option value inside the slider registry', () => {
    for (const category of PRESET_CATEGORIES) {
      for (const option of category.options) {
        for (const [id, value] of Object.entries(option.values)) {
          assertSliderValue(id, value);
        }
      }
    }
  });

  it('gives each slider to at most one category', () => {
    const seen = new Set<string>();
    for (const category of PRESET_CATEGORIES) {
      for (const id of category.owned) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });

  it('has exactly one all-default option per category', () => {
    for (const category of PRESET_CATEGORIES) {
      const defaults = category.options.filter((option) =>
        category.owned.every((id) => String(option.values[id]) === String(getSlider(id).default)),
      );
      expect(defaults).toHaveLength(1);
    }
  });

  it('applies one category without clearing the others', () => {
    const base = applyCategoryOption('credit', 'tight', {});
    expect(base['bank.capitalRatio']).toBe(0.16);
    expect(base['bitcoin.lendingModel']).toBe('fullReserve');
    expect(base['deflation.sensitivity']).toBe(2);

    const next = applyCategoryOption('aiBullishness', 'high', base);
    expect(next['bank.capitalRatio']).toBe(0.16);
    expect(next['ai.bullishness']).toBe(1.5);
    expect(next['ai.adoptionMidpointYear']).toBe(3);
    expect(next['ai.adoptionSteepness']).toBe(1.2);
    expect(matchingCategoryOption('credit', next)).toBe('tight');
    expect(matchingCategoryOption('aiBullishness', next)).toBe('high');
  });

  it('omits registry defaults from the override map', () => {
    const overrides = applyCategoryOption('aiBullishness', 'modest', {
      'firm.markup': 0.4,
    });
    expect(overrides).toEqual({ 'firm.markup': 0.4 });
    expect(matchingCategoryOption('aiBullishness', overrides)).toBe('modest');
  });

  it('monetizes half of new bonds and leaves the rate rule at its defaults', () => {
    const option = optionById('centralBank', 'monetizing');
    expect(option.values).toEqual({
      'centralBank.inflationTarget': 0.02,
      'centralBank.inflationWeight': 1.5,
      'centralBank.outputWeight': 1,
      'centralBank.bondPurchaseShare': 0.5,
      'centralBank.rateSmoothing': 0.5,
      'bank.reserveRequirement': 0.1,
    });
    expect(applyCategoryOption('centralBank', 'monetizing', {})).toEqual({
      'centralBank.bondPurchaseShare': 0.5,
    });
    expect(matchingCategoryOption('centralBank', { 'centralBank.bondPurchaseShare': 0.5 })).toBe(
      'monetizing',
    );
  });

  it('reads Custom when an owned slider leaves every option', () => {
    const overrides = { 'ai.bullishness': 0.5 };
    expect(matchingCategoryOption('aiBullishness', overrides)).toBeNull();
  });

  it('composes named scenario files from category options', () => {
    expect(composeScenario('neutral')).toEqual({ regime: 'fiat', sliders: {} });
    expect(composeScenario('no-ai').sliders).toEqual({
      'ai.bullishness': 1,
      'ai.automatableShareStart': 0.3,
      'ai.automatableShareEnd': 0.3,
      'ai.adoptionMidpointYear': 10,
      'ai.adoptionSteepness': 0.4,
      'ai.physicalTaskShare': 0.3,
      'ai.roboticsStartYear': 10,
      'ai.roboticsRampYears': 10,
    });
    expect(composeScenario('fast-adoption').sliders).toEqual({
      'ai.bullishness': 1.5,
      'ai.adoptionMidpointYear': 3,
      'ai.adoptionSteepness': 1.2,
      'ai.physicalTaskShare': 0.3,
      'ai.roboticsStartYear': 4,
      'ai.roboticsRampYears': 8,
    });
    expect(composeScenario('slow-adoption').sliders).toEqual({});
    expect(composeScenario('high-physical').sliders).toEqual(
      composeScenario('slow-adoption').sliders,
    );
    expect(composeScenario('austrian')).toEqual({
      regime: 'bitcoin',
      sliders: {
        'regime.type': 'bitcoin',
        'bank.capitalRatio': 0.16,
        'bitcoin.lendingModel': 'fullReserve',
        'deflation.sensitivity': 2,
        'tax.incomeRate': 0.1,
        'government.spendingShareOfGDP': 0.1,
        'government.ubiShare': 0,
        'government.stabilizer': 0,
      },
    });
    expect(composeScenario('keynesian').sliders).toEqual({
      'government.spendingShareOfGDP': 0.35,
      'government.stabilizer': 1.5,
      'centralBank.outputWeight': 1.2,
    });
  });

  it('names AI dividend and private surplus public-finance options', () => {
    expect(optionById('publicFinance', 'ai-dividend').values).toEqual({
      'tax.incomeRate': 0.35,
      'government.spendingShareOfGDP': 0.2,
      'government.ubiShare': 0.75,
      'government.stabilizer': 1,
      'government.treasuryBufferMonths': 1,
    });
    expect(applyCategoryOption('publicFinance', 'ai-dividend', {})).toEqual({
      'tax.incomeRate': 0.35,
      'government.ubiShare': 0.75,
    });
    expect(applyCategoryOption('publicFinance', 'private-surplus', {})).toEqual({
      'government.ubiShare': 0,
    });
  });

  it('applies Monetized dividend and clears a prior hawkish choice', () => {
    const hawkish = applyCategoryOption('centralBank', 'hawkish', {});
    expect(hawkish['centralBank.inflationWeight']).toBe(2.5);
    const next = applyScenarioWorld('monetized-dividend', hawkish);
    expect(next.regime).toBe('fiat');
    expect(next.overrides['centralBank.bondPurchaseShare']).toBe(0.5);
    expect(next.overrides['centralBank.inflationWeight']).toBeUndefined();
    expect(next.overrides['centralBank.outputWeight']).toBeUndefined();
    expect(next.overrides['tax.incomeRate']).toBe(0.35);
    expect(next.overrides['government.ubiShare']).toBe(0.75);
    expect(next.overrides['ai.bullishness']).toBe(2);
    expect(matchingCategoryOption('centralBank', next.overrides)).toBe('monetizing');
    expect(matchingCategoryOption('publicFinance', next.overrides)).toBe('ai-dividend');
    expect(matchingCategoryOption('credit', next.overrides)).toBe('moderate');
    expect(matchingCategoryOption('aiBullishness', next.overrides)).toBe('extreme');
    expect(matchingScenarioWorld(next.regime, next.overrides)).toBe('monetized-dividend');
  });

  it('reads Custom after a world when one category changes', () => {
    const world = applyScenarioWorld('monetized-dividend', {});
    expect(matchingScenarioWorld(world.regime, world.overrides)).toBe('monetized-dividend');
    const next = applyCategoryOption('aiBullishness', 'high', world.overrides);
    expect(matchingScenarioWorld(world.regime, next)).toBeNull();
  });

  it('lists every scenario world in SCENARIO_COMPOSITIONS', () => {
    for (const world of SCENARIO_WORLDS) {
      expect(SCENARIO_COMPOSITIONS[world.id]).toEqual({
        regime: world.regime,
        choices: world.choices,
      });
    }
  });

  it('keeps each scenario JSON file equal to its composition', () => {
    for (const name of Object.keys(SCENARIO_COMPOSITIONS)) {
      const file = path.resolve('scenarios/presets', `${name}.json`);
      const raw: unknown = JSON.parse(readFileSync(file, 'utf8'));
      expect(raw).toEqual(expect.objectContaining({ ticks: 600 }));
      if (typeof raw !== 'object' || raw === null || !('sliders' in raw)) {
        throw new Error(`${name}.json is missing sliders`);
      }
      const fileSliders = (raw as { sliders: Record<string, number | string> }).sliders;
      expect(sortedEntries(fileSliders)).toEqual(sortedEntries(composeScenario(name).sliders));
    }
  });
});

describe('composeCategoryOptions', () => {
  it('merges several categories and drops defaults', () => {
    const sliders = composeCategoryOptions({
      credit: 'tight',
      publicFinance: 'small',
      aiBullishness: 'modest',
    });
    expect(sliders['bank.capitalRatio']).toBe(0.16);
    expect(sliders['tax.incomeRate']).toBe(0.1);
    expect(sliders['government.ubiShare']).toBe(0);
    expect(sliders['ai.bullishness']).toBeUndefined();
  });

  it('lists every named composition', () => {
    for (const name of Object.keys(SCENARIO_COMPOSITIONS)) {
      expect(() => composeScenario(name)).not.toThrow();
    }
  });
});

function sortedEntries(
  sliders: Readonly<Record<string, number | string>>,
): [string, number | string][] {
  return Object.keys(sliders)
    .sort()
    .map((key) => {
      const value = sliders[key];
      if (value === undefined) {
        throw new Error(`missing slider ${key}`);
      }
      return [key, value];
    });
}
