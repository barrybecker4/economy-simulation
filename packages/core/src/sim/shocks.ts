import type { TickContext } from '../engine/engine.js';
import { CREDIT_WRITEOFF, SHOCK_PHASE_MONTHS } from './rules.js';
import { clamp, monthlyFromAnnual } from './stats.js';
import type { Economy } from './economy.js';
import { writeOffFirmLoan } from './money.js';
import { clearLenderOfLastResort } from './resolution.js';
import { rebaseNominal } from './nominal-scale.js';
import { ensureOpen } from './stocks.js';

export function onShocks(economy: Economy, ctx: TickContext): void {
  rebaseNominal(economy);
  ensureOpen(economy, ctx.ledger);
  economy.tick = ctx.tick;
  clearLenderOfLastResort(economy);
  const base = monthlyFromAnnual(economy.params.prodGrowth);
  const weight = economy.params.endogenousProductivity;
  if (weight <= 0) {
    economy.productivity *= 1 + base;
  } else {
    const reference = Math.max(1, economy.households.length * 0.94);
    const utilization = clamp(economy.realGdp / reference, 0.5, 1.5);
    const endogenous = base * utilization;
    economy.productivity *= 1 + (1 - weight) * base + weight * endogenous;
  }
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
