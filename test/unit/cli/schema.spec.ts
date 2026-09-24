/**
 * Smoke test for the `verifactu schema drizzle` subcommand.
 *
 * Spawns the CLI binary via `Bun.spawn` and asserts it writes a Drizzle
 * table definition matching each dialect's required column shape, and that
 * it refuses to clobber an existing file without `--force`.
 */

import { describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI_ENTRY = 'src/cli/bin.ts';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'verifactu-schema-cli-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('verifactu schema drizzle CLI', () => {
  it.each(['pg', 'mysql', 'sqlite'] as const)(
    'writes a %s table with the nif/invoiceId/hash columns',
    async (provider) => {
      await withTempDir(async (dir) => {
        const outPath = join(dir, 'schema.ts');
        const proc = Bun.spawn(
          ['bun', CLI_ENTRY, 'schema', 'drizzle', '--provider', provider, '--out', outPath],
          { stdout: 'pipe', stderr: 'pipe' },
        );
        const exitCode = await proc.exited;
        expect(exitCode).toBe(0);
        expect(existsSync(outPath)).toBe(true);

        const source = await readFile(outPath, 'utf8');
        expect(source).toContain('verifactuHashChain');
        expect(source).toContain('nif: ');
        expect(source).toContain('invoiceId');
        expect(source).toContain('primaryKey()');
      });
    },
    30_000,
  );

  it('refuses to overwrite an existing file without --force', async () => {
    await withTempDir(async (dir) => {
      const outPath = join(dir, 'schema.ts');
      await writeFile(outPath, '// pre-existing content\n', 'utf8');

      const proc = Bun.spawn(
        ['bun', CLI_ENTRY, 'schema', 'drizzle', '--provider', 'pg', '--out', outPath],
        { stdout: 'pipe', stderr: 'pipe' },
      );
      const exitCode = await proc.exited;
      expect(exitCode).toBe(1);
      expect(await readFile(outPath, 'utf8')).toBe('// pre-existing content\n');
    });
  }, 30_000);

  it('overwrites with --force', async () => {
    await withTempDir(async (dir) => {
      const outPath = join(dir, 'schema.ts');
      await writeFile(outPath, '// pre-existing content\n', 'utf8');

      const proc = Bun.spawn(
        ['bun', CLI_ENTRY, 'schema', 'drizzle', '--provider', 'pg', '--out', outPath, '--force'],
        { stdout: 'pipe', stderr: 'pipe' },
      );
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      expect(await readFile(outPath, 'utf8')).toContain('verifactuHashChain');
    });
  }, 30_000);
});
