/**
 * `verifactu qr` subcommand — generate the tax-QR image for a single invoice
 * described by a small JSON file.
 *
 * The command depends only on `src/qr/**` so it is fully functional from the
 * day this PR lands; other CLI commands stay stubbed until the protocol layer
 * is ready.
 *
 * @module
 */

import { readFile, writeFile } from 'node:fs/promises';
import { type Command, Option } from 'commander';
import { buildQrUrl } from '../../qr/buildUrl.js';
import type { QrEnvironment, QrLanguage, QrMode } from '../../qr/buildUrl.js';
import { renderQrDataUrl, renderQrPng, renderQrSvg } from '../../qr/render.js';
import { errorBanner, successBanner } from '../ux.js';

/**
 * Shape of the invoice JSON the `qr` command expects.
 *
 * Only the four identification fields needed by the AEAT validation URL are
 * required. Any extra keys in the file are ignored to make it easy to feed in
 * a full invoice payload during testing.
 */
interface QrInvoiceFile {
  nif: string;
  numSerieFactura: string;
  fechaExpedicionFactura: string;
  importeTotal: string | number;
}

/**
 * Output format accepted by the `--format` flag.
 */
type QrOutputFormat = 'png' | 'svg' | 'dataurl';

/**
 * Map the CLI `--env` flag to the {@link QrEnvironment} domain value.
 */
function parseEnv(value: string): QrEnvironment {
  if (value === 'pre' || value === 'preproduction') return 'preproduction';
  if (value === 'prod' || value === 'production') return 'production';
  throw new Error(`unknown environment '${value}' (expected 'pre' or 'prod')`);
}

/**
 * Map the CLI `--mode` flag to the {@link QrMode} domain value.
 */
function parseMode(value: string): QrMode {
  if (value === 'verifactu') return 'verifactu';
  if (value === 'on-request') return 'on-request';
  throw new Error(`unknown mode '${value}' (expected 'verifactu' or 'on-request')`);
}

/**
 * Parse and validate the input JSON file consumed by `verifactu qr`.
 *
 * @param path - Filesystem path to the JSON file.
 * @throws {Error} If the file cannot be read, is not valid JSON, or is missing
 *   one of the four required fields.
 */
async function loadInvoiceFile(path: string): Promise<QrInvoiceFile> {
  const raw = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`expected a JSON object at top level of '${path}'`);
  }
  const candidate = parsed as Record<string, unknown>;
  const required = ['nif', 'numSerieFactura', 'fechaExpedicionFactura', 'importeTotal'] as const;
  for (const field of required) {
    if (!(field in candidate)) {
      throw new Error(`missing required field '${field}' in '${path}'`);
    }
  }
  return {
    nif: String(candidate.nif),
    numSerieFactura: String(candidate.numSerieFactura),
    fechaExpedicionFactura: String(candidate.fechaExpedicionFactura),
    importeTotal:
      typeof candidate.importeTotal === 'number'
        ? candidate.importeTotal
        : String(candidate.importeTotal),
  };
}

/**
 * Run the QR pipeline for a parsed input and emit the requested format.
 */
async function runQrPipeline(args: {
  invoice: QrInvoiceFile;
  environment: QrEnvironment;
  mode: QrMode;
  language: QrLanguage | undefined;
  format: QrOutputFormat;
  sizeMm: number;
  outPath: string | undefined;
}): Promise<void> {
  const url = buildQrUrl({
    nif: args.invoice.nif,
    numSerieFactura: args.invoice.numSerieFactura,
    fechaExpedicionFactura: args.invoice.fechaExpedicionFactura,
    importeTotal: args.invoice.importeTotal,
    mode: args.mode,
    environment: args.environment,
    ...(args.language !== undefined && { language: args.language }),
  });

  if (args.format === 'png') {
    const png = await renderQrPng(url, { sizeMm: args.sizeMm });
    if (args.outPath !== undefined) {
      await writeFile(args.outPath, png);
      successBanner(`QR PNG written to ${args.outPath}`);
    } else {
      process.stdout.write(png);
    }
    return;
  }

  if (args.format === 'svg') {
    const svg = await renderQrSvg(url, { sizeMm: args.sizeMm });
    if (args.outPath !== undefined) {
      await writeFile(args.outPath, svg, 'utf8');
      successBanner(`QR SVG written to ${args.outPath}`);
    } else {
      process.stdout.write(svg);
    }
    return;
  }

  const dataUrl = await renderQrDataUrl(url, { sizeMm: args.sizeMm });
  if (args.outPath !== undefined) {
    await writeFile(args.outPath, dataUrl, 'utf8');
    successBanner(`QR data URL written to ${args.outPath}`);
  } else {
    console.log(dataUrl);
  }
}

/**
 * Build the `qr` `Command` definition and attach it to the root commander
 * instance.
 *
 * @param program - The root `Command` from `src/cli/bin.ts`.
 * @returns The same `Command` to enable fluent chaining.
 */
export function registerQrCommand(program: Command): Command {
  return program
    .command('qr')
    .description('Render the AEAT tax-QR image for an invoice described in JSON')
    .argument('<invoice>', 'Path to a JSON file with the four QR identification fields')
    .option('--out <file>', 'Write the output to this file instead of stdout')
    .addOption(
      new Option('--format <format>', 'Output format')
        .choices(['png', 'svg', 'dataurl'])
        .default('png'),
    )
    .option('--size <mm>', 'Physical size in millimetres (30–40 recommended)', '35')
    .addOption(
      new Option('--lang <code>', 'AEAT response language (idioma)').choices([
        'es',
        'en',
        'ca',
        'gl',
        'eu',
        'va',
      ]),
    )
    .addOption(
      new Option('--env <env>', 'Target AEAT environment').choices(['pre', 'prod']).default('prod'),
    )
    .addOption(
      new Option('--mode <mode>', 'Issuer mode')
        .choices(['verifactu', 'on-request'])
        .default('verifactu'),
    )
    .action(async (invoicePath: string, opts: Record<string, unknown>) => {
      try {
        const invoice = await loadInvoiceFile(invoicePath);
        const sizeMm = Number.parseFloat(String(opts.size));
        if (!Number.isFinite(sizeMm) || sizeMm <= 0) {
          throw new Error(`invalid --size value '${String(opts.size)}'`);
        }
        await runQrPipeline({
          invoice,
          environment: parseEnv(String(opts.env)),
          mode: parseMode(String(opts.mode)),
          language: opts.lang === undefined ? undefined : (opts.lang as QrLanguage),
          format: String(opts.format) as QrOutputFormat,
          sizeMm,
          outPath: opts.out === undefined ? undefined : String(opts.out),
        });
      } catch (error) {
        errorBanner('QR generation failed', error);
        process.exitCode = 1;
      }
    });
}
