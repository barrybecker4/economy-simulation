import type { TickContext } from '../engine/engine.js';
import { CREDIT_WRITEOFF, SHOCK_PHASE_MONTHS } from './rules.js';
import { monthlyFromAnnual } from './stats.js';
import type { Economy } from './economy.js';
import { ensureOpen, writeOffFirmLoan } from './money.js';

export function onShocks(economy: Economy, ctx: TickContext): void {
  ensureOpen(economy, ctx.ledger);
  economy.tick = ctx.tick;
  economy.productivity *= 1 + monthlyFromAnnual(economy.params.prodGrowth);
  economy.demandImpulse = 0;
  economy.productivityImpulse = 0;
  economy.creditImpulse = 0;
  if (economy.forcedShock && ctx.tick === economy.forcedShock.tick) {
    economy.shock = {
      kind: economy.forcedShock.kind,
      size: economy.forcedShock.size,
      month: 0,
    };
  }
  if (
    !economy.shock &&
    ctx.tick >= 24 &&
    ctx.tick % 12 === 0 &&
    economy.params.shockFrequency > 0
  ) {
    if (economy.shockRng.uniform() < economy.params.shockFrequency) {
      const kind = (['credit', 'demand', 'productivity'] as const)[
        economy.shockRng.weightedIndex([1, 1, 1])
      ];
      if (kind) {
        economy.shock = { kind, size: economy.params.shockSize, month: 0 };
      }
    }
  }
  if (economy.shock) {
    applyShock(economy);
    economy.shock.month += 1;
    if (economy.shock.month >= SHOCK_PHASE_MONTHS * 2) {
      economy.shock = null;
    }
  }
}

function applyShock(economy: Economy): void {
  if (!economy.shock) {
    return;
  }
  const expansion = economy.shock.month < SHOCK_PHASE_MONTHS;
  if (economy.shock.kind === 'demand') {
    economy.demandImpulse = expansion ? economy.shock.size : -economy.shock.size * 0.5;
  } else if (economy.shock.kind === 'productivity') {
    economy.productivityImpulse = expansion ? economy.shock.size : 0;
  } else {
    economy.creditImpulse = expansion ? economy.shock.size : -economy.shock.size;
    if (economy.shock.month === SHOCK_PHASE_MONTHS) {
      writeOffLoans(economy, CREDIT_WRITEOFF);
    }
  }
}

function writeOffLoans(economy: Economy, fraction: number): void {
  for (const firm of economy.firms) {
    const loss = Math.round(firm.loan * fraction);
    if (loss <= 0) {
      continue;
    }
    writeOffFirmLoan(firm, economy.banks[firm.bank], economy, loss);
    economy.defaultsThisTick += loss;
  }
}
