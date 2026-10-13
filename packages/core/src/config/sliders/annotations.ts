import type { Slider } from '../builders.js';

export const ANNOTATIONS: Record<string, Pick<Slider, 'status' | 'source'>> = {
  'centralBank.inflationTarget': {
    status: 'sourced',
    source:
      'A 2 percent annual target is the stated goal of many inflation-targeting central banks.',
  },
  'bank.capitalRatio': {
    status: 'sourced',
    source:
      'The default of 0.06 sits below the Basel III common-equity headline because this model applies the ratio to every loan rather than to risk-weighted assets.',
  },
  'production.alpha': {
    status: 'sourced',
    source: 'A capital elasticity near one third matches the usual Cobb–Douglas capital share.',
  },
  'government.spendingShareOfGDP': {
    status: 'calibrated',
    source:
      'Set so public purchases are a fifth of the income base and the goods market clears. Not a country estimate.',
  },
  'tax.incomeRate': {
    status: 'calibrated',
    source: 'Set equal to the spending share so the treasury starts near balance.',
  },
  'housing.openingOwnerShare': {
    status: 'sourced',
    source: 'Approximate U.S. homeownership rate in 2026, about 65.5 percent of households.',
  },
  'housing.openingMortgageShareOfOwners': {
    status: 'sourced',
    source:
      'About 62 percent of U.S. owner households have a mortgage, from the Census mortgage-status share.',
  },
  'wage.unexpectedHoldMonths': {
    status: 'sourced',
    source:
      'US manufacturing wages held roughly 12–24 months after the 1929 deflationary shock, then fell by less than wholesale prices (about −16.8% vs −25% by 1933). Midpoint 18 months. Not a fiat-era job-stayer cut rate.',
  },
  'wage.reviewMonths': {
    status: 'calibrated',
    source:
      'Calibrated to the Daly–Hobijn zero-change spike: under non-negative expected inflation most months have no posted-wage change. Off when expected inflation is negative (gold-standard 1873–96).',
  },
};
