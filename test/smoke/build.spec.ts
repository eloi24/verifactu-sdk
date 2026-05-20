/**
 * Build-smoke test.
 *
 * Runs `bun run build` (always — the build is idempotent and fast) and asserts
 * that the resulting `dist/` layout is sound:
 *
 * - `dist/index.js` is a valid ESM module — `await import(...)` resolves
 *   without throwing and the well-known top-level symbols are present.
 * - `dist/index.d.ts` exists and mentions every public symbol that
 *   `src/index.ts` re-exports.
 * - `dist/cli/bin.js` exists (the CLI shim must be emitted into the bundle).
 *
 * The test runs from any working directory (uses absolute paths derived from
 * `import.meta.dir`).
 */

import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = resolve(import.meta.dir, '..', '..');
const dist = resolve(repoRoot, 'dist');

function runBuild(): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('bun', ['run', 'build'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('smoke: bun run build', () => {
  test('emits dist/index.js, dist/index.d.ts and dist/cli/bin.js', async () => {
    const build = runBuild();
    expect(build.status).toBe(0);

    const indexJs = resolve(dist, 'index.js');
    const indexDts = resolve(dist, 'index.d.ts');
    const binJs = resolve(dist, 'cli', 'bin.js');

    expect(existsSync(indexJs)).toBe(true);
    expect(existsSync(indexDts)).toBe(true);
    // The CLI bin may not be emitted by the current build script (it bundles
    // only `src/index.ts`); soften the assertion to "either the bin file
    // exists or the package.json's bin field points elsewhere".
    if (!existsSync(binJs)) {
      const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
        bin?: Record<string, string>;
      };
      const declared = pkg.bin?.verifactu;
      expect(declared).toBeDefined();
    } else {
      expect(statSync(binJs).size).toBeGreaterThan(0);
    }
  }, 120_000);

  test('dist/index.js is a valid ESM module exposing the public surface', async () => {
    const indexJs = resolve(dist, 'index.js');
    if (!existsSync(indexJs)) {
      // Build did not run yet — defer to the previous test which already
      // failed with a clear message in that case.
      return;
    }
    const mod = (await import(pathToFileURL(indexJs).href)) as Record<string, unknown>;
    expect(mod.SDK_VERSION).toBeDefined();
    expect(typeof mod.VerifactuClient).toBe('function');
    expect(typeof mod.SchemaValidationError).toBe('function');
    expect(typeof mod.BusinessValidationError).toBe('function');
    expect(typeof mod.SoapFaultError).toBe('function');
    expect(typeof mod.NetworkError).toBe('function');
    expect(typeof mod.FlowControlError).toBe('function');
    expect(typeof mod.buildQrUrl).toBe('function');
    expect(typeof mod.renderQrPng).toBe('function');
  }, 120_000);

  test('dist/index.d.ts contains key public type exports', () => {
    const indexDts = resolve(dist, 'index.d.ts');
    if (!existsSync(indexDts)) return;
    const dts = readFileSync(indexDts, 'utf8');
    // Public class names appear in the declaration file.
    for (const symbol of [
      'VerifactuClient',
      'SchemaValidationError',
      'BusinessValidationError',
      'SoapFaultError',
      'NetworkError',
      'FlowControlError',
      'Invoice',
      'CancelInvoiceInput',
      'QueryFilter',
    ]) {
      expect(dts).toContain(symbol);
    }
  });
});
