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
      'The default is near the Basel III common-equity floor, applied here to all loans rather than risk-weighted assets.',
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
};
