/**
 * Smoke test for the `verifactu qr` subcommand.
 *
 * Spawns the CLI binary via `Bun.spawn`, feeding it the fixture JSON under
 * `test/fixtures/json/qr-fixture.json`, and asserts that:
 *  - the exit code is 0,
 *  - the output file exists,
 *  - the output file starts with the PNG magic bytes.
 */

import { describe, expect, it } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FIXTURE = 'test/fixtures/json/qr-fixture.json';
const CLI_ENTRY = 'src/cli/bin.ts';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'verifactu-qr-cli-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('verifactu qr CLI', () => {
  it('renders a PNG to --out and exits with code 0', async () => {
    await withTempDir(async (dir) => {
      const outPath = join(dir, 'qr.png');
      const proc = Bun.spawn(['bun', CLI_ENTRY, 'qr', FIXTURE, '--out', outPath, '--env', 'pre'], {
        stdout: 'pipe',
        stderr: 'pipe',
      });
      const exitCode = await proc.exited;
      expect(exitCode).toBe(0);
      expect(existsSync(outPath)).toBe(true);

      const png = await readFile(outPath);
      expect(png[0]).toBe(0x89);
      expect(png[1]).toBe(0x50);
      expect(png[2]).toBe(0x4e);
      expect(png[3]).toBe(0x47);
    });
  }, 30_000);

  it('prints a data URL to stdout when --format=dataurl is used without --out', async () => {
    const proc = Bun.spawn(
      ['bun', CLI_ENTRY, 'qr', FIXTURE, '--format', 'dataurl', '--env', 'pre'],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    expect(exitCode).toBe(0);
    expect(stdout.startsWith('data:image/png;base64,')).toBe(true);
  }, 30_000);

  it('shows the root help with the four subcommands', async () => {
    const proc = Bun.spawn(['bun', CLI_ENTRY, '--help'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const exitCode = await proc.exited;
    const stdout = await new Response(proc.stdout).text();
    expect(exitCode).toBe(0);
    expect(stdout).toContain('send');
    expect(stdout).toContain('query');
    expect(stdout).toContain('qr');
    expect(stdout).toContain('validate');
  }, 30_000);
});
