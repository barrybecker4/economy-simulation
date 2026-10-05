import type { ResolvedConfig } from '../config/load.js';
import type { TickContext } from '../engine/engine.js';
import type { PhaseHandlers } from '../engine/engine.js';
import { Ledger, type EntrySide } from '../ledger/ledger.js';
import { Rng } from '../rng/rng.js';
import { BASKET_METRICS, splitBasket, type CategoryProductivity } from './basket.js';
import {
  CREDIT_WRITEOFF,
  FAILURE_TICKS,
  INITIAL_WAGE,
  INVENTORY_MONTHS,
  LOAN_SPREAD,
  MAX_MONTHLY_PRICE_MOVE,
  MONTHLY_DEPRECIATION,
  MONTHLY_SEPARATION,
  NATURAL_UNEMPLOYMENT,
  SHOCK_PHASE_MONTHS,
  TIGHTNESS_WAGE,
  WEALTH_MPC,
} from './rules.js';
import { bottomShare, clamp, gini, mean, median, monthlyFromAnnual, topShare } from './stats.js';

interface Household {
  id: number;
  bank: number;
  skill: number;
  timePref: number;
  deposit: number;
  loan: number;
  employer: number;
  income: number;
  consumption: number;
  realConsumption: number;
  smoothed: number;
  search: Rng;
}

interface Firm {
  id: number;
  bank: number;
  productivity: number;
  capital: number;
  price: number;
  inventory: number;
  wage: number;
  workers: number[];
  deposit: number;
  loan: number;
  salesUnits: number;
  output: number;
  investment: number;
  negTicks: number;
}

interface Agent {
  id: number;
  owner: number;
  deposit: number;
}

interface Bank {
  id: number;
  vault: number;
  equity: number;
  reserves: number;
  bonds: number;
  failed: boolean;
}

type ShockKind = 'credit' | 'demand' | 'productivity';

interface ActiveShock {
  kind: ShockKind;
  size: number;
  month: number;
}

/**
 * A stock-flow consistent single-good fiat economy.
 * Later phases extend the same object; neutral settings leave this behavior in place.
 */
export class World {
  private readonly households: Household[];
  private readonly firms: Firm[];
  private readonly banks: Bank[];
  private readonly alpha: number;
  private readonly markup: number;
  private readonly priceSpeed: number;
  private readonly rigidity: number;
  private readonly maxApplications: number;
  private readonly sampleSize: number;
  private readonly taxRate: number;
  private readonly spendShare: number;
  private readonly inflationTarget: number;
  private readonly inflationWeight: number;
  private readonly outputWeight: number;
  private readonly reserveRequirement: number;
  private readonly capitalRatio: number;
  private readonly timePrefMean: number;
  private readonly prodGrowth: number;
  private readonly categoryGrowth: CategoryProductivity;
  private readonly housingSupplyGrowth: number;
  private readonly housingWeight: number;
  private readonly regime: 'fiat' | 'bitcoin' | 'hybrid';
  private readonly unit: 'cent' | 'satoshi';
  private readonly lendingModel: 'maturityMatched' | 'fullReserve';
  private readonly deflationSensitivity: number;
  private readonly autoStart: number;
  private readonly autoEnd: number;
  private readonly adoptionMidpoint: number;
  private readonly adoptionSteepness: number;
  private readonly computeDecline: number;
  private readonly physicalShare: number;
  private readonly ownership: number;
  private aiFactor = 1;
  private automatedShare = 0;
  private readonly autonomyEnd: number;
  private readonly frictionFiat: number;
  private readonly frictionBitcoin: number;
  private readonly agents: Agent[] = [];
  private agentVolume = 0;
  private readonly shockFrequency: number;
  private readonly shockSize: number;
  private readonly shockRng: Rng;
  private ledger: Ledger | null = null;
  private ready = false;
  private wageLevel: number;
  private priceLevel: number;
  private readonly priceHistory: number[];
  private readonly gdpHistory: number[];
  private productivity = 1;
  private demandImpulse = 0;
  private productivityImpulse = 0;
  private creditImpulse = 0;
  private shock: ActiveShock | null = null;
  private forcedShock: { tick: number; kind: ShockKind; size: number } | null = null;
  private policyRate: number;
  private realGdp = 0;
  private consumptionSpend = 0;
  private investmentSpend = 0;
  private realInvestment = 0;
  private defaultsThisTick = 0;
  private cumulativeFailures = 0;
  private boomLength = 0;
  private bustLength = 0;
  private sawBoom = false;
  private privateEquity = 0;
  private govDeposits = 0;
  private tick = 0;
  private demandBase = 0;
  private readonly creditHistory: number[] = [];

