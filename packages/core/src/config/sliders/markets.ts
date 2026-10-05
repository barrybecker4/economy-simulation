import type { Slider } from '../builders.js';
import { numberSlider } from '../builders.js';

export const MARKET_SLIDERS: readonly Slider[] = [
  numberSlider(
    'labor.maxApplications',
    'Job applications',
    'behavior',
    'applications per tick',
    3,
    1,
    8,
    'How many firms an unemployed household can ask for work in one month. The run rounds this to a whole number. Hiring fills openings until employment is near 94 percent of households times the human share of output, with a small tilt when a demand shock is on. That target rises the natural unemployment rate as AI capacity grows. A searcher walks a short list of firms and takes the first one that still has room. A household displaced by automation is limited to one application even when this slider is higher. More applications make it easier to find a firm that is still hiring. This slider only limits how wide the search is.',
  ),
  numberSlider(
    'production.alpha',
    'Capital elasticity',
    'behavior',
    'share',
    0.33,
    0.2,
    0.5,
    'Exponent on capital in the Cobb–Douglas production function. Capacity is productivity times capital raised to this power times labor raised to one minus this power. A higher value means output responds more to capital and less to employment. Capital starts equal to employment at that firm and depreciates at 0.5 percent a month. The default near one third matches the usual capital share of income.',
  ),
  numberSlider(
    'goods.sampleSize',
    'Shops sampled',
    'behavior',
    'firms',
    4,
    1,
    12,
    'How many firms a household can visit while spending its monthly budget. The run rounds this to a whole number. The walk starts at a random firm and continues to the following firms until the budget is spent, the visits run out, or those firms are out of stock. The household buys from the firms on that walk that still have inventory. A larger sample makes a stockout easier to work around. Shoppers do not sort firms by price.',
  ),
];
