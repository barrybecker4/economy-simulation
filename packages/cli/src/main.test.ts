import { describe, expect, it } from 'vitest';
import { CORE_PACKAGE } from '@economy-simulation/core';

describe('cli package', () => {
  it('depends on the core package', () => {
    expect(CORE_PACKAGE).toBe('@economy-simulation/core');
  });
});