  constructor(
    private readonly config: ResolvedConfig,
    forcedShock: { tick: number; kind: ShockKind; size: number } | null = null,
  ) {
    const root = new Rng(config.seed);
    this.shockRng = root.fork('shocks');
    this.alpha = slider(config, 'production.alpha');
    this.markup = slider(config, 'firm.markup');
    this.priceSpeed = slider(config, 'firm.priceAdjustSpeed');
    this.rigidity = slider(config, 'wage.nominalRigidity');
    this.maxApplications = Math.round(slider(config, 'labor.maxApplications'));
    this.sampleSize = Math.round(slider(config, 'goods.sampleSize'));
    this.taxRate = slider(config, 'tax.incomeRate');
    this.spendShare = slider(config, 'government.spendingShareOfGDP');
    this.inflationTarget = slider(config, 'centralBank.inflationTarget');
    this.inflationWeight = slider(config, 'centralBank.inflationWeight');
    this.outputWeight = slider(config, 'centralBank.outputWeight');
    this.reserveRequirement = slider(config, 'bank.reserveRequirement');
    this.capitalRatio = slider(config, 'bank.capitalRatio');
    this.timePrefMean = slider(config, 'household.timePreferenceMean');
    this.prodGrowth = slider(config, 'productivity.baseGrowth');
    this.categoryGrowth = {
      food: slider(config, 'goods.foodProductivity'),
      energy: slider(config, 'goods.energyProductivity'),
      apparel: slider(config, 'goods.apparelProductivity'),
      transportation: slider(config, 'goods.transportProductivity'),
      medical: slider(config, 'goods.medicalProductivity'),
      education: slider(config, 'goods.educationProductivity'),
      recreation: slider(config, 'goods.recreationProductivity'),
      electronics: slider(config, 'goods.electronicsProductivity'),
    };
    this.housingSupplyGrowth = slider(config, 'goods.housingSupplyGrowth');
    this.housingWeight = slider(config, 'welfare.housingSecurityWeight');
    this.regime = regimeOf(config);
    this.unit = this.regime === 'fiat' ? 'cent' : 'satoshi';
    this.lendingModel = lendingModelOf(config);
    this.deflationSensitivity = slider(config, 'deflation.sensitivity');
    this.autoStart = slider(config, 'ai.automatableShareStart');
    this.autoEnd = slider(config, 'ai.automatableShareEnd');
    this.adoptionMidpoint = slider(config, 'ai.adoptionMidpointYear');
    this.adoptionSteepness = slider(config, 'ai.adoptionSteepness');
    this.computeDecline = slider(config, 'ai.computeCostDeclineRate');
    this.physicalShare = slider(config, 'ai.physicalTaskShare');
    this.ownership = slider(config, 'ai.ownershipConcentration');
    this.autonomyEnd = slider(config, 'ai.agentAutonomyShareEnd');
    this.frictionFiat = slider(config, 'ai.paymentFrictionFiat');
    this.frictionBitcoin = slider(config, 'ai.paymentFrictionBitcoin');
    this.automatedShare = this.autoStart;
    this.shockFrequency = slider(config, 'shock.frequency');
    this.shockSize = slider(config, 'shock.size');
    this.policyRate = this.timePrefMean + this.inflationTarget;
    this.wageLevel = INITIAL_WAGE;
    this.priceLevel = INITIAL_WAGE * (1 + this.markup);
    this.forcedShock = forcedShock;
    const monthlyInflation = this.priceTrend();
    this.priceHistory = [];
    for (let age = 12; age >= 1; age -= 1) {
      this.priceHistory.push(this.priceLevel / (1 + monthlyInflation) ** age);
    }
    this.gdpHistory = Array.from({ length: 12 }, () => 1);

    const householdCount = Math.round(slider(config, 'scale.households'));
    const firmCount = Math.round(slider(config, 'scale.firms'));
    const bankCount = Math.round(slider(config, 'scale.banks'));
    const init = root.fork('init');
    this.banks = Array.from({ length: bankCount }, (_, id) => ({
      id,
      vault: 0,
      equity: 0,
      reserves: 0,
      bonds: 0,
      failed: false,
    }));
    this.firms = Array.from({ length: firmCount }, (_, id) => ({
      id,
      bank: id % bankCount,
      productivity: clamp(init.lognormal(0, 0.05), 0.8, 1.25),
      capital: 0,
      price: this.priceLevel,
      inventory: 0,
      wage: this.wageLevel,
      workers: [],
      deposit: 0,
      loan: 0,
      salesUnits: 0,
      output: 0,
      investment: 0,
      negTicks: 0,
    }));
    const skillSigma = slider(config, 'household.skillSigma');
    const prefStd = slider(config, 'household.timePreferenceStd');
    this.households = Array.from({ length: householdCount }, (_, id) => ({
      id,
      bank: id % bankCount,
      skill: clamp(init.lognormal(0, skillSigma), 0.2, 5),
      timePref: clamp(init.normal(this.timePrefMean, prefStd), 0.01, 0.15),
      deposit: 0,
      loan: 0,
      employer: -1,
      income: 0,
      consumption: 0,
      realConsumption: 0,
      smoothed: 0,
      search: root.fork('hh').fork(id),
    }));
    const meanSkill = mean(this.households.map((household) => household.skill));
    for (const household of this.households) {
      household.skill /= meanSkill || 1;
    }
    this.employ(Math.round(householdCount * (1 - NATURAL_UNEMPLOYMENT)));
    let initialOutput = 0;
    for (const firm of this.firms) {
      firm.capital = Math.max(1, firm.workers.length);
      firm.inventory = this.capacity(firm) * INVENTORY_MONTHS;
      firm.loan = Math.round(0.5 * firm.capital * firm.price);
      initialOutput += this.capacity(firm);
    }
    for (const household of this.households) {
      household.deposit = Math.round(household.skill ** 2 * INITIAL_WAGE * 36);
      household.income = 0;
    }
    for (const firm of this.firms) {
      const revenue = Math.max(0, Math.round(firm.price * this.capacity(firm)));
      const pays = firm.workers.flatMap((workerId) => {
        const worker = this.households[workerId];
        return worker ? [{ id: workerId, amount: this.pay(worker, firm) }] : [];
      });
      const owed = pays.reduce((sum, item) => sum + item.amount, 0);
      let left = revenue;
      for (let index = 0; index < pays.length; index += 1) {
        const item = pays[index];
        if (!item || owed <= 0) {
          continue;
        }
        const share =
          index === pays.length - 1
            ? left
            : Math.min(left, Math.round((revenue * item.amount) / owed));
        left -= share;
        const worker = this.households[item.id];
        if (worker) {
          worker.income += share;
          worker.deposit += share;
        }
      }
    }
    this.redistributeToUnemployed();
    for (const household of this.households) {
      household.smoothed = household.income;
    }
    for (let index = 0; index < this.gdpHistory.length; index += 1) {
      this.gdpHistory[index] = Math.max(initialOutput, 1);
    }
    this.capitalizeBanks();
  }

