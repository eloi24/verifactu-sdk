# Project conventions for Claude Code agents

This file is automatically loaded into every Claude session opened in this repository. It documents the non-negotiable conventions that all agents (tech-lead, schemas-team, protocol-team, crypto-team, validators-team, qr-cli-team, testing-team, docs-devops-team) must follow.

## Documentation

**Every exported symbol must have a JSDoc/TSDoc block.** This is mandatory, not optional.

The block must include:

- A one-line summary on the first line.
- A longer description if the symbol's behaviour is non-obvious.
- `@param` for every parameter, with type description (TypeScript already encodes the type; the JSDoc adds intent).
- `@returns` for non-void functions, describing the meaningful contents.
- `@throws` for every error class the function can throw — naming the concrete class (`SchemaValidationError`, `SoapFaultError`, …) and the conditions.
- `@example` with at least one runnable snippet for any public-API symbol.
- `@see` linking to AEAT spec sections when the code implements a specific rule (e.g. `@see {@link https://...}#3.1.3 rule 1`).
- `@remarks` for invariants, performance notes, thread-safety, hidden coupling.
- `@deprecated`, `@experimental`, `@internal` when applicable. `@internal` symbols are excluded from the published TypeDoc.

Non-exported symbols (private functions, internal helpers) still get a one-line JSDoc summary explaining intent — never just the implementation.

TypeDoc is configured to **fail the build** on missing documentation for any non-`@internal` exported symbol. `bun run docs:build` is part of CI.

### Example

```ts
/**
 * Compute the chained SHA-256 hash for an `RegistroAlta` record.
 *
 * Implements the algorithm described in the AEAT "Especificaciones técnicas para
 * generación de la huella o hash de los registros de facturación" v0.1.2, §3.
 * The eight fields are concatenated in the documented order separated by `&`,
 * UTF-8 encoded and hashed; the output is the 64-char uppercase hexadecimal
 * digest.
 *
 * @param record - The invoice record to hash. Numeric values may use one or
 *   two decimals — trailing zeros are normalised before concatenation.
 * @param previousHash - Hash of the previous record in the chain, or `null`
 *   when this is the first record (in which case `&Huella=&` is emitted).
 * @returns The 64-character uppercase hexadecimal SHA-256 digest.
 * @throws {SchemaValidationError} If `previousHash` is non-null but does not
 *   match the expected `/^[0-9A-F]{64}$/` shape.
 * @see {@link https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf | Spec v0.1.2 §3}
 * @example
 * ```ts
 * const hash = computeRegistroAltaHash(record, null);
 * // → "3C13...A8F1"
 * ```
 */
export function computeRegistroAltaHash(record: RegistroAlta, previousHash: string | null): string;
```

## Language

- **All identifiers, comments, JSDoc, error messages, CLI text, README and code-level docs are in English.**
- Spanish is permitted **only** when the AEAT wire format requires it:
  - XML element/attribute names (`RegistroAlta`, `IDFactura`, `CuotaRepercutida`…).
  - Enum string values defined by the AEAT (`"F1"`, `"S1"`, `"E1"`…).
  - The verbatim text from `errores.properties` (kept in the catalog with an `englishMessage` companion field).
- Documentation site (under `docs/`) is multilingual: English root + Spanish, Catalan, Galician. Basque is planned for a future release.

## Toolchain

- **Bun** is the only runner: install, scripts, tests, build. Do not invoke `npm`/`yarn`/`pnpm` (except `npm publish` at release time).
- **Biome** is the only linter/formatter. Do not add ESLint, Prettier, etc.
- **TypeScript** for typecheck and `.d.ts` emission only.
- All commands live in `package.json` scripts and are reachable via `bun run <name>`.

## Code style

- TypeScript strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`. Do not use `any` (Biome enforces this).
- Prefer named exports; avoid default exports.
- Use `import type` when only types are imported (Biome enforces this).
- Use `node:` protocol for Node built-ins (`import { readFile } from 'node:fs/promises'`).
- Single quotes, 2-space indent, line width 100, semicolons on, trailing commas everywhere (configured in `biome.json`).
- No `console.log` outside `src/cli/**` (Biome rule). Use the SDK's error classes or rethrow.

## Errors

- Never throw bare `Error`. Use one of `VerifactuError`, `SchemaValidationError`, `BusinessValidationError`, `SoapFaultError`, `NetworkError`, `FlowControlError`.
- Every thrown error must include the offending field/path when known and the AEAT code when applicable.

## Tests

- Co-locate by mirror: `src/foo/bar.ts` ↔ `test/unit/foo/bar.spec.ts`.
- Golden fixtures (hash, QR, XML) must match the AEAT spec byte-for-byte. Do not edit them to make tests pass; fix the implementation.
- Public types are pinned via `tsd` in `test/types/*.test-d.ts`.

## Git

- The maintainer has a global `commit.template` that already adds the Claude co-author trailer. **Do not** append `Co-Authored-By` in HEREDOCs — git adds it automatically.
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, scoped by module (`feat(qr):`).
- Never amend, force-push or skip hooks.

## Agent teams (when working in a team)

- Stick to the path scopes assigned in the plan (see `C:\\Users\\ebaulenas\\.claude\\plans\\https-www-agenciatributaria-es-aeat-desa-goofy-finch.md`).
- Use `SendMessage` to talk to other teammates by name; do not edit their files.
- Mark your task `in_progress` before starting, `completed` when finished. Don't batch.
- When you find work outside your scope, create a task with `TaskCreate` and notify the tech-lead instead of doing it yourself.
