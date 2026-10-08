import { bitcoinIssuanceRate } from './bitcoin-supply.js';
import type { Economy } from './economy.js';
import { clamp } from './stats.js';

export interface MoneyShares {
  fiat: number;
  bitcoin: number;
  stablecoin: number;
  cbdc: number;
}

const DIGITAL_FRICTION = 0.02;
const STABLECOIN_TRUST = 0.45;
const CBDC_TRUST = 0.7;

/** Opening mix. Fiat is whatever the other starts do not take. */
export function openingShares(input: {
  bitcoin: number;
  stablecoin: number;
  cbdc: number;
}): MoneyShares {
  const bitcoin = clamp(input.bitcoin, 0, 1);
  const stablecoin = clamp(input.stablecoin, 0, 1);
  const cbdc = clamp(input.cbdc, 0, 1);
  const claimed = bitcoin + stablecoin + cbdc;
  if (claimed <= 0) {
    return { fiat: 1, bitcoin: 0, stablecoin: 0, cbdc: 0 };
  }
  if (claimed >= 1) {
    return {
      fiat: 0,
      bitcoin: bitcoin / claimed,
      stablecoin: stablecoin / claimed,
      cbdc: cbdc / claimed,
    };
  }
  return { fiat: 1 - claimed, bitcoin, stablecoin, cbdc };
}

export function moneyScores(input: {
  fiatLegal: number;
  bitcoinTrust: number;
  realReturn: number;
}): [number, number, number, number] {
  return [
    input.fiatLegal,
    input.bitcoinTrust + input.realReturn - DIGITAL_FRICTION,
    STABLECOIN_TRUST - DIGITAL_FRICTION,
    CBDC_TRUST - DIGITAL_FRICTION * 0.5,
  ];
}

/** Pull shares toward the softmax of scores. Speed 0 leaves them unchanged. */
export function nextMoneyShares(
  shares: MoneyShares,
  scores: readonly [number, number, number, number],
  speed: number,
): MoneyShares {
  if (speed <= 0) {
    return shares;
  }
  const current = [shares.fiat, shares.bitcoin, shares.stablecoin, shares.cbdc];
  const weights = scores.map((score) => Math.exp(clamp(score, -4, 4)));
  const weightSum = weights.reduce((total, weight) => total + weight, 0);
  const mixed = current.map((share, index) => {
    const target = weightSum > 0 ? (weights[index] ?? 0) / weightSum : share;
    return (1 - speed) * share + speed * target;
  });
  const total = mixed.reduce((sum, share) => sum + share, 0);
  const [fiat, bitcoin, stablecoin, cbdc] = mixed.map((share) => (total > 0 ? share / total : 0));
  return {
    fiat: fiat ?? 0,
    bitcoin: bitcoin ?? 0,
    stablecoin: stablecoin ?? 0,
    cbdc: cbdc ?? 0,
  };
}

/** Price rises when the share exceeds issuance and falls when issuance is larger. */
export function nextExchangeRate(price: number, share: number, issuance: number): number {
  return clamp(price * (1 + 0.05 * (share - issuance)), 0.05, 20);
}

export function updateMoneyChoice(economy: Economy): void {
  if (economy.params.choiceSpeed > 0) {
    const realReturn =
      economy.depositRate - economy.moneyShares.bitcoin * economy.params.prodGrowth;
    economy.moneyShares = nextMoneyShares(
      economy.moneyShares,
      moneyScores({
        fiatLegal: economy.params.fiatLegalTender,
        bitcoinTrust: economy.params.bitcoinTrust,
        realReturn,
      }),
      economy.params.choiceSpeed,
    );
    economy.bitcoinPrice = nextExchangeRate(
      economy.bitcoinPrice,
      economy.moneyShares.bitcoin,
      bitcoinIssuanceRate(economy.tick),
    );
    economy.stablecoinPrice = nextExchangeRate(
      economy.stablecoinPrice,
      economy.moneyShares.stablecoin,
      0,
    );
    economy.cbdcPrice = nextExchangeRate(economy.cbdcPrice, economy.moneyShares.cbdc, 0);
  }
  const weight = clamp(economy.params.bitcoinMarketPriceWeight, 0, 1);
  if (weight > 0) {
    const market = nextExchangeRate(
      economy.bitcoinPrice,
      Math.max(economy.moneyShares.bitcoin, 0.004) * (0.5 + economy.params.bitcoinTrust),
      bitcoinIssuanceRate(economy.tick),
    );
    economy.bitcoinPrice = economy.bitcoinPrice * (1 - weight) + market * weight;
  }
}
