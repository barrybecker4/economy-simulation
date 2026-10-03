import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { execute } from './main.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const baseline = path.join(repoRoot, 'scenarios/baseline.json');

describe('cli', () => {
  it('writes the same file for the same seed and scenario', () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'economy-sim-'));
    const out = path.join(directory, 'run.json');
    const args = ['run', '--scenario', baseline, '--seed', '7', '--out', out] as const;
    expect(execute(args)).toBe(0);
    const first = readFileSync(out, 'utf8');
    expect(execute(args)).toBe(0);
    expect(readFileSync(out, 'utf8')).toBe(first);
    const parsed = JSON.parse(first) as { config: { seed: number; name: string } };
    expect(parsed.config.seed).toBe(7);
    expect(parsed.config.name).toBe('baseline');
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
