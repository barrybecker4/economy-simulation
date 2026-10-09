import type { MetricId } from '../../../core/src/metrics/metrics.js';

export interface ChartLineSpec {
  id: MetricId;
  label: string;
  color: string;
  /** When set, a pinned comparison captions this series as an improvement or worse. */
  better?: 'higher' | 'lower';
}

export interface ChartPanel {
  key: string;
  title: string;
  group: string;
  unit: 'money' | 'share' | 'log' | 'output' | 'count' | 'index' | 'months';
  description: string;
  lines: readonly ChartLineSpec[];
}

export interface FlowEdgeSpec {
  id: MetricId;
  from: string;
  to: string;
  label: string;
  color: string;
}

export interface CensusSliceSpec {
  id: MetricId;
  label: string;
  color: string;
}

/** Chart panels in display order. Line label and color live here. */
export const CHART_PANELS: readonly ChartPanel[] = [
  {
    key: 'wellbeing',
    title: 'Well-being',
    group: 'Welfare',
    unit: 'log',
    description:
      'Mean and median human well-being. For each household the level is the natural log of real consumption, floored at 0.01, plus 0.5 times housing security. Security is real income relative to the median, divided by one plus the housing price relative to the CPI, and kept between 0 and 1. AI agents are not included. More than one seed draws the median.',
    lines: [
      { id: 'meanWellbeing', label: 'Mean well-being', color: '#0b6', better: 'higher' },
      { id: 'medianWellbeing', label: 'Median well-being', color: '#064', better: 'higher' },
    ],
  },
  {
    key: 'prices',
    title: 'Prices',
    group: 'Prices',
    unit: 'money',
    description:
      'CPI is the expenditure-weighted basket. Food and beverages, housing, energy, apparel, transportation, medical care, education, recreation, and electronics can move apart from it. More than one seed draws each median.',
    lines: [
      { id: 'priceLevel', label: 'CPI', color: '#1e3a8a' },
      { id: 'priceFood', label: 'Food and bev', color: '#9a3412' },
      { id: 'priceHousing', label: 'Housing', color: '#a16207' },
      { id: 'priceEnergy', label: 'Energy', color: '#c2410c' },
      { id: 'priceApparel', label: 'Apparel', color: '#7e22ce' },
      { id: 'priceTransportation', label: 'Transportation', color: '#0f766e' },
      { id: 'priceMedical', label: 'Medical', color: '#be123c' },
      { id: 'priceEducation', label: 'Education', color: '#0369a1' },
      { id: 'priceRecreation', label: 'Recreation', color: '#4d7c0f' },
      { id: 'priceElectronics', label: 'Electronics', color: '#db2777' },
    ],
  },
  {
    key: 'labor',
    title: 'Labor and interest',
    group: 'Labor',
    unit: 'share',
    description:
      'Unemployment is the share of households without a job. Natural unemployment rises as AI shrinks the hiring target. The policy rate is the annual interest rate: under fiat it follows inflation and the gap from that natural rate, scaled by the human share of output, and under bitcoin or hybrid it moves with the gap between loans and savings. More than one seed draws each median.',
    lines: [
      { id: 'unemployment', label: 'Unemployment', color: '#b45309', better: 'lower' },
      { id: 'naturalUnemployment', label: 'Natural unemployment', color: '#92400e' },
      { id: 'interestRate', label: 'Policy rate', color: '#1d4ed8' },
    ],
  },
  {
    key: 'earnings',
    title: 'Who earns the output',
    group: 'Labor',
    unit: 'share',
    description:
      'Labor share is the wage bill over nominal GDP. Capital share is profits over wages plus profits. More than one seed draws each median.',
    lines: [
      { id: 'laborShare', label: 'Labor share', color: '#0f766e' },
      { id: 'capitalShare', label: 'Capital share', color: '#7c3aed' },
    ],
  },
  {
    key: 'ubi',
    title: 'Household grant',
    group: 'Public accounts',
    unit: 'money',
    description:
      'Monthly UBI outlay. The pool is the UBI share slider times the AI share of output times nominal GDP, split equally across households. It starts at zero when AI capacity is not adopted.',
    lines: [{ id: 'ubiOutlay', label: 'UBI outlay', color: '#047857' }],
  },
  {
    key: 'tax',
    title: 'Tax revenue',
    group: 'Public accounts',
    unit: 'money',
    description:
      'Income tax collected from households and from AI agents. More than one seed draws each median.',
    lines: [
      { id: 'taxRevenue', label: 'Total tax', color: '#0f766e' },
      { id: 'agentTaxRevenue', label: 'Agent tax', color: '#a21caf' },
    ],
  },
  {
    key: 'credit',
    title: 'Credit to GDP',
    group: 'Credit',
    unit: 'share',
    description:
      "Private credit relative to annualized nominal GDP: firm and household loans divided by twelve times this month's nominal output. Consumer credit is household consumer loans alone over the same output. Government bonds are not in these ratios. More than one seed draws each median.",
    lines: [
      { id: 'creditToGdp', label: 'Credit to GDP', color: '#7c3aed' },
      { id: 'consumerCreditToGdp', label: 'Consumer credit to GDP', color: '#c2410c' },
    ],
  },
  {
    key: 'defaults',
    title: 'Defaults',
    group: 'Credit',
    unit: 'money',
    description:
      'Loan balances written off that month from failed firms and foreclosed mortgages. More than one seed draws the median.',
    lines: [{ id: 'defaults', label: 'Defaults', color: '#be123c', better: 'lower' }],
  },
  {
    key: 'bank-failures',
    title: 'Bank failures',
    group: 'Credit',
    unit: 'count',
    description:
      'Running count of insolvent banks that were resolved. More than one seed draws the median.',
    lines: [{ id: 'bankFailures', label: 'Bank failures', color: '#7c2d12', better: 'lower' }],
  },
  {
    key: 'consumer-borrowing',
    title: 'New consumer borrowing',
    group: 'Credit',
    unit: 'money',
    description:
      'New household consumer loans that month. Stays at zero until Housing tenure choice is on. More than one seed draws the median.',
    lines: [{ id: 'newConsumerBorrowing', label: 'New consumer loans', color: '#a16207' }],
  },
  {
    key: 'ai',
    title: 'AI',
    group: 'AI',
    unit: 'share',
    description:
      'Tasks automated is the share of tasks software can do. AI agents is autonomous agents divided by households plus agents. AI share of output is the fraction of capacity from the AI multiplier. AI wealth is agent deposits over household plus agent deposits. AI transactions is agent compute sales plus agent goods over household goods plus compute sales. With equal start and end automatable shares that share stays at zero. More than one seed draws each median.',
    lines: [
      { id: 'tasksAutomated', label: 'Tasks automated', color: '#0f766e' },
      { id: 'aiShareOfAgents', label: 'AI agents', color: '#a21caf' },
      { id: 'aiShareOfOutput', label: 'AI share of output', color: '#c2410c' },
      { id: 'aiShareOfWealth', label: 'AI wealth', color: '#1d4ed8' },
      { id: 'aiShareOfTransactions', label: 'AI transactions', color: '#a16207' },
    ],
  },
  {
    key: 'ai-spend',
    title: 'AI goods spend',
    group: 'AI',
    unit: 'money',
    description:
      'Goods bought by autonomous AI agents that month. More than one seed draws the median.',
    lines: [{ id: 'agentGoodsSpend', label: 'Agent goods', color: '#be123c' }],
  },
  {
    key: 'output',
    title: 'Output',
    group: 'Output',
    unit: 'output',
    description:
      'Real GDP is the sum of firm capacities. Productivity per human is real GDP divided by employed households. Real investment is capital gaps installed that month. More than one seed draws each median.',
    lines: [
      { id: 'realGdp', label: 'Real GDP', color: '#1e3a8a', better: 'higher' },
      {
        id: 'productivityPerHuman',
        label: 'Productivity per human',
        color: '#0f766e',
        better: 'higher',
      },
      { id: 'realInvestment', label: 'Real investment', color: '#a16207' },
    ],
  },
  {
    key: 'growth',
    title: 'Growth',
    group: 'Output',
    unit: 'share',
    description:
      'Twelve-month change in real GDP: this month over the same month a year earlier, minus one. Stays at zero until a year of history exists. More than one seed draws the median.',
    lines: [{ id: 'growth', label: 'Real GDP growth', color: '#1e3a8a', better: 'higher' }],
  },
  {
    key: 'living',
    title: 'Living standards',
    group: 'Living standards',
    unit: 'money',
    description:
      'Real wage is the money wage divided by CPI. Mean and median real income and real consumption use households only. More than one seed draws each median.',
    lines: [
      { id: 'realWage', label: 'Real wage', color: '#1d4ed8', better: 'higher' },
      { id: 'meanRealIncome', label: 'Mean real income', color: '#0f766e', better: 'higher' },
      { id: 'medianRealIncome', label: 'Median real income', color: '#065f46', better: 'higher' },
      {
        id: 'meanRealConsumption',
        label: 'Mean real consumption',
        color: '#9a3412',
        better: 'higher',
      },
      {
        id: 'medianRealConsumption',
        label: 'Median real consumption',
        color: '#7c2d12',
        better: 'higher',
      },
    ],
  },
  {
    key: 'tenure',
    title: 'Housing tenure',
    group: 'Living standards',
    unit: 'share',
    description:
      'Share of households renting, buying with a mortgage, or owning outright. The share who own is mortgage plus owned outright. All three stay at zero until Housing tenure choice is on. With that switch on, the run opens near a 65.5 percent owner share. More than one seed draws each median.',
    lines: [
      { id: 'rentShare', label: 'Renting', color: '#0369a1' },
      { id: 'mortgageShare', label: 'Mortgage', color: '#7c3aed' },
      { id: 'ownedShare', label: 'Owned outright', color: '#0f766e' },
    ],
  },
  {
    key: 'tenure-moves',
    title: 'Housing moves',
    group: 'Living standards',
    unit: 'count',
    description:
      'Households who switched tenure that month: new mortgages, rent to mortgage, mortgage to owned outright, and mortgage to rent. All stay at zero until Housing tenure choice is on. More than one seed draws each median.',
    lines: [
      { id: 'mortgageOriginations', label: 'Originations', color: '#7c3aed' },
      { id: 'rentToMortgage', label: 'Rent to mortgage', color: '#0369a1' },
      { id: 'mortgageToOwned', label: 'Mortgage to owned', color: '#0f766e' },
      { id: 'mortgageToRent', label: 'Mortgage to rent', color: '#be123c' },
    ],
  },
  {
    key: 'housing-pressure',
    title: 'Housing pressure',
    group: 'Living standards',
    unit: 'share',
    description:
      'Property turnover is tenure changes that month divided by households. Median debt service is the median of mortgage payment plus the consumer-loan installment, over income. Debt service stays at zero until Housing tenure choice is on. More than one seed draws each median.',
    lines: [
      { id: 'propertyTurnover', label: 'Property turnover', color: '#a16207' },
      { id: 'medianDebtService', label: 'Median debt service', color: '#be123c', better: 'lower' },
    ],
  },
  {
    key: 'home-price',
    title: 'Home price',
    group: 'Living standards',
    unit: 'months',
    description:
      'Purchase price of a home in months of household income. The baseline is 48 months. Housing market clearing multiplies by scarcity, and Housing monetary premium multiplies by one minus the premium share when the regime price path does not inflate. More than one seed draws the median.',
    lines: [{ id: 'homePriceMonths', label: 'Home price', color: '#a16207' }],
  },
  {
    key: 'inequality',
    title: 'Inequality',
    group: 'Inequality',
    unit: 'share',
    description:
      'Gini of household wealth, income, and consumption. Top-decile and bottom-quintile wealth shares, and the share of households below one quarter of median real consumption. More than one seed draws each median.',
    lines: [
      { id: 'giniWealth', label: 'Wealth Gini', color: '#7c3aed', better: 'lower' },
      { id: 'giniIncome', label: 'Income Gini', color: '#1d4ed8', better: 'lower' },
      { id: 'giniConsumption', label: 'Consumption Gini', color: '#0f766e', better: 'lower' },
      { id: 'topDecileWealthShare', label: 'Top decile wealth', color: '#be123c', better: 'lower' },
      {
        id: 'bottomQuintileWealthShare',
        label: 'Bottom quintile wealth',
        color: '#a16207',
        better: 'higher',
      },
      {
        id: 'consumptionFloorShare',
        label: 'Consumption floor',
        color: '#57534e',
        better: 'lower',
      },
    ],
  },
  {
    key: 'total-wealth',
    title: 'Total wealth',
    group: 'Inequality',
    unit: 'money',
    description:
      'Sum of household wealth divided by CPI — the stock the wealth-by-fifth shares divide. Cash and capital claims partition that stock: cash is deposits (and bitcoin valued at the exchange rate), and claims are equity claims on firm capital when the equity market is on. Negative holdings count as zero. Agent deposits are not included. For the output pie that grows like historical real GDP, see the Output chart. More than one seed draws the median.',
    lines: [
      { id: 'totalRealWealth', label: 'Total real wealth', color: '#9f1239', better: 'higher' },
      { id: 'realCashWealth', label: 'Cash wealth', color: '#1d4ed8' },
      { id: 'realClaimWealth', label: 'Capital claims', color: '#0f766e' },
    ],
  },
  {
    key: 'typical-wealth',
    title: 'Typical wealth',
    group: 'Inequality',
    unit: 'money',
    description:
      'Mean and median household wealth divided by CPI. Households only; agent deposits are not included. More than one seed draws each median.',
    lines: [
      { id: 'meanRealWealth', label: 'Mean real wealth', color: '#9f1239', better: 'higher' },
      { id: 'medianRealWealth', label: 'Median real wealth', color: '#be123c', better: 'higher' },
    ],
  },
  {
    key: 'turnover',
    title: 'Inflation and turnover',
    group: 'Money',
    unit: 'share',
    description:
      'Twelve-month CPI inflation, velocity of deposits through consumption and investment, and loans relative to the savings stock. More than one seed draws each median.',
    lines: [
      { id: 'inflation', label: 'Inflation', color: '#be123c' },
      { id: 'velocity', label: 'Velocity', color: '#1d4ed8' },
      { id: 'loanToSavings', label: 'Loans to savings', color: '#7c3aed' },
    ],
  },
  {
    key: 'money',
    title: 'Money stocks',
    group: 'Money',
    unit: 'money',
    description:
      'Money supply is household, firm, agent, and government deposits. Base money is bank reserves. More than one seed draws each median.',
    lines: [
      { id: 'moneySupply', label: 'Money supply', color: '#1e3a8a' },
      { id: 'baseMoney', label: 'Base money', color: '#0f766e' },
    ],
  },
  {
    key: 'money-mix',
    title: 'Money mix',
    group: 'Money',
    unit: 'share',
    description:
      'Shares of money balances in fiat, bitcoin, stablecoin, and CBDC. They sum to one. On a fiat default the last three stay at zero. More than one seed draws each median.',
    lines: [
      { id: 'fiatShare', label: 'Fiat', color: '#1e3a8a' },
      { id: 'bitcoinShare', label: 'Bitcoin', color: '#a16207' },
      { id: 'stablecoinShare', label: 'Stablecoin', color: '#0f766e' },
      { id: 'cbdcShare', label: 'CBDC', color: '#7c3aed' },
    ],
  },
  {
    key: 'bitcoin-price',
    title: 'Bitcoin exchange rate',
    group: 'Money',
    unit: 'index',
    description:
      'Bitcoin exchange rate against the goods unit. Opens at 1 and stays between 0.05 and 20. Moves with the bitcoin money share and issuance when monetary choice or the market-price weight is on. More than one seed draws the median.',
    lines: [{ id: 'bitcoinPrice', label: 'Bitcoin price', color: '#a16207' }],
  },
  {
    key: 'shocks',
    title: 'Shocks',
    group: 'Shocks',
    unit: 'share',
    description:
      'Demand, credit, and productivity impulses. A positive spell is the twelve-month expansion; a negative spell is the contraction. Zero when no shock is active. One seed draws that impulse. More than one seed draws the mean absolute impulse, so a larger shock counts more than a smaller one.',
    lines: [
      { id: 'demandImpulse', label: 'Demand', color: '#b45309' },
      { id: 'creditImpulse', label: 'Credit', color: '#7c3aed' },
      { id: 'productivityImpulse', label: 'Productivity', color: '#0f766e' },
    ],
  },
  {
    key: 'cycle',
    title: 'Boom and bust',
    group: 'Shocks',
    unit: 'count',
    description:
      'After the first 24-month credit window that rises at least 2 percent and then falls, boom length and bust length jump to 12 and stay there. They are not a running clock. More than one seed draws each median.',
    lines: [
      { id: 'boomLength', label: 'Boom length', color: '#0f766e' },
      { id: 'bustLength', label: 'Bust length', color: '#be123c' },
    ],
  },
  {
    key: 'flows',
    title: 'Monthly payment flows',
    group: 'This month',
    unit: 'money',
    description:
      'Who paid whom that month: household and agent goods, government purchases, wages, profits, tax, the household grant, AI compute sales and fees, sweeps to owners, interest, new loans, and loan repayment. More than one seed draws each median.',
    lines: [
      { id: 'householdGoodsSpend', label: 'Household goods', color: '#1e3a8a' },
      { id: 'agentGoodsSpend', label: 'Agent goods', color: '#be123c' },
      { id: 'govGoodsSpend', label: 'Government goods', color: '#0f766e' },
      { id: 'wageBill', label: 'Wages', color: '#a16207' },
      { id: 'profitPaid', label: 'Profits', color: '#7c3aed' },
      { id: 'taxRevenue', label: 'Tax', color: '#0369a1' },
      { id: 'ubiOutlay', label: 'Grant', color: '#047857' },
      { id: 'agentVolume', label: 'Compute sales', color: '#a21caf' },
      { id: 'agentFees', label: 'Agent fees', color: '#9a3412' },
      { id: 'agentSweep', label: 'Owner sweep', color: '#4d7c0f' },
      { id: 'interestPaid', label: 'Interest', color: '#1d4ed8' },
      { id: 'newBorrowing', label: 'New loans', color: '#c2410c' },
      { id: 'loanRepaid', label: 'Loan repayment', color: '#57534e' },
    ],
  },
];

