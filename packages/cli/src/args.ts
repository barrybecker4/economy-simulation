export const USAGE = `economy-simulation

  run --scenario <file> --seed <n> --out <file>
  assumptions --check [docs/assumptions.md]
  assumptions --out <file>
`;

export type Command =
  | { kind: 'help'; exitCode: number }
  | { kind: 'run'; scenario: string; seed: number; out: string }
  | { kind: 'assumptions-check'; path: string }
  | { kind: 'assumptions-write'; path: string };

export function parseArgs(argv: readonly string[]): Command {
  if (argv.length === 0) {
    return { kind: 'help', exitCode: 1 };
  }
  const [command, ...rest] = argv;
  if (command === 'help' || command === '--help') {
    return { kind: 'help', exitCode: 0 };
  }
  if (command === 'run') {
    return parseRun(rest);
  }
  if (command === 'assumptions') {
    return parseAssumptions(rest);
  }
  throw new Error(`Unknown command ${command ?? ''}\n${USAGE}`);
}

function parseRun(argv: readonly string[]): Command {
  const flags = readFlags(argv);
  const scenario = required(flags, 'scenario');
  const out = required(flags, 'out');
  const seedText = required(flags, 'seed');
  if (!/^\d+$/.test(seedText)) {
    throw new Error('Seed must be a non-negative integer');
  }
  const seed = Number(seedText);
  if (!Number.isSafeInteger(seed)) {
    throw new Error('Seed must be a non-negative safe integer');
  }
  return { kind: 'run', scenario, seed, out };
}

function parseAssumptions(argv: readonly string[]): Command {
  const flags = readFlags(argv);
  if (flags.check !== undefined && flags.out !== undefined) {
    throw new Error('Use either --check or --out');
  }
  if (flags.out !== undefined) {
    return { kind: 'assumptions-write', path: flags.out };
  }
  return { kind: 'assumptions-check', path: flags.check ?? 'docs/assumptions.md' };
}

function readFlags(argv: readonly string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined || !token.startsWith('--')) {
      throw new Error(`Unexpected argument ${token ?? ''}`);
    }
    const name = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      if (name === 'check') {
        flags.check = 'docs/assumptions.md';
        continue;
      }
      throw new Error(`Missing value for --${name}`);
    }
    flags[name] = value;
    index += 1;
  }
  return flags;
}

function required(flags: Record<string, string>, name: string): string {
  const value = flags[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Missing --${name}`);
  }
  return value;
}
