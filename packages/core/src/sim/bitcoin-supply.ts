/**
 * Bitcoin's issuance path. The cap is 21 million. Each epoch is 210,000 blocks,
 * treated here as 48 months, and the block reward halves. The April 2024
 * halving set the reward to 3.125 BTC, with 19,687,500 BTC already mined.
 * A run's month 0 is October 2026, 30 months into that epoch.
 */

const BITCOIN_CAP = 21_000_000;
const BLOCKS_PER_EPOCH = 210_000;
const MONTHS_PER_EPOCH = 48;
const REWARD_AT_2024 = 3.125;
const MONTHS_FROM_2024_HALVING_TO_START = 30;

/** About $2 trillion of bitcoin against about $500 trillion of global assets. */
export const BITCOIN_OPENING_SHARE = 2 / 500;

export function bitcoinReward(month: number): number {
  const epoch = Math.floor((MONTHS_FROM_2024_HALVING_TO_START + month) / MONTHS_PER_EPOCH);
  return REWARD_AT_2024 / 2 ** epoch;
}

/** Coins outstanding, and the coins mined during this month. */
export function bitcoinSupply(month: number): { stock: number; monthlyFlow: number } {
  const elapsed = MONTHS_FROM_2024_HALVING_TO_START + Math.max(0, month);
  const epoch = Math.floor(elapsed / MONTHS_PER_EPOCH);
  const intoEpoch = elapsed - epoch * MONTHS_PER_EPOCH;
  const reward = REWARD_AT_2024 / 2 ** epoch;
  const remainingAtEpochStart = 2 * reward * BLOCKS_PER_EPOCH;
  const stockAtEpochStart = BITCOIN_CAP - remainingAtEpochStart;
  const blocksThisEpoch = intoEpoch * (BLOCKS_PER_EPOCH / MONTHS_PER_EPOCH);
  const stock = Math.min(BITCOIN_CAP, stockAtEpochStart + blocksThisEpoch * reward);
  const monthlyFlow = stock >= BITCOIN_CAP ? 0 : reward * (BLOCKS_PER_EPOCH / MONTHS_PER_EPOCH);
  return { stock, monthlyFlow };
}

/** New coins this month divided by coins already outstanding. */
export function bitcoinIssuanceRate(month: number): number {
  const { stock, monthlyFlow } = bitcoinSupply(month);
  if (stock <= 0) {
    return 0;
  }
  return monthlyFlow / stock;
}
