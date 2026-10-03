import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { renderAssumptions } from './assumptions.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');

describe('assumptions document', () => {
  it('matches the slider registry', () => {
    const onDisk = readFileSync(path.join(repoRoot, 'docs/assumptions.md'), 'utf8');
    expect(onDisk).toBe(renderAssumptions());
  });
});
