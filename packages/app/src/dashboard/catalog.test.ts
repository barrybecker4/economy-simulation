import { describe, expect, it } from 'vitest';
import { CHART_METRICS } from '../worker/series.js';
import {
  CENSUS_JOBS,
  CENSUS_OWNERS,
  CENSUS_WEALTH,
  CHART_PANELS,
  dashboardMetricIds,
  FLOW_EDGES,
} from './catalog.js';

/** Series the worker copied before the catalog became the only list. */
const PREVIOUS_WORKER_SERIES = [
  'meanWellbeing',
  'medianWellbeing',
  'priceLevel',
  'priceFood',
  'priceHousing',
  'priceEnergy',
  'priceApparel',
  'priceTransportation',
  'priceMedical',
  'priceEducation',
  'priceRecreation',
  'priceElectronics',
  'unemployment',
  'naturalUnemployment',
  'interestRate',
  'creditToGdp',
  'ubiOutlay',
  'tasksAutomated',
  'aiShareOfAgents',
  'aiShareOfOutput',
  'aiShareOfWealth',
  'aiShareOfTransactions',
  'agentGoodsSpend',
  'giniWealth',
  'giniIncome',
  'giniConsumption',
  'topDecileWealthShare',
  'bottomQuintileWealthShare',
  'consumptionFloorShare',
  'realGdp',
  'productivityPerHuman',
  'realInvestment',
  'realWage',
  'meanRealIncome',
  'medianRealIncome',
  'meanRealConsumption',
  'medianRealConsumption',
  'inflation',
  'velocity',
  'loanToSavings',
  'moneySupply',
  'baseMoney',
  'taxRevenue',
  'agentTaxRevenue',
  'wageBill',
  'profitPaid',
  'householdGoodsSpend',
  'govGoodsSpend',
  'agentVolume',
  'agentFees',
  'agentSweep',
  'interestPaid',
  'newBorrowing',
  'loanRepaid',
  'demandImpulse',
  'creditImpulse',
  'productivityImpulse',
  'wealthQuintile1',
  'wealthQuintile2',
  'wealthQuintile3',
  'wealthQuintile4',
  'wealthQuintile5',
  'jobUnemployedShare',
  'jobSmallFirmShare',
  'jobLargeFirmShare',
  'ownerWealthShare',
  'totalRealWealth',
];

describe('dashboard catalog', () => {
  it('sends each chart, flow, and census series once', () => {
    const declared = [
      ...CHART_PANELS.flatMap((panel) => panel.lines.map((line) => line.id)),
      ...FLOW_EDGES.map((edge) => edge.id),
      ...CENSUS_WEALTH.map((slice) => slice.id),
      ...CENSUS_JOBS.map((slice) => slice.id),
      ...Object.values(CENSUS_OWNERS),
    ];
    const sent = dashboardMetricIds();
    expect(sent).toEqual(CHART_METRICS);
    expect(new Set(sent)).toEqual(new Set(declared));
    expect(sent).toHaveLength(new Set(sent).size);
  });

  it('matches the series the worker copied before this catalog', () => {
    expect([...CHART_METRICS].sort()).toEqual([...PREVIOUS_WORKER_SERIES].sort());
    expect(CHART_METRICS).not.toContain('priceGeneral');
  });
});