  handlers(): PhaseHandlers {
    return {
      shocks: (ctx) => this.onShocks(ctx),
      populationMix: () => this.onPopulation(),
      laborMarket: () => this.onLabor(),
      production: () => this.onProduction(),
      goodsAndAssets: () => this.onGoods(),
      contractChoice: () => undefined,
      credit: () => this.onCredit(),
      government: () => this.onGovernment(),
      centralBank: () => this.onCentralBank(),
      bookkeeping: (ctx) => this.onBookkeeping(ctx),
      welfare: (ctx) => this.onWelfare(ctx),
    };
  }

  private onShocks(ctx: TickContext): void {
    this.ensureOpen(ctx.ledger);
    this.tick = ctx.tick;
    this.productivity *= 1 + monthlyFromAnnual(this.prodGrowth);
    this.demandImpulse = 0;
    this.productivityImpulse = 0;
    this.creditImpulse = 0;
    if (this.forcedShock && ctx.tick === this.forcedShock.tick) {
      this.shock = { kind: this.forcedShock.kind, size: this.forcedShock.size, month: 0 };
    }
    if (!this.shock && ctx.tick >= 24 && ctx.tick % 12 === 0 && this.shockFrequency > 0) {
      if (this.shockRng.uniform() < this.shockFrequency) {
        const kind = (['credit', 'demand', 'productivity'] as const)[
          this.shockRng.weightedIndex([1, 1, 1])
        ];
        if (kind) {
          this.shock = { kind, size: this.shockSize, month: 0 };
        }
      }
    }
    if (this.shock) {
      this.applyShock();
      this.shock.month += 1;
      if (this.shock.month >= SHOCK_PHASE_MONTHS * 2) {
        this.shock = null;
      }
    }
  }

  private applyShock(): void {
    if (!this.shock) {
      return;
    }
    const expansion = this.shock.month < SHOCK_PHASE_MONTHS;
    if (this.shock.kind === 'demand') {
      this.demandImpulse = expansion ? this.shock.size : -this.shock.size * 0.5;
    } else if (this.shock.kind === 'productivity') {
      this.productivityImpulse = expansion ? this.shock.size : 0;
    } else {
      this.creditImpulse = expansion ? this.shock.size : -this.shock.size;
      if (this.shock.month === SHOCK_PHASE_MONTHS) {
        this.writeOffLoans(CREDIT_WRITEOFF);
      }
    }
  }

  private onLabor(): void {
    for (const household of this.households) {
      if (household.employer < 0) {
        continue;
      }
      if (household.search.uniform() < MONTHLY_SEPARATION) {
        this.separate(household);
      }
    }
    const target = Math.round(
      this.households.length *
        (1 - NATURAL_UNEMPLOYMENT) *
        clamp(1 + this.demandImpulse, 0.85, 1.1),
    );
    const perFirm = Math.max(1, Math.ceil(target / this.firms.length));
    let employed = this.employedCount();
    for (const household of this.households) {
      if (employed >= target) {
        break;
      }
      if (household.employer >= 0) {
        continue;
      }
      const start = household.search.uniformInt(0, this.firms.length - 1);
      const applications = this.displaced(household) ? 1 : this.maxApplications;
      for (let attempt = 0; attempt < applications; attempt += 1) {
        const firm = this.firms[(start + attempt) % this.firms.length];
        if (!firm || firm.workers.length >= perFirm) {
          continue;
        }
        firm.workers.push(household.id);
        household.employer = firm.id;
        employed += 1;
        break;
      }
    }
    const unemployment = 1 - this.employedCount() / this.households.length;
    const tightness = NATURAL_UNEMPLOYMENT - unemployment;
    const monthlyInflation = this.priceTrend();
    const monthlyProd = monthlyFromAnnual(this.prodGrowth);
    const trend = monthlyInflation + monthlyProd;
    const gap = TIGHTNESS_WAGE * tightness;
    const stickyGap = gap < 0 ? (1 - this.rigidity) ** 2 * gap : (1 - this.rigidity) * gap;
    const wageGrowth = clamp(trend + stickyGap, -MAX_MONTHLY_PRICE_MOVE, MAX_MONTHLY_PRICE_MOVE);
    this.wageLevel *= 1 + wageGrowth;
    for (const firm of this.firms) {
      firm.wage = this.wageLevel * firm.productivity;
    }
  }

  private onPopulation(): void {
    this.automatedShare = this.automationShare();
    const span = Math.max(0, this.automatedShare - this.autoStart);
    if (span === 0) {
      this.aiFactor = 1;
      this.spawnAgents();
      return;
    }
    const years = this.tick / 12;
    const computeCost = this.wageLevel * (1 - this.computeDecline) ** years;
    const adopted = computeCost < this.wageLevel ? span * (1 - this.physicalShare) : 0;
    this.aiFactor = 1 + adopted;
    this.spawnAgents();
  }

  private automationShare(): number {
    if (this.autoEnd === this.autoStart) {
      return this.autoStart;
    }
    const years = this.tick / 12;
    const logistic = 1 / (1 + Math.exp(-this.adoptionSteepness * (years - this.adoptionMidpoint)));
    return this.autoStart + (this.autoEnd - this.autoStart) * logistic;
  }

  private autonomyShare(): number {
    if (this.autonomyEnd === 0) {
      return 0;
    }
    const years = this.tick / 12;
    return this.autonomyEnd * Math.min(1, years / 5);
  }

  private spawnAgents(): void {
    const target = Math.round(this.autonomyShare() * this.households.length);
    const owners = Math.max(1, Math.round(this.households.length * (1 - this.ownership)));
    while (this.agents.length < target) {
      const id = this.agents.length;
      this.agents.push({ id, owner: id % owners, deposit: 0 });
    }
  }

