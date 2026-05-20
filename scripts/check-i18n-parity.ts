#!/usr/bin/env bun
/**
 * Verify that every English documentation file under `docs/guide/` has a
 * translated counterpart in each of the three secondary locales (`es`, `ca`,
 * `gl`). Basque (`eu`) is planned for a future release.
 *
 * Exit code:
 *
 * - `0` — every locale tree is a strict mirror of the English tree.
 * - `1` — at least one file is missing or extraneous in a locale; a report is
 *         printed to stdout.
 *
 * The script is intentionally dependency-free (Bun's stdlib only) so it can
 * run in `prepublishOnly` and CI without pulling extras.
 *
 * @see {@link ../CLAUDE.md | Project conventions §Documentation}
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, posix, relative, resolve, sep } from 'node:path';

/** Locales mirrored under `docs/`. The English source lives at the root. */
const LOCALES = ['es', 'ca', 'gl'] as const;

/** Root directory of the English source of truth. */
const ENGLISH_GUIDE_REL = 'docs/guide';

/**
 * Recursively walk a directory and return every regular-file path it contains,
 * relative to the supplied root. Paths use POSIX separators so they compare
 * across operating systems.
 *
 * @param root - Directory to walk. Returned paths are relative to this.
 * @param sub - Internal accumulator (initially the empty string).
 * @returns A sorted list of POSIX-style relative paths.
 */
export function walkFiles(root: string, sub = ''): string[] {
  const out: string[] = [];
  const absolute = sub.length === 0 ? root : join(root, sub);
  if (!existsSync(absolute)) return out;
  for (const entry of readdirSync(absolute)) {
    const fullPath = join(absolute, entry);
    const relativePath = sub.length === 0 ? entry : posix.join(sub, entry);
    const info = statSync(fullPath);
    if (info.isDirectory()) {
      out.push(...walkFiles(root, relativePath));
    } else if (info.isFile()) {
      out.push(relativePath.split(sep).join('/'));
    }
  }
  return out.sort();
}

/** Result of comparing one locale tree against the English source. */
export interface ParityIssue {
  /** Locale code (`'es'`, `'ca'`, …). */
  readonly locale: string;
  /** Files present in English but missing in this locale. */
  readonly missing: readonly string[];
  /** Files present in this locale but absent in English. */
  readonly extra: readonly string[];
}

/**
 * Compare every locale's guide tree against the English source.
 *
 * @param repoRoot - Absolute path to the repository root.
 * @returns One {@link ParityIssue} per locale (issues with empty `missing`
 *   and `extra` arrays mean the locale is in sync).
 */
export function checkI18nParity(repoRoot: string): ParityIssue[] {
  const englishRoot = resolve(repoRoot, ENGLISH_GUIDE_REL);
  const englishFiles = new Set(walkFiles(englishRoot));
  const issues: ParityIssue[] = [];
  for (const locale of LOCALES) {
    const localeRoot = resolve(repoRoot, 'docs', locale, 'guide');
    const localeFiles = new Set(walkFiles(localeRoot));
    const missing: string[] = [];
    const extra: string[] = [];
    for (const file of englishFiles) {
      if (!localeFiles.has(file)) missing.push(file);
    }
    for (const file of localeFiles) {
      if (!englishFiles.has(file)) extra.push(file);
    }
    issues.push({ locale, missing, extra });
  }
  return issues;
}

/**
 * Pretty-print the parity issues to stdout.
 *
 * @param issues - The issues to format.
 * @returns `true` if every locale is in sync, `false` otherwise.
 */
export function reportIssues(issues: readonly ParityIssue[]): boolean {
  let allOk = true;
  for (const issue of issues) {
    if (issue.missing.length === 0 && issue.extra.length === 0) {
      console.log(`[i18n] ${issue.locale}: OK`);
      continue;
    }
    allOk = false;
    console.log(`[i18n] ${issue.locale}: out of sync`);
    if (issue.missing.length > 0) {
      console.log(`  Missing ${issue.missing.length} file(s):`);
      for (const file of issue.missing) console.log(`    - ${file}`);
    }
    if (issue.extra.length > 0) {
      console.log(`  Extra ${issue.extra.length} file(s):`);
      for (const file of issue.extra) console.log(`    + ${file}`);
    }
  }
  return allOk;
}

if (import.meta.main) {
  const repoRoot = resolve(import.meta.dir, '..');
  const englishRoot = resolve(repoRoot, ENGLISH_GUIDE_REL);
  if (!existsSync(englishRoot)) {
    console.log(
      `[i18n] English source directory not found at ${relative(repoRoot, englishRoot)} — skipping parity check.`,
    );
    process.exit(0);
  }
  const issues = checkI18nParity(repoRoot);
  const ok = reportIssues(issues);
  process.exit(ok ? 0 : 1);
}
