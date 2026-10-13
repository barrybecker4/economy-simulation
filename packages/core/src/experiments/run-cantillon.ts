#!/usr/bin/env node

/**
 * Run the Cantillon effect experiment and generate a report.
 * This satisfies the acceptance criteria from issue #16.
 */

import { generateCantillonReport, formatCantillonReportMarkdown } from './cantillon-report.js';
import { FEATURE_OFF } from '../sim/feature-off.js';

function main() {
  console.log('Running Cantillon effect experiment...');
  console.log('This will test 4 injection channels × 2 regimes × 2 presets × 10+ seeds');
  console.log('');

  const report = generateCantillonReport({
    seedCount: 10, // Minimum 10 per issue #16
    ticks: 24, // 2 years to observe distributional effects
    presets: [
      {
        name: 'S0',
        sliders: {
          ...FEATURE_OFF,
          'scale.households': 60,
          'scale.firms': 6,
          'scale.banks': 1,
        },
      },
      {
        name: 'monetary',
        sliders: {
          'scale.households': 60,
          'scale.firms': 6,
          'scale.banks': 1,
          'prices.trendWeight': 0.35,
          'production.demandWeight': 1,
          'bank.depositPassThrough': 1,
          'expectations.anchorWeight': 0.5,
          'housing.tenureChoice': 'on',
          'credit.endogenousWeight': 1,
          'credit.leverageStart': 1,
          'bank.capitalRatio': 0.04,
          'household.openingDepositMonths': 6.5,
          'labor.firmLevelHiring': 'on',
        },
      },
    ],
    regimes: ['fiat', 'bitcoin'],
  });

  const markdown = formatCantillonReportMarkdown(report);
  console.log(markdown);
}

main();