/** Payment edges for the month picture. A series may use a different label than its chart line. */
export const FLOW_EDGES: readonly FlowEdgeSpec[] = [
  { id: 'householdGoodsSpend', from: 'households', to: 'firms', label: 'Goods', color: '#1e3a8a' },
  { id: 'agentGoodsSpend', from: 'agents', to: 'firms', label: 'Goods', color: '#be123c' },
  { id: 'govGoodsSpend', from: 'government', to: 'firms', label: 'Purchases', color: '#0f766e' },
  { id: 'wageBill', from: 'firms', to: 'households', label: 'Wages', color: '#a16207' },
  { id: 'profitPaid', from: 'firms', to: 'households', label: 'Profits', color: '#7c3aed' },
  { id: 'taxRevenue', from: 'households', to: 'government', label: 'Tax', color: '#0369a1' },
  { id: 'agentTaxRevenue', from: 'agents', to: 'government', label: 'Tax', color: '#a21caf' },
  { id: 'ubiOutlay', from: 'government', to: 'households', label: 'Grant', color: '#047857' },
  { id: 'agentVolume', from: 'firms', to: 'agents', label: 'Compute', color: '#c2410c' },
  { id: 'agentSweep', from: 'agents', to: 'households', label: 'Sweep', color: '#4d7c0f' },
  { id: 'agentFees', from: 'agents', to: 'banks', label: 'Fees', color: '#9a3412' },
  { id: 'interestPaid', from: 'firms', to: 'banks', label: 'Interest', color: '#1d4ed8' },
  { id: 'loanRepaid', from: 'firms', to: 'banks', label: 'Repayment', color: '#57534e' },
  { id: 'newBorrowing', from: 'banks', to: 'firms', label: 'Loans', color: '#c2410c' },
];

