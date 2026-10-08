import type { Slider } from '../builders.js';
import { numberSlider } from '../builders.js';

export const SCALE_SLIDERS: readonly Slider[] = [
  numberSlider(
    'scale.households',
    'Households',
    'scale',
    'agents',
    4000,
    20,
    10000,
    'Number of household agents. The run rounds this to a whole number and keeps it fixed; population growth does not add people. Skill, patience, and job search are drawn once per household from the seed, so a larger population makes averages smoother and a run slower. Development runs use 4,000 households. The release target is 10,000.',
  ),
  numberSlider(
    'scale.firms',
    'Firms',
    'scale',
    'agents',
    200,
    4,
    500,
    'Number of firms. The run rounds this to a whole number and keeps it fixed. Each firm produces, sets a price, hires, and invests on its own. The default keeps about 20 households per firm, so a typical firm employs about 19 people. More firms mean a thinner workforce at each firm and more sellers for a shopper to land on. The release target is 500.',
  ),
  numberSlider(
    'scale.banks',
    'Banks',
    'scale',
    'agents',
    4,
    1,
    10,
    'Number of commercial banks. The run rounds this to a whole number. Households and firms are assigned to banks in turn, by id. Lending room, reserves, and failures are tracked per bank. In the fiat regime, newly created reserves and government bonds are booked at the first bank. The default of 4 leaves that first bank and three ordinary books.',
  ),
];
