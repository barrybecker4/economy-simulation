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
  'government.rainyDayMonths': {
    status: 'calibrated',
    source:
      'Six months of outlays, sized so a drawn-down bitcoin fund can open a 2–6 percent of GDP deficit in a deep slump, near 1930s US gold-standard deficits.',
  },
  'government.hardMoneyDeficitCap': {
    status: 'calibrated',
    source:
      '3.5 percent of GDP extra outlays, so a deep slump lands in the 2–6 percent of GDP gold-standard band, near 1930s US deficits of about 4.6–5.4 percent of GDP (FRED FYFSGDA188S).',
  },
  'government.crisisOutlayCap': {
    status: 'calibrated',
    source:
      'Twelve percent of GDP extra fiat outlays, sized so a deep slump plus the tax drop can reach an 8–15 percent of GDP deficit (FRED FYFSGDA188S 2009 and 2020).',
  },
  'centralBank.stimulusGdpWeight': {
    status: 'calibrated',
    source:
      'Weight 0.35 mixes deposit-based and GDP-scaled fiat crisis stimulus so a deep unemployment gap on the monetary preset can expand the reserve sheet by 15–30 points of GDP (FRED WALCL 2008 and 2020). An 18 percent of GDP annual cap in the growth rule stops trend-price S0 runs from hitting the monthly deposit cap every month.',
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
};