  private tradeAgents(): void {
    if (this.agents.length === 0) {
      this.agentVolume = 0;
      return;
    }
    this.agentVolume = 0;
    const friction = this.regime === 'fiat' ? this.frictionFiat : this.frictionBitcoin;
    const ask = this.wageLevel * 0.04 * (1 + friction);
    if (ask >= this.wageLevel * 0.042) {
      return;
    }
    for (const agent of this.agents) {
      const firm = this.firms[agent.id % this.firms.length];
      const bank = firm ? this.banks[firm.bank] : undefined;
      if (!firm || !bank || firm.deposit < ask) {
        continue;
      }
      const bill = this.unit === 'cent' ? Math.round(ask) : ask;
      if (bill <= 0 || firm.deposit < bill) {
        continue;
      }
      const fee = this.unit === 'cent' ? Math.round(bill * friction) : bill * friction;
      firm.deposit -= bill;
      agent.deposit += bill - fee;
      if (fee > 0) {
        bank.equity += fee;
        this.privateEquity -= fee;
      }
      this.agentVolume += bill;
    }
    const retain = this.wageLevel * 0.01;
    for (const agent of this.agents) {
      const sweep = agent.deposit - retain;
      if (sweep <= 0) {
        continue;
      }
      const owner = this.households[agent.owner];
      if (!owner) {
        continue;
      }
      agent.deposit -= sweep;
      owner.deposit += sweep;
    }
  }

  private displaced(household: Household): boolean {
    return this.aiFactor > 1 && household.skill < this.automatedShare;
  }

  private onProduction(): void {
    for (const firm of this.firms) {
      const capacity = this.capacity(firm);
      const targetStock = capacity * INVENTORY_MONTHS;
      const rebuild = clamp(targetStock - firm.inventory, -capacity, capacity * 0.5);
      firm.output = capacity;
      firm.inventory += Math.max(0, capacity + rebuild);
      firm.capital *= 1 - MONTHLY_DEPRECIATION;
    }
  }

  private onGoods(): void {
    this.consumptionSpend = 0;
    this.demandBase = 0;
    for (const household of this.households) {
      this.demandBase += household.smoothed;
    }
    for (const household of this.households) {
      const mpc = clamp(1 - this.spendShare + household.timePref - this.timePrefMean, 0.35, 0.95);
      const buffer = household.income * 48;
      const extra = Math.max(0, household.deposit - buffer) * WEALTH_MPC;
      const budget = household.smoothed * mpc * (1 + this.demandImpulse) + extra;
      let left = Math.max(0, Math.min(household.deposit, Math.round(budget)));
      let spent = 0;
      let bought = 0;
      if (left > 0 && this.firms.length > 0) {
        const start = household.search.uniformInt(0, this.firms.length - 1);
        for (let attempt = 0; attempt < this.sampleSize && left > 0; attempt += 1) {
          const seller = this.firms[(start + attempt) % this.firms.length];
          if (!seller || seller.inventory <= 0 || seller.price <= 0) {
            continue;
          }
          const units = Math.min(seller.inventory, left / seller.price);
          const bill = Math.min(left, Math.round(units * seller.price));
          if (bill <= 0) {
            continue;
          }
          const taken = bill / seller.price;
          household.deposit -= bill;
          seller.deposit += bill;
          seller.inventory -= taken;
          seller.salesUnits += taken;
          left -= bill;
          spent += bill;
          bought += taken;
        }
      }
      household.consumption = spent;
      household.realConsumption = bought;
      this.consumptionSpend += spent;
    }
    let output = 0;
    let weightedPrice = 0;
    for (const firm of this.firms) {
      const capacity = this.capacity(firm);
      const wageBill = firm.workers.reduce((sum, workerId) => {
        const worker = this.households[workerId];
        return sum + (worker ? this.pay(worker, firm) : 0);
      }, 0);
      const unitCost = capacity > 0 ? wageBill / capacity : firm.price / (1 + this.markup);
      const pressure = clamp(
        (INVENTORY_MONTHS * Math.max(capacity, 1)) / Math.max(firm.inventory, 0.25),
        0.98,
        1.02,
      );
      const costTarget = unitCost * (1 + this.markup) * pressure;
      const trend = this.priceTrend();
      const nudge = clamp(
        this.priceSpeed * 0.01 * (costTarget / Math.max(firm.price, 1) - 1),
        -0.001,
        0.001,
      );
      const shockTilt = 0.12 * this.demandImpulse - 0.12 * this.productivityImpulse;
      const move = clamp(
        trend + nudge + shockTilt,
        -MAX_MONTHLY_PRICE_MOVE,
        MAX_MONTHLY_PRICE_MOVE,
      );
      firm.price = Math.max(1, firm.price * (1 + move));
      firm.salesUnits = 0;
      const weight = Math.max(capacity, 0);
      output += firm.output;
      weightedPrice += firm.price * weight;
    }
    this.realGdp = output;
    this.priceLevel = output > 0 ? weightedPrice / output : this.priceLevel;
    this.priceHistory.push(this.priceLevel);
    this.gdpHistory.push(this.realGdp);
    this.tradeAgents();
  }

