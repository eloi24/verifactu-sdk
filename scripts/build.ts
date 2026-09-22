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
  // Optional peer dependencies for the store/* adapters -- never bundled, so
  // importing one subpath doesn't pull in the others' drivers.
  'bun:sqlite',
  'pg',
  'ioredis',
  'drizzle-orm',
  'drizzle-orm/pg-core',
  'mysql2/promise',
  'better-sqlite3',
];

// Every public entrypoint declared under `exports` in package.json. Keep this
// in sync with that map -- a missing entry here means the export resolves to
// a .d.ts with no matching .js/.cjs at runtime.
const libEntrypoints = [
  resolve(root, 'src/index.ts'),
  resolve(root, 'src/schemas/index.ts'),
  resolve(root, 'src/errors/index.ts'),
  resolve(root, 'src/validators/index.ts'),
  resolve(root, 'src/qr/index.ts'),
  resolve(root, 'src/hash/index.ts'),
  resolve(root, 'src/store/adapters/bunSql.ts'),
  resolve(root, 'src/store/adapters/pg.ts'),
  resolve(root, 'src/store/adapters/redis.ts'),
  resolve(root, 'src/store/adapters/sqlite.ts'),
  resolve(root, 'src/store/adapters/drizzle.ts'),
  resolve(root, 'src/store/adapters/mysql.ts'),
  resolve(root, 'src/store/adapters/betterSqlite3.ts'),
];

console.log('▸ bundling ESM…');
const esm = await Bun.build({
  entrypoints: libEntrypoints,
  outdir: dist,
  root: resolve(root, 'src'),
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
  root: resolve(root, 'src'),
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
});

if (!cli.success) {
  console.error(cli.logs);
  process.exit(1);
}

// Bun.build() preserves the entry file's own `#!/usr/bin/env bun` shebang
// (src/cli/bin.ts starts with one, for `bun run src/cli/bin.ts` during dev)
// and gives no way to override it via the `banner` option -- it stacks on
// top instead of replacing it, which produced a syntax error (two shebang
// lines) when this script also passed `banner: '#!/usr/bin/env node'`. The
// CLI has zero `Bun.*` usage and package.json declares Node >=20 support, so
// the shipped binary must run under plain Node -- rewrite the shebang here.
const cliBinPath = resolve(dist, 'cli', 'bin.js');
const cliBinSource = await Bun.file(cliBinPath).text();
const cliBinWithNodeShebang = cliBinSource.replace(/^#!.*\n/, '#!/usr/bin/env node\n');
await Bun.write(cliBinPath, cliBinWithNodeShebang);

console.log('▸ emitting type declarations…');
const tsc = Bun.spawnSync(['bun', 'x', 'tsc', '--emitDeclarationOnly', '--outDir', dist]);
if (tsc.exitCode !== 0) {
  console.error(tsc.stderr.toString());
  process.exit(tsc.exitCode);
}

console.log('✓ build complete → dist/');
