/**
 * Generate a comprehensive Cantillon effect experiment report.
 *
 * This tests the claim "fiat enriches those closest to the printer" by
 * comparing wealth and income distribution changes across different
 * money injection channels.
 */

import { runCantillonExperiment, summarizeCantillonResults } from './cantillon.js';

export interface CantillonReportConfig {
  /** Number of seeds to test (minimum 10 per issue #16) */
  seedCount: number;
  /** Ticks to run (24 = 2 years to see effects) */
  ticks: number;
  /** Test both S0 and monetary presets */
  presets: Array<{ name: string; sliders: Record<string, number | string> }>;
  /** Test both fiat and bitcoin */
  regimes: string[];
}

export interface CantillonReport {
  timestamp: string;
  config: CantillonReportConfig;
  results: Array<{
    preset: string;
    regime: string;
    channel: string;
    wealthGini: {
      mean: number;
      min: number;
      max: number;
      range: number;
    };
    topDecile: {
      mean: number;
      min: number;
      max: number;
      range: number;
    };
    firstReceiverGain: {
      mean: number;
      min: number;
      max: number;
      range: number;
    };
  }>;
  findings: string[];
}

/**
 * Generate the full Cantillon effect experiment report.
 * This is what will be run in CI per issue #16.
 */
export function generateCantillonReport(config: CantillonReportConfig): CantillonReport {
  const results: CantillonReport['results'] = [];
  const seeds = Array.from({ length: config.seedCount }, (_, i) => i + 1);

  for (const preset of config.presets) {
    for (const regime of config.regimes) {
      const experimentResults = runCantillonExperiment({
        seeds,
        ticks: config.ticks,
        regime,
        preset: preset.name,
        baseSliders: {
          ...preset.sliders,
          'shock.frequency': 0, // Isolate injection channel effects
        },
      });

      const channels = ['proRataDeposits', 'governmentSpending', 'newLoans', 'assetPurchase'];

      for (const channel of channels) {
        results.push({
          preset: preset.name,
          regime,
          channel,
          wealthGini: summarizeCantillonResults(experimentResults, channel, 'wealthGiniChange'),
          topDecile: summarizeCantillonResults(experimentResults, channel, 'topDecileChange'),
          firstReceiverGain: summarizeCantillonResults(
            experimentResults,
            channel,
            'firstReceiverGain',
          ),
        });
      }
    }
  }

  const findings = generateFindings(results, config);

  return {
    timestamp: new Date().toISOString(),
    config,
    results,
    findings,
  };
}

function generateFindings(
  results: CantillonReport['results'],
  config: CantillonReportConfig,
): string[] {
  const findings: string[] = [];

  // Check ECB-style target: ±0.01 for neutral channels
  const neutralChannels = ['proRataDeposits', 'assetPurchase'];
  const targetThreshold = 0.01;

  for (const preset of config.presets) {
    for (const regime of config.regimes) {
      for (const channel of neutralChannels) {
        const result = results.find(
          (r) => r.preset === preset.name && r.regime === regime && r.channel === channel,
        );
        if (!result) continue;

        const meanAbsChange = Math.abs(result.wealthGini.mean);
        const meetsTarget = meanAbsChange <= targetThreshold;

        findings.push(
          `${preset.name}/${regime}/${channel}: ` +
            `mean wealth Gini change = ${result.wealthGini.mean.toFixed(4)} ` +
            `(range [${result.wealthGini.min.toFixed(4)}, ${result.wealthGini.max.toFixed(4)}])` +
            (meetsTarget ? ' ✓ within ±0.01' : ' ✗ exceeds ±0.01'),
        );
      }

      // Compare first-receiver gains across channels
      const channelGains = ['governmentSpending', 'newLoans'].map((channel) => {
        const result = results.find(
          (r) => r.preset === preset.name && r.regime === regime && r.channel === channel,
        );
        return {
          channel,
          gain: result?.firstReceiverGain.mean ?? 0,
        };
      });

      findings.push(
        `${preset.name}/${regime}: First-receiver gains: ` +
          channelGains.map((c) => `${c.channel}=${(c.gain * 100).toFixed(2)}%`).join(', '),
      );
    }
  }

  return findings;
}

/**
 * Format the report as markdown for documentation.
 */
export function formatCantillonReportMarkdown(report: CantillonReport): string {
  const lines: string[] = [];

  lines.push('# Cantillon Effect Experiment Report');
  lines.push('');
  lines.push(`Generated: ${report.timestamp}`);
  lines.push('');
  lines.push('## Configuration');
  lines.push('');
  lines.push(`- Seeds: ${report.config.seedCount}`);
  lines.push(`- Ticks: ${report.config.ticks}`);
  lines.push(`- Presets: ${report.config.presets.map((p) => p.name).join(', ')}`);
  lines.push(`- Regimes: ${report.config.regimes.join(', ')}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push('### Wealth Gini Changes by Channel');
  lines.push('');
  lines.push('| Preset | Regime | Channel | Mean | Range |');
  lines.push('|--------|--------|---------|------|-------|');

  for (const result of report.results) {
    lines.push(
      `| ${result.preset} | ${result.regime} | ${result.channel} | ` +
        `${result.wealthGini.mean.toFixed(4)} | ` +
        `[${result.wealthGini.min.toFixed(4)}, ${result.wealthGini.max.toFixed(4)}] |`,
    );
  }

  lines.push('');
  lines.push('### Top Decile Share Changes by Channel');
  lines.push('');
  lines.push('| Preset | Regime | Channel | Mean | Range |');
  lines.push('|--------|--------|---------|------|-------|');

  for (const result of report.results) {
    lines.push(
      `| ${result.preset} | ${result.regime} | ${result.channel} | ` +
        `${result.topDecile.mean.toFixed(4)} | ` +
        `[${result.topDecile.min.toFixed(4)}, ${result.topDecile.max.toFixed(4)}] |`,
    );
  }

  lines.push('');
  lines.push('### First-Receiver Gains (12-month)');
  lines.push('');
  lines.push('| Preset | Regime | Channel | Mean Gain | Range |');
  lines.push('|--------|--------|---------|-----------|-------|');

  for (const result of report.results) {
    lines.push(
      `| ${result.preset} | ${result.regime} | ${result.channel} | ` +
        `${(result.firstReceiverGain.mean * 100).toFixed(2)}% | ` +
        `[${(result.firstReceiverGain.min * 100).toFixed(2)}%, ` +
        `${(result.firstReceiverGain.max * 100).toFixed(2)}%] |`,
    );
  }

  lines.push('');
  lines.push('## Findings');
  lines.push('');

  for (const finding of report.findings) {
    lines.push(`- ${finding}`);
  }

  lines.push('');
  lines.push('## Interpretation');
  lines.push('');
  lines.push(
    'The Cantillon effect refers to the distributional impact of who receives new money first.',
  );
  lines.push(
    'According to real-world evidence cited in issue #16, Euro-area QE moved the wealth Gini',
  );
  lines.push('by only −0.03 points (69.17 to 69.14), suggesting the effect is small.');
  lines.push('');
  lines.push(
    'Channels like `proRataDeposits` and `assetPurchase` should show minimal wealth inequality',
  );
  lines.push(
    'changes (within ±0.01), while channels like `governmentSpending` and `newLoans` that',
  );
  lines.push('concentrate new money on specific groups may show larger effects.');

  return lines.join('\n');
}