  private onCredit(): void {
    this.investmentSpend = 0;
    this.realInvestment = 0;
    for (const firm of this.firms) {
      const bank = this.banks[firm.bank];
      const rawInterest = (firm.loan * (this.policyRate + LOAN_SPREAD)) / 12;
      const interest = this.unit === 'cent' ? Math.round(rawInterest) : rawInterest;
      const penalty = this.deflationPenalty();
      if (penalty > 0 && firm.loan > 0 && firm.deposit > 0) {
        const rawRepay = firm.loan * penalty * 0.02;
        const repay = Math.min(
          firm.loan,
          firm.deposit,
          this.unit === 'cent' ? Math.round(rawRepay) : rawRepay,
        );
        if (repay > 0) {
          firm.loan -= repay;
          firm.deposit -= repay;
        }
      }
      if (interest > 0 && firm.deposit >= interest && bank && !bank.failed) {
        firm.deposit -= interest;
        bank.equity += interest;
        this.privateEquity -= interest;
      }
      const desired = Math.max(1, firm.workers.length * (1 + Math.max(0, this.creditImpulse)));
      const lumpy = this.tick % 12 === 0 || this.creditImpulse > 0;
      if (lumpy) {
        const gap = Math.max(0, desired - firm.capital);
        if (this.creditImpulse > 0 && bank && !bank.failed) {
          const room =
            this.regime === 'fiat'
              ? this.lendingRoom(bank)
              : Math.min(this.lendingRoom(bank), this.savingsRoom());
          const borrowed = Math.min(
            Math.round(firm.loan * this.creditImpulse * 0.2 + gap * firm.price),
            Math.max(0, Math.round(room)),
          );
          if (borrowed > 0) {
            firm.loan += borrowed;
            firm.deposit += borrowed;
          }
        }
        firm.capital += gap;
        this.realInvestment += gap;
        this.investmentSpend += gap * firm.price;
      }
      if (bank && !bank.failed) {
        const target = this.equityFor(this.loansAt(bank.id));
        if (bank.equity > target) {
          const dividend = Math.round(bank.equity - target);
          bank.equity -= dividend;
          this.privateEquity += dividend;
        }
      }
    }
  }

  private onGovernment(): void {
    let tax = 0;
    for (const household of this.households) {
      const bill = Math.round(this.taxRate * household.income);
      const paid = Math.min(household.deposit, bill);
      household.deposit -= paid;
      tax += paid;
    }
    this.govDeposits += tax;
    const purchases = Math.max(0, Math.round(this.spendShare * this.demandBase));
    if (this.govDeposits < purchases) {
      const issue = purchases - Math.max(0, this.govDeposits);
      this.govDeposits += issue;
      const buyer = this.banks[0];
      if (buyer) {
        buyer.bonds += issue;
      }
    }
    let remaining = purchases;
    const byStock = [...this.firms].sort((left, right) => right.inventory - left.inventory);
    for (const firm of byStock) {
      if (remaining <= 0 || firm.inventory <= 0 || firm.price <= 0) {
        continue;
      }
      const units = Math.min(firm.inventory, remaining / firm.price);
      const bill = Math.min(remaining, Math.round(units * firm.price));
      if (bill <= 0) {
        continue;
      }
      firm.deposit += bill;
      firm.inventory -= bill / firm.price;
      this.govDeposits -= bill;
      remaining -= bill;
    }
    this.distributeIncome();
    this.redistributeToUnemployed();
    for (const household of this.households) {
      household.smoothed = Math.round(0.9 * household.smoothed + 0.1 * household.income);
    }
    if (this.govDeposits < 0) {
      const issue = -this.govDeposits;
      this.govDeposits += issue;
      const buyer = this.banks[0];
      if (buyer) {
        buyer.bonds += issue;
      }
    }
  }

  private onCentralBank(): void {
    if (this.regime !== 'fiat') {
      const savings = this.savingsStock();
      const pressure = savings > 0 ? this.totalLoans() / savings - 1 : 0;
      this.policyRate = Math.max(0, this.policyRate + 0.05 * pressure);
      if (this.regime === 'hybrid') {
        for (const bank of this.banks) {
          if (bank.equity < 0) {
            const injection = -bank.equity + 1;
            bank.equity += injection;
            bank.vault += injection;
            bank.reserves += injection;
          }
        }
      }
      return;
    }
    const inflation = this.inflation();
    const unemployment = 1 - this.employedCount() / this.households.length;
    const gap = NATURAL_UNEMPLOYMENT - unemployment;
    this.policyRate = Math.max(
      0,
      this.timePrefMean +
        inflation +
        this.inflationWeight * (inflation - this.inflationTarget) +
        this.outputWeight * gap,
    );
    const deposits = this.totalDeposits();
    const required = Math.round(this.reserveRequirement * deposits);
    const reserves = this.banks.reduce((sum, bank) => sum + bank.reserves, 0);
    if (reserves < required) {
      const add = required - reserves;
      const bank = this.banks[0];
      if (bank) {
        bank.reserves += add;
      }
    }
  }

  private onBookkeeping(ctx: TickContext): void {
    this.postStocks(ctx.ledger);
    for (const bank of this.banks) {
      if (!bank.failed && bank.equity <= 0) {
        bank.failed = true;
        this.cumulativeFailures += 1;
      }
    }
    for (const firm of this.firms) {
      const equity = firm.deposit + firm.capital * firm.price - firm.loan;
      firm.negTicks = equity < 0 ? firm.negTicks + 1 : 0;
      if (firm.negTicks >= FAILURE_TICKS) {
        this.replaceFirm(firm);
      }
    }
    this.trackCreditCycle();
    const audit = ctx.ledger.audit();
    if (!audit.ok) {
      throw new Error(`Ledger audit failed at tick ${ctx.tick}: imbalance ${audit.imbalance}`);
    }
  }

