#!/usr/bin/env bun
/**
 * Entry point of the `verifactu` CLI binary.
 *
 * The CLI is intentionally small: each subcommand (`send`, `query`, `qr`,
 * `validate`) lives in its own module under `./commands/` and is wired in
 * here. Bun's shebang line lets the file run as `./bin.ts` during development
 * without an extra build step.
 *
 * @module
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { registerQrCommand } from './commands/qr.js';
import { registerQueryCommand } from './commands/query.js';
import { registerSendCommand } from './commands/send.js';
import { registerValidateCommand } from './commands/validate.js';

/**
 * Read the SDK version from the on-disk `package.json` so the CLI never drifts
 * from the package metadata.
 *
 * @returns The version string from `package.json`, or `'0.0.0'` when the file
 *   cannot be read (e.g. when the script is invoked from a bundled artifact).
 */
async function readPackageVersion(): Promise<string> {
  try {
    const pkgUrl = new URL('../../package.json', import.meta.url);
    const raw = await readFile(fileURLToPath(pkgUrl), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const version = (parsed as { version?: unknown }).version;
      if (typeof version === 'string') return version;
    }
  } catch {
    // Falls through to the default version below.
  }
  return '0.0.0';
}

/**
 * Build the `verifactu` root command with every subcommand attached.
 *
 * Exported so the smoke tests can spawn the CLI without a separate compile
 * step and so future plugins can extend the program before parsing.
 *
 * @param version - Version string surfaced by `verifactu --version`.
 * @returns The fully-configured root `Command` instance.
 */
export function createProgram(version: string): Command {
  const program = new Command();
  program
    .name('verifactu')
    .description('Command-line tools for the Spanish AEAT VERI*FACTU electronic-invoicing system')
    .version(version);

  registerSendCommand(program);
  registerQueryCommand(program);
  registerQrCommand(program);
  registerValidateCommand(program);

  return program;
}

/**
 * Run the CLI: parse `process.argv` and return the exit code commander left
 * on `process.exitCode`.
 *
 * @returns The numeric process exit code (`0` for success).
 */
async function main(): Promise<number> {
  const version = await readPackageVersion();
  const program = createProgram(version);
  await program.parseAsync(process.argv);
  const code = process.exitCode;
  if (typeof code === 'number') return code;
  if (typeof code === 'string') {
    const parsed = Number.parseInt(code, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const invokedDirectly =
  typeof process.argv[1] === 'string' && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  main()
    .then((code) => {
      process.exit(code);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
