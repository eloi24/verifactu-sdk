#!/usr/bin/env bun
/**
 * Refresh the AEAT XSD cache under `schemas-aeat/`.
 *
 * Downloads the seven XSDs published on the AEAT developers portal and writes
 * them to the local cache directory. The script is idempotent — re-running it
 * overwrites each file with the current upstream copy.
 *
 * Source: https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws/
 *
 * @example
 * ```sh
 * bun run scripts/fetch-xsd.ts
 * ```
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { request } from 'undici';

const BASE_URL =
  'https://prewww2.aeat.es/static_files/common/internet/dep/aplicaciones/es/aeat/tikeV1.0/cont/ws';

const XSD_FILES = [
  'SuministroLR.xsd',
  'SuministroInformacion.xsd',
  'RespuestaSuministro.xsd',
  'ConsultaLR.xsd',
  'RespuestaConsultaLR.xsd',
  'EventosSIF.xsd',
  'RespuestaValRegistNoVeriFactu.xsd',
] as const;

/**
 * Download a single XSD file into the target directory.
 *
 * @param fileName - Bare file name (no path); will be appended to {@link BASE_URL}.
 * @param targetDir - Absolute directory where the XSD will be written.
 * @returns The absolute path of the written file.
 */
async function downloadXsd(fileName: string, targetDir: string): Promise<string> {
  const url = `${BASE_URL}/${fileName}`;
  const { statusCode, body } = await request(url, { method: 'GET' });

  if (statusCode !== 200) {
    throw new Error(`Failed to fetch ${url}: HTTP ${statusCode}`);
  }

  const buffer = Buffer.from(await body.arrayBuffer());
  const outPath = resolve(targetDir, fileName);
  await writeFile(outPath, buffer);
  return outPath;
}

const root = resolve(import.meta.dir, '..');
const targetDir = resolve(root, 'schemas-aeat');
await mkdir(targetDir, { recursive: true });

console.log(`fetching ${XSD_FILES.length} XSDs into ${targetDir}`);

const results = await Promise.allSettled(XSD_FILES.map((name) => downloadXsd(name, targetDir)));

let failures = 0;
for (const [i, result] of results.entries()) {
  const name = XSD_FILES[i];
  if (result.status === 'fulfilled') {
    console.log(`  ok  ${name}`);
  } else {
    failures += 1;
    console.error(`  err ${name}: ${(result.reason as Error).message}`);
  }
}

if (failures > 0) {
  console.error(`${failures} XSD(s) failed to download`);
  process.exit(1);
}

console.log('done');
