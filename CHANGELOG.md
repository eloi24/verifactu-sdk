# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.2] - 2026-09-28

### Added

- `RegisterInvoiceInput` and `CancelInvoiceRequest`, the inputs of `registerInvoice`, `cancelInvoice` and `registerBatch`: `billingSystem`, `chainLink` and `hash` are optional there. A full `Invoice` / `CancelInvoiceInput` is still accepted.
- `RegisterInvoiceRecordResult.duplicateRecord` (and the `DuplicateRecordState` type): the AEAT's `RegistroDuplicado` block was already parsed but typed away, so callers could not tell "already registered" (error `3000` with a stored `Correcta` / `AceptadaConErrores` record — e.g. a retry after a lost response) from a real rejection.

### Changed

- `engines.bun` is `>=1.3.14` instead of exactly `1.4.2`.
- `parseSoapFault` also accepts a whole `SoapFaultDetail`, whose fields it copies onto the error.

### Fixed

- **`VerifactuClientOptions.billingSystem` was never used.** Every record had to carry its own `billingSystem`; a record without one now gets the client's, and one that has its own keeps it.
- **`chainLink` and `hash` were required input**, although the client always overwrites them from the `HashStore`. They are now optional; the computed chain and hash are unchanged.
- **A SOAP fault surfaced as `NetworkError`.** The AEAT sends envelope rejections as a SOAP fault with HTTP 500, which the transport threw as a non-retryable `NetworkError` before reading the body, so `SoapFaultError` was never thrown. A 500 with a fault body now throws `SoapFaultError` carrying `faultcode`, `faultstring`, `detail` and, when the `faultstring` embeds a `Codigo[XXXX]` known to `ERROR_CATALOG`, its `code` and `category`. Every other failure (socket errors, timeouts, 408/429/503/504, a 500 without a SOAP fault) is still a `NetworkError` with the same retry semantics.
- **The Drizzle `HashStore` adapters rejected a database built with a schema.** `DrizzlePgHashStore`, `DrizzleMysqlHashStore` and `DrizzleSqliteHashStore` took the dialect's database type with its default empty schema, so `drizzle(client, { schema })` did not type-check without a cast. They are now generic over the full schema and its relational config; no runtime change.
- `SDK_VERSION` (and so the default `User-Agent`) still said `0.1.0`.
- **`registerBatch` chained every record to the same previous record.** All records were hashed against the stored tail before any was persisted, so records 2..n of a batch all declared the same `RegistroAnterior`. The AEAT accepts that silently (error `2000` only checks each hash against the predecessor it declares), leaving a forked chain. Records now chain to each other in order, across chunks.
- **`registerBatch` skipped rejected records when persisting the chain**, unlike `registerInvoice`/`cancelInvoice`. The chain links every record *generated*, accepted or not (Orden HAC/1177/2024 art. 7.i), so the tail is now the last record of each answered chunk, whatever its state.
- **`registerBatch` persisted a chunk only after yielding its response**, so a caller that stopped iterating early (`break`) lost an answered chunk from the chain. It now persists before yielding.
- **Concurrent calls on one client could fork the chain.** `FlowController` serialised only the SOAP call; reading the tail and hashing happened before it. A per-client lock now covers read tail → hash → submit → append for `registerInvoice`, `cancelInvoice` and `registerBatch`, which is what the docs already promised.

### Documentation

- Hash chain guide: rejected records stay in the chain, and the retry contract — persist `generatedAt` and reuse it on retries so a retry after a lost response reproduces the stored hash.

## [0.2.1] - 2026-09-24

### Fixed

- **Release to npm** failed on `bun install`: `better-sqlite3` 13 and its `node-gyp` fallback both require Node 22+, but the workflow pinned Node 20. Bumped to Node 24.

## [0.2.0] - 2026-09-22

### Added

- Initial repository scaffolding: TypeScript + Bun, Biome, MIT license.
- Project plan, README and multilingual documentation skeleton.
- Foundational tasks for the seven specialised teams (schemas, protocol, crypto, validators, qr-cli, testing, docs-devops).
- Database-backed `HashStore` adapters as separate subpath exports: `verifactu-sdk/store/{bun-sql,sqlite,better-sqlite3,pg,mysql,redis,bun-redis,drizzle}`, each with its own optional peer dependency so unused drivers are never pulled in.
- `BunRedisHashStore` (`verifactu-sdk/store/bun-redis`): a Redis adapter backed by Bun's native `RedisClient`, zero extra dependency beyond the Bun runtime.
- A Claude Code plugin marketplace (`.claude-plugin/`, `plugins/verifactu/`) with `implement` and `audit` skills.
- `verifactu schema drizzle --provider pg|mysql|sqlite --out <path>` CLI command: generates a starting Drizzle table for the `Drizzle{Pg,Mysql,Sqlite}HashStore` adapters into your own schema.

### Changed

- **Breaking:** the Drizzle `HashStore` adapter is now three classes — `DrizzlePgHashStore`, `DrizzleMysqlHashStore`, `DrizzleSqliteHashStore` (still all under `verifactu-sdk/store/drizzle`) — instead of one Postgres-only `DrizzleHashStore`. All three now take the table as a constructor argument instead of using a hardcoded exported table, so the hash-chain table lives in your own schema/drizzle-kit migrations; generate one with the new `verifactu schema drizzle` command.

### Fixed

- The `./schemas`, `./errors`, `./validators`, `./qr` and `./hash` subpath exports resolved to a `.d.ts` with no matching `.js`/`.cjs` at runtime — `scripts/build.ts` only ever bundled `src/index.ts`. Every entry declared in `package.json`'s `exports` map is now bundled.
- The published CLI binary (`dist/cli/bin.js`) had a syntax error from a duplicated shebang line — Bun's bundler already preserves the entry file's own shebang, and the build script was appending a second one on top instead of replacing it. Verified the built binary now runs under both Bun and plain Node.
- CI/local `bun test --coverage` crashed with a NAPI panic while loading `better-sqlite3`'s native bindings under Bun 1.3.14 — bumped the pinned Bun version to 1.4.2 (`package.json`, `.github/workflows/*.yml`).

### Removed

- **Breaking:** `InMemoryHashStore` and its export. `VerifactuClientOptions.hashStore` is now a required constructor option with no default — a chain that can silently vanish on restart is a compliance failure, not something the SDK should paper over with a convenience default. Pass one of the new bundled adapters (`verifactu-sdk/store/{bun-sql,sqlite,better-sqlite3,pg,mysql,redis,drizzle}`) or your own `HashStore` implementation.

[Unreleased]: https://github.com/eloi24/verifactu-sdk/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/eloi24/verifactu-sdk/releases/tag/v0.2.2
[0.2.1]: https://github.com/eloi24/verifactu-sdk/releases/tag/v0.2.1
[0.2.0]: https://github.com/eloi24/verifactu-sdk/releases/tag/v0.2.0
