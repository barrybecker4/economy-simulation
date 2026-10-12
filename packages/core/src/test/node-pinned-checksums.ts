/**
 * Bit-exact metric-series checksums depend on the host V8 build (see ADR 0026).
 * CI and local dev use the same Node major (see .nvmrc); bump these when upgrading.
 */
export const CROSS_ENGINE_SERIES_CHECKSUMS = {
  bitcoinNoMortgage: '636054782df6f80e',
  gradualTransition: '36a94ce7ec85c8c0',
} as const;

export const PINNED_NODE_MAJOR = '26';

export function crossEngineSeriesChecksums(): typeof CROSS_ENGINE_SERIES_CHECKSUMS {
  const major = process.versions.node.split('.')[0] ?? '';
  if (major !== PINNED_NODE_MAJOR) {
    throw new Error(
      `Expected Node ${PINNED_NODE_MAJOR}.x for cross-engine checksum tests (got ${process.versions.node}). ` +
        'Run `nvm use` (see .nvmrc).',
    );
  }
  return CROSS_ENGINE_SERIES_CHECKSUMS;
}
