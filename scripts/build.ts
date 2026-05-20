#!/usr/bin/env bun
/**
 * Production build: emits dual ESM + CJS bundles plus declaration files.
 *
 * - Bun bundler for the JS output (target=node, minify=false, sourcemap=external)
 * - tsc --emitDeclarationOnly for the .d.ts files
 *
 * Output layout: dist/{index.js,index.cjs,index.d.ts,...} plus subpath entries.
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const dist = resolve(root, 'dist');

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const external = [
  'undici',
  'qrcode',
  'zod',
  'fast-xml-parser',
  '@xmldom/xmldom',
  'xpath',
  'xadesjs',
  'commander',
  '@inquirer/prompts',
];

const libEntrypoints = [resolve(root, 'src/index.ts')];

console.log('▸ bundling ESM…');
const esm = await Bun.build({
  entrypoints: libEntrypoints,
  outdir: dist,
  target: 'node',
  format: 'esm',
  sourcemap: 'external',
  minify: false,
  splitting: false,
  external,
  naming: '[dir]/[name].js',
});

if (!esm.success) {
  console.error(esm.logs);
  process.exit(1);
}

console.log('▸ bundling CJS…');
const cjs = await Bun.build({
  entrypoints: libEntrypoints,
  outdir: dist,
  target: 'node',
  format: 'esm',
  sourcemap: 'external',
  minify: false,
  splitting: false,
  external,
  naming: '[dir]/[name].cjs',
});

if (!cjs.success) {
  console.error(cjs.logs);
  process.exit(1);
}

console.log('▸ bundling CLI bin…');
const cli = await Bun.build({
  entrypoints: [resolve(root, 'src/cli/bin.ts')],
  outdir: resolve(dist, 'cli'),
  target: 'node',
  format: 'esm',
  sourcemap: 'external',
  minify: false,
  splitting: false,
  external,
  naming: '[name].js',
  banner: '#!/usr/bin/env node',
});

if (!cli.success) {
  console.error(cli.logs);
  process.exit(1);
}

console.log('▸ emitting type declarations…');
const tsc = Bun.spawnSync(['bun', 'x', 'tsc', '--emitDeclarationOnly', '--outDir', dist]);
if (tsc.exitCode !== 0) {
  console.error(tsc.stderr.toString());
  process.exit(tsc.exitCode);
}

console.log('✓ build complete → dist/');
