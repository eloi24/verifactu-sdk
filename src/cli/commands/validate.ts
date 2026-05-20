/**
 * `verifactu validate` subcommand — run the Zod schemas (and the business-rule
 * validators when they become available) against a JSON payload.
 *
 * Prints a small ASCII table summarising the outcome of each step; the exit
 * code is `0` on success and `1` when at least one validation fails.
 *
 * @module
 */

import { readFile } from 'node:fs/promises';
import type { Command } from 'commander';
import { dim, errorBanner, green, indent, red, successBanner, yellow } from '../ux.js';

/**
 * Outcome of a single validation step (Zod schema, business rules, …).
 */
interface ValidationStep {
  /** Human-readable label of the step (e.g. `'Zod schema'`). */
  name: string;
  /** `true` when the step passed. */
  ok: boolean;
  /** Optional explanatory text — usually the error message on failure. */
  detail?: string;
}

/**
 * Render the steps to the console as a small two-column table.
 */
function printSteps(steps: ValidationStep[]): void {
  const nameColumn = Math.max(...steps.map((step) => step.name.length));
  for (const step of steps) {
    const padded = step.name.padEnd(nameColumn, ' ');
    const status = step.ok ? green('PASS') : red('FAIL');
    console.log(`${padded}  ${status}`);
    if (!step.ok && step.detail !== undefined) {
      console.log(indent(dim(step.detail), 4));
    }
  }
}

/**
 * Attempt to dynamically import the schema modules. The Zod schemas land in
 * Phase 1 and are always available, but importing them dynamically keeps the
 * command resilient if the wire layer is refactored.
 */
async function tryLoadZodSchemas(): Promise<
  { parse: (value: unknown) => unknown; name: string } | undefined
> {
  try {
    const specifier = '../../schemas/index.js';
    const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>;
    const schema = mod.RegistroAltaSchema;
    if (schema !== undefined && typeof schema === 'object' && schema !== null) {
      const parse = (schema as { parse?: unknown }).parse;
      if (typeof parse === 'function') {
        return {
          name: 'RegistroAltaSchema',
          parse: (value: unknown) => (parse as (v: unknown) => unknown).call(schema, value),
        };
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Attempt to load the business-rule validator from the `validators` module.
 */
async function tryLoadBusinessRules(): Promise<((invoice: unknown) => void) | undefined> {
  try {
    const specifier = '../../validators/index.js';
    const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, unknown>;
    const fn = mod.validateInvoiceForRegister;
    return typeof fn === 'function' ? (fn as (invoice: unknown) => void) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Build the `validate` `Command` definition and attach it to the root
 * commander instance.
 *
 * @param program - The root `Command` from `src/cli/bin.ts`.
 * @returns The same `Command` to enable fluent chaining.
 */
export function registerValidateCommand(program: Command): Command {
  return program
    .command('validate')
    .description('Validate an invoice JSON file against the Zod schema and business rules')
    .argument('<file>', 'Path to a JSON file holding a single invoice')
    .action(async (filePath: string) => {
      const steps: ValidationStep[] = [];
      try {
        const raw = await readFile(filePath, 'utf8');
        const parsed: unknown = JSON.parse(raw);

        const zod = await tryLoadZodSchemas();
        if (zod === undefined) {
          steps.push({
            name: 'Zod schema',
            ok: false,
            detail: 'schemas module not available — build first with `bun run build`',
          });
        } else {
          try {
            zod.parse(parsed);
            steps.push({ name: `Zod (${zod.name})`, ok: true });
          } catch (error) {
            steps.push({
              name: `Zod (${zod.name})`,
              ok: false,
              detail: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const businessRules = await tryLoadBusinessRules();
        if (businessRules === undefined) {
          console.error(
            yellow('! business-rule validators are not built yet — skipping that step'),
          );
        } else {
          try {
            businessRules(parsed);
            steps.push({ name: 'Business rules', ok: true });
          } catch (error) {
            steps.push({
              name: 'Business rules',
              ok: false,
              detail: error instanceof Error ? error.message : String(error),
            });
          }
        }

        printSteps(steps);

        if (steps.some((step) => !step.ok)) {
          process.exitCode = 1;
          return;
        }
        successBanner('All validations passed');
      } catch (error) {
        errorBanner('Validate failed', error);
        process.exitCode = 1;
      }
    });
}
