import { describe, expect, it } from 'vitest';
import { generateCantillonReport, formatCantillonReportMarkdown } from './cantillon-report.js';
import { FEATURE_OFF } from '../sim/feature-off.js';

describe('cantillon report', () => {
  it('generates a full report with multiple seeds and presets', () => {
    const report = generateCantillonReport({
      seedCount: 3,
      ticks: 12,
      presets: [
        {
          name: 'test',
          sliders: {
            ...FEATURE_OFF,
            'scale.households': 40,
            'scale.firms': 4,
            'scale.banks': 1,
          },
        },
      ],
      regimes: ['fiat'],
    });

    expect(report.results).toHaveLength(4); // 4 channels
    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.timestamp).toBeTruthy();
  });

  it('formats report as markdown', () => {
    const report = generateCantillonReport({
      seedCount: 2,
      ticks: 12,
      presets: [
        {
          name: 'test',
          sliders: {
            ...FEATURE_OFF,
            'scale.households': 40,
            'scale.firms': 4,
            'scale.banks': 1,
          },
        },
      ],
      regimes: ['fiat'],
    });

    const markdown = formatCantillonReportMarkdown(report);

    expect(markdown).toContain('# Cantillon Effect Experiment Report');
    expect(markdown).toContain('## Results');
    expect(markdown).toContain('proRataDeposits');
    expect(markdown).toContain('governmentSpending');
    expect(markdown).toContain('newLoans');
    expect(markdown).toContain('assetPurchase');
  });

  it('generates findings for each preset/regime/channel combination', () => {
    const report = generateCantillonReport({
      seedCount: 2,
      ticks: 12,
      presets: [
        {
          name: 'S0',
          sliders: {
            ...FEATURE_OFF,
            'scale.households': 40,
            'scale.firms': 4,
            'scale.banks': 1,
          },
        },
      ],
      regimes: ['fiat', 'bitcoin'],
    });

    // Should have findings for both regimes
    const fiatFindings = report.findings.filter((f) => f.includes('S0/fiat'));
    const bitcoinFindings = report.findings.filter((f) => f.includes('S0/bitcoin'));

    expect(fiatFindings.length).toBeGreaterThan(0);
    expect(bitcoinFindings.length).toBeGreaterThan(0);
  });

  it('reports whether channels meet ECB-style target', () => {
    const report = generateCantillonReport({
      seedCount: 2,
      ticks: 12,
      presets: [
        {
          name: 'test',
          sliders: {
            ...FEATURE_OFF,
            'scale.households': 40,
            'scale.firms': 4,
            'scale.banks': 1,
          },
        },
      ],
      regimes: ['fiat'],
    });

    // Should check proRataDeposits and assetPurchase against ±0.01
    const neutralChannelFindings = report.findings.filter(
      (f) => f.includes('proRataDeposits') || f.includes('assetPurchase'),
    );
    expect(neutralChannelFindings.length).toBeGreaterThan(0);
    expect(neutralChannelFindings.some((f) => f.includes('✓') || f.includes('✗'))).toBe(true);
  });
});