export const CENSUS_WEALTH: readonly CensusSliceSpec[] = [
  { id: 'wealthQuintile1', label: 'Poorest fifth', color: '#fecaca' },
  { id: 'wealthQuintile2', label: 'Second fifth', color: '#fca5a5' },
  { id: 'wealthQuintile3', label: 'Middle fifth', color: '#f87171' },
  { id: 'wealthQuintile4', label: 'Fourth fifth', color: '#ef4444' },
  { id: 'wealthQuintile5', label: 'Richest fifth', color: '#b91c1c' },
];

export const CENSUS_JOBS: readonly CensusSliceSpec[] = [
  { id: 'jobUnemployedShare', label: 'Unemployed', color: '#a8a29e' },
  { id: 'jobSmallFirmShare', label: 'Smaller firms', color: '#38bdf8' },
  { id: 'jobLargeFirmShare', label: 'Larger firms', color: '#0369a1' },
];

export const CENSUS_OWNERS = {
  ownerWealthShare: 'ownerWealthShare',
  aiShareOfWealth: 'aiShareOfWealth',
  aiShareOfAgents: 'aiShareOfAgents',
} as const satisfies Record<string, MetricId>;

/** Metric ids the worker copies. Charts, flows, and census read only these. */
export function dashboardMetricIds(): readonly MetricId[] {
  const ids: MetricId[] = [];
  const seen = new Set<string>();
  const add = (id: MetricId): void => {
    if (seen.has(id)) {
      return;
    }
    seen.add(id);
    ids.push(id);
  };
  for (const panel of CHART_PANELS) {
    for (const line of panel.lines) {
      add(line.id);
    }
  }
  for (const edge of FLOW_EDGES) {
    add(edge.id);
  }
  for (const slice of CENSUS_WEALTH) {
    add(slice.id);
  }
  for (const slice of CENSUS_JOBS) {
    add(slice.id);
  }
  for (const id of Object.values(CENSUS_OWNERS)) {
    add(id);
  }
  return ids;
}
