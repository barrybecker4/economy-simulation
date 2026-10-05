export const METRIC_IDS = [
  'realGdp',
  'growth',
  'productivityPerHuman',
  'priceLevel',
  'priceGeneral',
  'priceFood',
  'priceHousing',
  'priceEnergy',
  'priceApparel',
  'priceTransportation',
  'priceMedical',
  'priceEducation',
  'priceRecreation',
  'priceElectronics',
  'housingSecurity',
  'inflation',
  'interestRate',
  'moneySupply',
  'baseMoney',
  'loanToSavings',
  'profitSharingShare',
  'nonMortgageHousingShare',
  'propertyTurnover',
  'mortgageShare',
  'rentShare',
  'ownedShare',
  'consumerCreditToGdp',
  'newConsumerBorrowing',
  'medianDebtService',
  'velocity',
  'creditToGdp',
  'defaults',
  'bankFailures',
  'boomLength',
  'bustLength',
  'unemployment',
  'naturalUnemployment',
  'realWage',
  'laborShare',
  'taxRevenue',
  'agentTaxRevenue',
  'ubiOutlay',
  'wageBill',
  'profitPaid',
  'householdGoodsSpend',
  'govGoodsSpend',
  'agentGoodsSpend',
  'agentVolume',
  'agentFees',
  'agentSweep',
  'interestPaid',
  'newBorrowing',
  'loanRepaid',
  'demandImpulse',
  'creditImpulse',
  'productivityImpulse',
  'giniWealth',
  'giniIncome',
  'giniSkill',
  'giniConsumption',
  'realInvestment',
  'topDecileWealthShare',
  'bottomQuintileWealthShare',
  'wealthQuintile1',
  'wealthQuintile2',
  'wealthQuintile3',
  'wealthQuintile4',
  'wealthQuintile5',
  'jobUnemployedShare',
  'jobSmallFirmShare',
  'jobLargeFirmShare',
  'ownerWealthShare',
  'meanRealWealth',
  'medianRealWealth',
  'meanRealIncome',
  'medianRealIncome',
  'meanRealConsumption',
  'medianRealConsumption',
  'consumptionFloorShare',
  'meanWellbeing',
  'medianWellbeing',
  'aiShareOfAgents',
  'aiShareOfWealth',
  'aiShareOfOutput',
  'aiShareOfTransactions',
  'tasksAutomated',
  'auditOk',
] as const;

export type MetricId = (typeof METRIC_IDS)[number];

const METRIC_ID_SET = new Set<string>(METRIC_IDS);

export interface MetricsTable {
  ticks: number[];
  series: Record<MetricId, Array<number | null>>;
}

export class MetricsRecorder {
  private readonly ticks: number[] = [];
  private readonly series: Record<MetricId, Array<number | null>>;
  private readonly pending = new Map<MetricId, number>();

  constructor() {
    const series = {} as Record<MetricId, Array<number | null>>;
    for (const id of METRIC_IDS) {
      series[id] = [];
    }
    this.series = series;
  }

  set(id: MetricId, value: number): void {
    if (!METRIC_ID_SET.has(id)) {
      throw new Error(`Unknown metric ${id}`);
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Metric ${id} must be a finite number`);
    }
    this.pending.set(id, value);
  }

  commitTick(tick: number): void {
    this.ticks.push(tick);
    for (const id of METRIC_IDS) {
      const value = this.pending.get(id);
      this.series[id].push(value === undefined ? null : value);
    }
    this.pending.clear();
  }

  snapshot(): MetricsTable {
    const series = {} as Record<MetricId, Array<number | null>>;
    for (const id of METRIC_IDS) {
      series[id] = this.series[id].slice();
    }
    return { ticks: this.ticks.slice(), series };
  }
}

export function metricsToCsv(table: MetricsTable): string {
  const lines = [`tick,${METRIC_IDS.join(',')}`];
  for (let row = 0; row < table.ticks.length; row += 1) {
    const tick = table.ticks[row];
    if (tick === undefined) {
      throw new Error('Missing tick index');
    }
    const cells = [String(tick)];
    for (const id of METRIC_IDS) {
      const value = table.series[id][row];
      cells.push(value === null || value === undefined ? '' : formatCsvNumber(value));
    }
    lines.push(cells.join(','));
  }
  return `${lines.join('\n')}\n`;
}

function formatCsvNumber(value: number): string {
  if (Object.is(value, -0)) {
    return '0';
  }
  return value.toExponential(12);
}
