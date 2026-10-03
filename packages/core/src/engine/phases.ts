/** Fixed tick order. Later phases fill these steps; the order does not change. */
export const TICK_PHASES = [
  'shocks',
  'populationMix',
  'laborMarket',
  'production',
  'goodsAndAssets',
  'contractChoice',
  'credit',
  'government',
  'centralBank',
  'bookkeeping',
  'welfare',
] as const;

export type TickPhase = (typeof TICK_PHASES)[number];
