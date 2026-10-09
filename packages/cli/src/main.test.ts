import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { execute } from './main.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

describe('cli', () => {
  it('writes the same file for the same seed and scenario', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'economy-sim-'));
    const out = path.join(directory, 'run.json');
    const scenario = path.join(directory, 'baseline-short.json');
    writeFileSync(
      scenario,
      JSON.stringify({
        name: 'baseline',
        ticks: 36,
        sliders: {
          'scale.households': 80,
          'scale.firms': 8,
          'scale.banks': 1,
          'shock.frequency': 0,
        },
      }),
    );
    const args = ['run', '--scenario', scenario, '--seed', '7', '--out', out] as const;
    expect(execute(args)).toBe(0);
    const first = readFileSync(out, 'utf8');
    expect(execute(args)).toBe(0);
    expect(readFileSync(out, 'utf8')).toBe(first);
    const parsed = JSON.parse(first) as { config: { seed: number; name: string } };
    expect(parsed.config.seed).toBe(7);
    expect(parsed.config.name).toBe('baseline');
  }, 60_000);

  it('compares two regimes for one seed', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'economy-sim-'));
    const scenario = path.join(directory, 'tiny.json');
    const out = path.join(directory, 'compare.json');
    writeFileSync(
      scenario,
      JSON.stringify({
        name: 'tiny',
        ticks: 24,
        sliders: {
          'scale.households': 40,
          'scale.firms': 4,
          'scale.banks': 1,
          'shock.frequency': 0,
        },
      }),
    );
    expect(
      execute([
        'compare',
        '--scenario',
        scenario,
        '--seed',
        '3',
        '--left',
        'fiat',
        '--right',
        'bitcoin',
        '--out',
        out,
      ]),
    ).toBe(0);
    const report = JSON.parse(readFileSync(out, 'utf8')) as {
      left: { regime: string; unit: string; priceLevel: number };
      right: { regime: string; unit: string; priceLevel: number };
    };
    expect(report.left.regime).toBe('fiat');
    expect(report.right.regime).toBe('bitcoin');
    expect(report.left.unit).toBe('cent');
    expect(report.right.unit).toBe('satoshi');
    expect(report.right.priceLevel).toBeLessThan(report.left.priceLevel);
  });

  it('checks the assumptions document', () => {
    expect(execute(['assumptions', '--check', path.join(repoRoot, 'docs/assumptions.md')])).toBe(0);
  });

  it('reports a stale assumptions document', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'economy-sim-'));
    const stale = path.join(directory, 'assumptions.md');
    writeFileSync(stale, 'stale\n');
    expect(() => execute(['assumptions', '--check', stale])).toThrow(/out of date/);
  });
});
