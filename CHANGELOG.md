# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/eloi24/verifactu-sdk/commits/main
