import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

async function lintSnippet(relativePath: string, source: string) {
  const eslint = new ESLint({ cwd: root });
  const [result] = await eslint.lintText(source, {
    filePath: path.join(root, relativePath),
  });
  if (!result) {
    throw new Error(`ESLint returned no result for ${relativePath}`);
  }
  return result;
}

describe('core determinism lint', () => {
  it('rejects Math.random in packages/core', async () => {
    const result = await lintSnippet(
      'packages/core/src/forbidden-random.ts',
      'export const draw = Math.random();\n',
    );
    expect(result.messages.some((message) => message.ruleId === 'no-restricted-properties')).toBe(
      true,
    );
  });

  it('rejects Date.now in packages/core', async () => {
    const result = await lintSnippet(
      'packages/core/src/forbidden-clock.ts',
      'export const time = Date.now();\n',
    );
    expect(result.messages.some((message) => message.ruleId === 'no-restricted-properties')).toBe(
      true,
    );
  });

  it('allows Math.random outside packages/core', async () => {
    const result = await lintSnippet(
      'packages/cli/src/allowed-random.ts',
      'export const draw = Math.random();\n',
    );
    expect(
      result.messages.filter((message) => message.ruleId === 'no-restricted-properties'),
    ).toEqual([]);
  });
});
