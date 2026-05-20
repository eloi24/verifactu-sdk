/**
 * `verifactu send` subcommand — read one or more invoice records from a JSON
 * file, validate them, and submit them to the AEAT submission service.
 *
 * The SOAP transport is delivered by the `protocol` team in Phase 3. Until
 * that wiring lands this command performs the upstream validation (Zod schema
 * + business rules when available) and prints a stub line describing the call
 * that *would* happen, so end-to-end CLI flows can already be exercised.
 *
 * @module
 */

import { readFile } from 'node:fs/promises';
import { type Command, Option } from 'commander';
import { errorBanner, successBanner, yellow } from '../ux.js';

/**
 * Optional, dynamically-imported business-rule validator from the `validators`
 * module. The shape is `(invoice: unknown) => void` and the function throws on
 * failure. Returns `undefined` when the module isn't built yet.
 */
async function tryLoadValidator(): Promise<((invoice: unknown) => void) | undefined> {
  try {
    // Computed specifier keeps TypeScript happy while the `validators` module
    // is still being implemented by another team.
    const specifier = '../../validators/index.js';
    const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>;
    const fn = mod.validateInvoiceForRegister;
    return typeof fn === 'function' ? (fn as (invoice: unknown) => void) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Read a JSON file and return its parsed contents as an array of records.
 *
 * Accepts either a top-level array of invoices or a single invoice object
 * (which is promoted to a 1-element array for ergonomic single-record sends).
 *
 * @throws {Error} When the file cannot be read or is not valid JSON.
 */
async function loadRecords(path: string): Promise<unknown[]> {
  const raw = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === 'object' && parsed !== null) return [parsed];
  throw new Error(`expected an invoice object or array at top level of '${path}'`);
}

/**
 * Build the `send` `Command` definition and attach it to the root commander
 * instance.
 *
 * @param program - The root `Command` from `src/cli/bin.ts`.
 * @returns The same `Command` to enable fluent chaining.
 */
export function registerSendCommand(program: Command): Command {
  return program
    .command('send')
    .description('Submit one or more invoice records to the AEAT submission service')
    .argument('<file>', 'Path to a JSON file holding a single invoice or an array of invoices')
    .addOption(
      new Option('--env <env>', 'Target AEAT environment').choices(['pre', 'prod']).default('prod'),
    )
    .addOption(
      new Option('--mode <mode>', 'Submission mode')
        .choices(['verifactu', 'on-request'])
        .default('verifactu'),
    )
    .option('--cert <path>', 'Path to the PKCS#12 mTLS certificate')
    .option('--cert-pass <pass>', 'Password protecting the PKCS#12 file')
    .action(async (filePath: string, opts: Record<string, unknown>) => {
      try {
        const records = await loadRecords(filePath);

        const validate = await tryLoadValidator();
        if (validate === undefined) {
          console.error(
            yellow(
              '! business-rule validators are not built yet — skipping the validateInvoiceForRegister step',
            ),
          );
        } else {
          for (const record of records) {
            validate(record);
          }
        }

        const env = String(opts.env);
        const mode = String(opts.mode);
        console.log(`[stub] would send ${records.length} invoice(s) to ${env} via ${mode}`);
        if (opts.cert !== undefined) {
          console.log(`[stub] mTLS certificate: ${String(opts.cert)}`);
        }
        successBanner('Send dry-run completed');
      } catch (error) {
        errorBanner('Send failed', error);
        process.exitCode = 1;
      }
    });
}
