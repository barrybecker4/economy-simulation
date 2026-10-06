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
    'labor.wageElasticity',
    'Wage elasticity of hiring',
    'behavior',
    'coefficient',
    0.5,
    0,
    3,
    'How strongly the hiring quota responds when the real wage is away from its cost reference. The quota starts at 94 percent of households times the human share of output. The reference real wage is 1 / (1 + firm markup), the opening real wage. The quota is multiplied by clamp(1 − this elasticity × (real wage / reference − 1), 0.5, 1.25). A high real wage relative to the reference cuts hiring; a cheap real wage raises it. The default of 0.5 cuts the quota by 5 percent when the real wage is 10 percent above the reference. At 0 the quota is unchanged, so sticky wages change pay but not employment. When the scaled quota is below current employment, firms separate workers down to the quota.',
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
