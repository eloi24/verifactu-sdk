/**
 * `verifactu query` subcommand — list previously-stored invoice records for a
 * given fiscal year and period.
 *
 * The actual SOAP `ConsultaFactuSistemaFacturacion` call is delivered by the
 * `protocol` team in Phase 3. Until that integration lands the command prints
 * a stub line describing the request shape that *would* be sent.
 *
 * @module
 */

import { type Command, Option } from 'commander';
import { errorBanner, successBanner } from '../ux.js';

const YEAR_REGEX = /^\d{4}$/u;
const PERIOD_REGEX = /^(0[1-9]|1[0-2])$/u;

/**
 * Validate the `--year` / `--period` flags against the AEAT format.
 */
function validateYearPeriod(year: string, period: string): void {
  if (!YEAR_REGEX.test(year)) {
    throw new Error(`invalid --year '${year}'; expected 4 digits (e.g. '2026')`);
  }
  if (!PERIOD_REGEX.test(period)) {
    throw new Error(`invalid --period '${period}'; expected '01'..'12'`);
  }
}

/**
 * Build the `query` `Command` definition and attach it to the root commander
 * instance.
 *
 * @param program - The root `Command` from `src/cli/bin.ts`.
 * @returns The same `Command` to enable fluent chaining.
 */
export function registerQueryCommand(program: Command): Command {
  return program
    .command('query')
    .description('Query invoice records stored at AEAT for a fiscal year and period')
    .requiredOption('--year <YYYY>', 'Fiscal year (4 digits)')
    .requiredOption('--period <MM>', "Month code, '01'..'12'")
    .addOption(
      new Option('--env <env>', 'Target AEAT environment').choices(['pre', 'prod']).default('prod'),
    )
    .option('--cert <path>', 'Path to the PKCS#12 mTLS certificate')
    .option('--cert-pass <pass>', 'Password protecting the PKCS#12 file')
    .option('--page <ClavePaginacion>', 'Pagination cursor as a JSON-encoded InvoiceId')
    .action((opts: Record<string, unknown>) => {
      try {
        const year = String(opts.year);
        const period = String(opts.period);
        validateYearPeriod(year, period);

        const env = String(opts.env);
        console.log(`[stub] would query ${env} for year=${year} period=${period}`);
        if (opts.page !== undefined) {
          console.log(`[stub] resuming from page cursor: ${String(opts.page)}`);
        }
        successBanner('Query dry-run completed');
      } catch (error) {
        errorBanner('Query failed', error);
        process.exitCode = 1;
      }
    });
}