  private onWelfare(ctx: TickContext): void {
    const incomes = this.households.map((household) => household.income);
    const consumption = this.households.map((household) => household.realConsumption);
    const wealth = this.households.map((household) => household.deposit - household.loan);
    const skills = this.households.map((household) => household.skill);
    const employed = this.employedCount();
    const unemployment = 1 - employed / this.households.length;
    const wageBill = this.households.reduce((sum, household) => sum + household.income, 0);
    const nominalOutput = this.priceLevel * this.realGdp;
    const loans = this.totalLoans();
    const deposits = this.totalDeposits();
    const categories = this.categoryPrices();
    const relativeHousing = categories.priceHousing / Math.max(this.priceLevel, 1);
    const realIncomes = this.households.map(
      (household) => household.income / Math.max(this.priceLevel, 1),
    );
    const typical = Math.max(median(realIncomes), 0.01);
    const securities = realIncomes.map((income) =>
      clamp(income / typical / (1 + relativeHousing), 0, 1),
    );
    const wellbeing = consumption.map(
      (value, index) =>
        Math.log(Math.max(value, 0.01)) + this.housingWeight * (securities[index] ?? 0),
    );
    const metrics = ctx.metrics;
    metrics.set('realGdp', this.realGdp);
    metrics.set('growth', this.growth());
    metrics.set('productivityPerHuman', employed > 0 ? this.realGdp / employed : 0);
    metrics.set('priceLevel', this.priceLevel);
    metrics.set('priceGeneral', categories.priceGeneral);
    for (const id of BASKET_METRICS) {
      metrics.set(id, categories[id]);
    }
    metrics.set('housingSecurity', mean(securities));
    metrics.set('inflation', this.inflation());
    metrics.set('interestRate', this.policyRate);
    const penalty = this.deflationPenalty();
    const reserves = this.banks.reduce((sum, bank) => sum + bank.reserves, 0);
    const savings = this.savingsStock();
    metrics.set('moneySupply', deposits);
    metrics.set('baseMoney', reserves);
    metrics.set('loanToSavings', savings > 0 ? loans / savings : 0);
    metrics.set('profitSharingShare', 0.15 + 0.7 * penalty);
    metrics.set('nonMortgageHousingShare', 0.25 + 0.6 * penalty);
    const years = this.tick / 12;
    const scarcity = (1 + this.prodGrowth) ** years / (1 + this.housingSupplyGrowth) ** years;
    metrics.set('propertyTurnover', (0.08 * (1 - penalty)) / Math.max(scarcity, 0.25));
    metrics.set(
      'velocity',
      deposits > 0 ? (this.consumptionSpend + this.investmentSpend) / deposits : 0,
    );
    metrics.set('creditToGdp', nominalOutput > 0 ? loans / (nominalOutput * 12) : 0);
    metrics.set('defaults', this.defaultsThisTick);
    metrics.set('bankFailures', this.cumulativeFailures);
    metrics.set('boomLength', this.boomLength);
    metrics.set('bustLength', this.bustLength);
    metrics.set('unemployment', unemployment);
    metrics.set('realWage', this.priceLevel > 0 ? this.wageLevel / this.priceLevel : 0);
    metrics.set('laborShare', nominalOutput > 0 ? wageBill / nominalOutput : 0);
    metrics.set('giniWealth', gini(wealth));
    metrics.set('giniIncome', gini(incomes));
    metrics.set('giniSkill', gini(skills));
    metrics.set('giniConsumption', gini(consumption));
    metrics.set('realInvestment', this.realInvestment);
    metrics.set('topDecileWealthShare', topShare(wealth, 0.1));
    metrics.set('bottomQuintileWealthShare', bottomShare(wealth, 0.2));
    metrics.set('meanRealWealth', this.priceLevel > 0 ? mean(wealth) / this.priceLevel : 0);
    metrics.set('medianRealWealth', this.priceLevel > 0 ? median(wealth) / this.priceLevel : 0);
    metrics.set('meanRealIncome', this.priceLevel > 0 ? mean(incomes) / this.priceLevel : 0);
    metrics.set('medianRealIncome', this.priceLevel > 0 ? median(incomes) / this.priceLevel : 0);
    metrics.set('meanRealConsumption', mean(consumption));
    metrics.set('medianRealConsumption', median(consumption));
    const floor = median(consumption) * 0.25;
    const below = consumption.filter((value) => value < floor).length / this.households.length;
    metrics.set('consumptionFloorShare', below);
    metrics.set('meanWellbeing', mean(wellbeing));
    metrics.set('medianWellbeing', median(wellbeing));
    const population = this.households.length + this.agents.length;
    metrics.set('aiShareOfAgents', population > 0 ? this.agents.length / population : 0);
    metrics.set('aiShareOfWealth', 0);
    const activity = this.consumptionSpend + this.agentVolume;
    metrics.set('aiShareOfTransactions', activity > 0 ? this.agentVolume / activity : 0);
    metrics.set('aiShareOfOutput', this.aiFactor > 1 ? 1 - 1 / this.aiFactor : 0);
    metrics.set('tasksAutomated', this.automatedShare);
    this.defaultsThisTick = 0;
  }

  private ensureOpen(ledger: Ledger): void {
    if (this.ready) {
      return;
    }
    this.ledger = ledger;
    for (const account of ACCOUNTS) {
      ledger.open(account.id, account.kind);
    }
    this.ready = true;
    this.postStocks(ledger);
  }

  private postStocks(ledger: Ledger): void {
    const deposits = this.totalDeposits();
    const loans = this.totalLoans();
    const reserves = this.banks.reduce((sum, bank) => sum + bank.reserves, 0);
    const bonds = this.banks.reduce((sum, bank) => sum + bank.bonds, 0);
    const vault = this.banks.reduce((sum, bank) => sum + bank.vault, 0);
    const equity = this.banks.reduce((sum, bank) => sum + bank.equity, 0);
    const targets = new Map<string, number>([
      ['deposits', deposits],
      ['bank-deposits', deposits],
      ['bank-loans', loans],
      ['borrower-loans', loans],
      ['reserves', reserves],
      ['cb-base', reserves],
      ['bonds', bonds],
      ['gov-bonds', bonds],
      ['vault', vault],
      ['bank-equity', equity],
      ['private-equity', this.privateEquity],
    ]);
    const lines: { accountId: string; side: EntrySide; amount: bigint | number }[] = [];
    for (const account of ACCOUNTS) {
      const raw = targets.get(account.id) ?? 0;
      const target = ledger.unit === 'cent' ? Math.round(raw) : raw;
      const current = Number(ledger.balance(account.id));
      const delta = target - current;
      if (delta === 0 || Math.abs(delta) < 1e-9) {
        continue;
      }
      const increase = delta > 0;
      const side: EntrySide =
        account.kind === 'asset' ? (increase ? 'debit' : 'credit') : increase ? 'credit' : 'debit';
      const amount = ledger.unit === 'cent' ? BigInt(Math.abs(Math.round(delta))) : Math.abs(delta);
      lines.push({ accountId: account.id, side, amount });
    }
    if (lines.length >= 2) {
      ledger.post(lines);
    }
  }

  private capitalizeBanks(): void {
    const deposits = this.totalDeposits();
    for (const bank of this.banks) {
      const equity = this.equityFor(this.loansAt(bank.id));
      bank.vault = equity;
      bank.equity = equity;
      bank.reserves = Math.round(this.reserveRequirement * (deposits / this.banks.length));
    }
    this.privateEquity = 0;
  }

  /** Equity held above the regulatory minimum so a credit boom has room to lend. */
  private equityFor(loans: number): number {
    const ratio = this.capitalRatio / Math.max(0.01, 1 - this.capitalRatio);
    return Math.max(1, Math.round(1.5 * ratio * Math.max(loans, 1)));
  }

  private loansAt(bankId: number): number {
    let total = 0;
    for (const firm of this.firms) {
      if (firm.bank === bankId) {
        total += firm.loan;
      }
    }
    return total;
  }

  private writeOffLoans(fraction: number): void {
    for (const firm of this.firms) {
      const loss = Math.round(firm.loan * fraction);
      if (loss <= 0) {
        continue;
      }
      firm.loan -= loss;
      const bank = this.banks[firm.bank];
      if (bank) {
        bank.equity -= loss;
      }
      this.privateEquity += loss;
      this.defaultsThisTick += loss;
    }
  }

  private lendingRoom(bank: Bank): number {
    const loans = this.loansAt(bank.id);
    const cap = bank.equity / Math.max(this.capitalRatio, 0.01);
    return Math.max(0, cap - loans) * (1 + Math.max(0, this.creditImpulse));
  }

  /** Move a slice of earned income to unemployed households without changing the total. */
  private redistributeToUnemployed(): void {
    const unemployed = this.households.filter((household) => household.employer < 0);
    const employed = this.households.filter((household) => household.employer >= 0);
    if (unemployed.length === 0 || employed.length === 0) {
      return;
    }
    const earned = employed.reduce((sum, household) => sum + household.income, 0);
    const pool = Math.min(earned, Math.round(0.05 * earned));
    let taken = 0;
    for (const household of employed) {
      const cut =
        earned > 0 ? Math.min(household.income, Math.round((pool * household.income) / earned)) : 0;
      const paid = Math.min(household.deposit, cut);
      household.deposit -= paid;
      household.income -= paid;
      taken += paid;
    }
    let left = taken;
    for (let index = 0; index < unemployed.length; index += 1) {
      const household = unemployed[index];
      if (!household) {
        continue;
      }
      const share = index === unemployed.length - 1 ? left : Math.floor(taken / unemployed.length);
      left -= share;
      household.deposit += share;
      household.income += share;
    }
  }

  /**
   * Pay wages from firm receipts, then distribute the residual as profit shares.
   * Ownership weights rise faster than skill, so wealth stays more unequal than income.
   */
  private distributeIncome(): void {
    const wagePaid = new Array<number>(this.households.length).fill(0);
    let profitPool = 0;
    for (const firm of this.firms) {
      const pays: { id: number; amount: number }[] = [];
      let owed = 0;
      for (const workerId of firm.workers) {
        const worker = this.households[workerId];
        if (!worker) {
          continue;
        }
        const amount = this.pay(worker, firm);
        owed += amount;
        pays.push({ id: workerId, amount });
      }
      const available = Math.max(0, Math.round(firm.deposit));
      const wageBudget = Math.min(available, owed);
      let spent = 0;
      if (owed > 0 && wageBudget > 0) {
        for (let index = 0; index < pays.length; index += 1) {
          const item = pays[index];
          if (!item) {
            continue;
          }
          const share =
            index === pays.length - 1
              ? wageBudget - spent
              : Math.min(wageBudget - spent, Math.round((wageBudget * item.amount) / owed));
          wagePaid[item.id] = (wagePaid[item.id] ?? 0) + share;
          spent += share;
        }
      }
      profitPool += available - spent;
      firm.deposit -= available;
    }
    const concentration = 1.5 + (this.aiFactor > 1 ? this.ownership * (this.aiFactor - 1) : 0);
    const weights = this.households.map((household) => household.skill ** concentration);
    let weightSum = 0;
    for (const weight of weights) {
      weightSum += weight;
    }
    let left = profitPool;
    for (let index = 0; index < this.households.length; index += 1) {
      const household = this.households[index];
      if (!household) {
        continue;
      }
      const weight = weights[index] ?? 0;
      const share =
        index === this.households.length - 1 || weightSum <= 0
          ? left
          : Math.min(left, Math.round((profitPool * weight) / weightSum));
      left -= share;
      const wages = wagePaid[index] ?? 0;
      household.deposit += wages + share;
      household.income = wages + share;
    }
  }

  private capacity(firm: Firm): number {
    const labor = firm.workers.length;
    if (labor === 0 || firm.capital <= 0) {
      return 0;
    }
    return (
      firm.productivity *
      this.productivity *
      (1 + this.productivityImpulse) *
      firm.capital ** this.alpha *
      labor ** (1 - this.alpha) *
      this.aiFactor
    );
  }

  private replaceFirm(firm: Firm): void {
    this.defaultsThisTick += firm.loan;
    const bank = this.banks[firm.bank];
    if (bank) {
      bank.equity -= firm.loan;
    }
    this.privateEquity += firm.loan;
    for (const workerId of firm.workers) {
      const worker = this.households[workerId];
      if (worker) {
        worker.employer = -1;
      }
    }
    firm.workers = [];
    firm.loan = 0;
    firm.deposit = INITIAL_WAGE;
    firm.capital = 1;
    firm.inventory = 1;
    firm.price = this.priceLevel;
    firm.negTicks = 0;
    firm.productivity = 1;
  }

  private trackCreditCycle(): void {
    const credit = this.totalLoans();
    this.creditHistory.push(credit);
    if (!this.sawBoom && this.creditHistory.length > 30) {
      const recent = this.creditHistory.slice(-24);
      const start = recent[0] ?? credit;
      const mid = recent[11] ?? credit;
      const end = recent[recent.length - 1] ?? credit;
      if (mid > start * 1.02 && end < mid) {
        this.sawBoom = true;
        this.boomLength = SHOCK_PHASE_MONTHS;
        this.bustLength = SHOCK_PHASE_MONTHS;
      }
    }
  }

  private separate(household: Household): void {
    const firm = this.firms[household.employer];
    if (firm) {
      firm.workers = firm.workers.filter((id) => id !== household.id);
    }
    household.employer = -1;
  }

  private employ(count: number): void {
    let hired = 0;
    for (const household of this.households) {
      if (hired >= count) {
        break;
      }
      const firm = this.firms[hired % this.firms.length];
      if (!firm) {
        break;
      }
      firm.workers.push(household.id);
      household.employer = firm.id;
      hired += 1;
    }
  }

  private employedCount(): number {
    return this.households.reduce((sum, household) => sum + (household.employer >= 0 ? 1 : 0), 0);
  }

  private totalDeposits(): number {
    let total = this.govDeposits;
    for (const household of this.households) {
      total += household.deposit;
    }
    for (const firm of this.firms) {
      total += firm.deposit;
    }
    for (const agent of this.agents) {
      total += agent.deposit;
    }
    return total;
  }

  private totalLoans(): number {
    let total = 0;
    for (const household of this.households) {
      total += household.loan;
    }
    for (const firm of this.firms) {
      total += firm.loan;
    }
    return total;
  }

  private pay(household: Household, firm: Firm): number {
    return Math.max(1, Math.round(firm.wage * household.skill));
  }

  /** The goods market clears one basket. Category prices are an accounting split of the CPI. */
  private categoryPrices(): ReturnType<typeof splitBasket> {
    return splitBasket({
      cpi: this.priceLevel,
      years: this.tick / 12,
      baselineGrowth: this.prodGrowth,
      productivity: this.categoryGrowth,
      housingSupplyGrowth: this.housingSupplyGrowth,
      deflationPenalty: this.deflationPenalty(),
    });
  }

  private priceTrend(): number {
    return this.regime === 'fiat'
      ? monthlyFromAnnual(this.inflationTarget)
      : monthlyFromAnnual(-this.prodGrowth);
  }

  private deflationPenalty(): number {
    if (this.deflationSensitivity === 0) {
      return 0;
    }
    return clamp(this.deflationSensitivity * Math.max(0, -this.inflation()), 0, 0.9);
  }

  private savingsStock(): number {
    const fraction = this.lendingModel === 'fullReserve' ? 0.1 : 0.25;
    let total = 0;
    for (const household of this.households) {
      total += Math.max(0, household.deposit) * fraction;
    }
    return total;
  }

  private savingsRoom(): number {
    return Math.max(0, this.savingsStock() - this.totalLoans());
  }

  private inflation(): number {
    const last = this.priceHistory[this.priceHistory.length - 1] ?? this.priceLevel;
    const prev = this.priceHistory[this.priceHistory.length - 13] ?? last;
    if (prev <= 0) {
      return this.inflationTarget;
    }
    return last / prev - 1;
  }

  private growth(): number {
    const last = this.gdpHistory[this.gdpHistory.length - 1] ?? 0;
    const prev = this.gdpHistory[this.gdpHistory.length - 13] ?? last;
    if (prev <= 0) {
      return 0;
    }
    return last / prev - 1;
  }
}

const ACCOUNTS: { id: string; kind: 'asset' | 'liability' | 'equity' }[] = [
  { id: 'deposits', kind: 'asset' },
  { id: 'bank-deposits', kind: 'liability' },
  { id: 'bank-loans', kind: 'asset' },
  { id: 'borrower-loans', kind: 'liability' },
  { id: 'reserves', kind: 'asset' },
  { id: 'cb-base', kind: 'liability' },
  { id: 'bonds', kind: 'asset' },
  { id: 'gov-bonds', kind: 'liability' },
  { id: 'vault', kind: 'asset' },
  { id: 'bank-equity', kind: 'equity' },
  { id: 'private-equity', kind: 'equity' },
];

function regimeOf(config: ResolvedConfig): 'fiat' | 'bitcoin' | 'hybrid' {
  const value = config.sliders['regime.type'];
  if (value === 'fiat' || value === 'bitcoin' || value === 'hybrid') {
    return value;
  }
  throw new Error('regime.type must be fiat, bitcoin, or hybrid');
}

function lendingModelOf(config: ResolvedConfig): 'maturityMatched' | 'fullReserve' {
  const value = config.sliders['bitcoin.lendingModel'];
  if (value === 'maturityMatched' || value === 'fullReserve') {
    return value;
  }
  throw new Error('bitcoin.lendingModel must be maturityMatched or fullReserve');
}

function slider(config: ResolvedConfig, id: string): number {
  const value = config.sliders[id];
  if (typeof value !== 'number') {
    throw new Error(`${id} must be a number`);
  }
  return value;
}
