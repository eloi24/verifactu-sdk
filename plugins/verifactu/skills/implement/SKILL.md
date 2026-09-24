---
description: Implement AEAT Veri*Factu invoicing (registration, cancellation, hash chaining, QR, CLI) in a TypeScript/JS project using verifactu-sdk. Use when the user wants to add Veri*Factu or SIF invoicing support, integrate with the AEAT web services, register/cancel invoices, or generate the mandatory tax QR code.
---

# Implement Veri*Factu with verifactu-sdk

You are integrating a TypeScript/JS codebase with Spain's AEAT **Veri\*Factu** electronic
invoicing system (Real Decreto 1007/2023, Orden HAC/1177/2024) using the `verifactu-sdk`
npm package.

## Setup

```bash
bun add verifactu-sdk   # or npm i verifactu-sdk
```

Runtime: Bun ≥ 1.3.14 or Node ≥ 20. The caller needs an AEAT client certificate
(`.pfx`/`.p12` or PEM cert+key) issued to the taxpayer or an authorised representative.

## Core flow

1. Instantiate `VerifactuClient` with `environment` (`Environment.Preproduction` for testing,
   `Environment.Production` for real submissions), `mode` (`'verifactu'` for voluntary
   real-time submission, `'onRequest'` for the AEAT-mandated mode — the latter requires
   XAdES-BES enveloped signing, which the client handles automatically), the client
   certificate, `taxpayer`, and `billingSystem` identity.
2. Call `client.registerInvoice(invoice)` per invoice (`invoiceType` F1/F2/R1-R5, tax
   breakdown, recipients). The SDK computes the SHA-256 chained hash (`huella`) and, for
   on-request mode, the XAdES signature before submission.
3. Use `client.cancelInvoice(input)` to void a previously registered invoice.
4. Use `client.queryInvoices(filter)` to page through the AEAT-held ledger
   (`ConsultaLR`/`RespuestaConsultaLR`).
5. Render the mandatory tax QR with `client.renderQr(response, { format: 'png'|'svg'|'dataUrl', sizeMm })`.

Always ask for or infer: submission mode (verifactu vs on-request), environment
(pre/production), and whether the caller already holds a valid AEAT certificate — these
determine which client options are mandatory.

## Chaining and idempotency

Every invoice after the first in a taxpayer's chain must reference the previous record's
hash (`ChainLink`). `hashStore` is a **required** `VerifactuClient` constructor option —
there is no in-memory default, since a chain that can silently vanish on restart is a
compliance failure, not just a bug. Use one of the bundled database-backed adapters (each
is a separate subpath so unused drivers aren't pulled in):

| Adapter | Import | Driver |
| --- | --- | --- |
| `BunSqlHashStore` | `verifactu-sdk/store/bun-sql` | `Bun.sql` — zero extra dependency |
| `SqliteHashStore` | `verifactu-sdk/store/sqlite` | `bun:sqlite` — zero extra dependency |
| `BetterSqlite3HashStore` | `verifactu-sdk/store/better-sqlite3` | `better-sqlite3` — Node.js, no Bun needed |
| `PgHashStore` | `verifactu-sdk/store/pg` | `pg` (node-postgres) |
| `MysqlHashStore` | `verifactu-sdk/store/mysql` | `mysql2` |
| `RedisHashStore` | `verifactu-sdk/store/redis` | `ioredis` — never put this on an evicting cache instance or set a TTL on the key |
| `DrizzlePgHashStore` / `DrizzleMysqlHashStore` / `DrizzleSqliteHashStore` | `verifactu-sdk/store/drizzle` | `drizzle-orm` — pg/mysql/sqlite dialects, any driver |

```ts
import { SQL } from 'bun';
import { BunSqlHashStore } from 'verifactu-sdk/store/bun-sql';

const hashStore = new BunSqlHashStore(new SQL(process.env.DATABASE_URL!));
await hashStore.migrate(); // idempotent — creates verifactu_hash_chain if missing
```

The three Drizzle stores are the odd ones out: they never define or migrate a table —
the project must own it, generated with `bunx verifactu schema drizzle --provider
pg|mysql|sqlite --out <path>` (writes it to wherever the project keeps its Drizzle
schema) or hand-written to match the required `nif`/`invoiceId`/`hash` columns, then
pushed through the project's own drizzle-kit migrations:

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzlePgHashStore } from 'verifactu-sdk/store/drizzle';
import { verifactuHashChain } from './schema.js'; // generated/hand-written table

const db = drizzle(process.env.DATABASE_URL!);
const hashStore = new DrizzlePgHashStore(db, verifactuHashChain);
```

If the project already has a Drizzle setup, prefer the matching Drizzle store over the
raw-driver one (e.g. `DrizzlePgHashStore` over `PgHashStore` when Drizzle is already in
use) so the hash-chain table lives in the same schema/migrations as everything else.

Only write a custom `HashStore` implementation if the project's stack isn't one of the
above (a different DB, a different table shape) — don't hand-roll a database adapter when
a bundled one already fits.

## Multiple taxpayers / companies

`VerifactuClient` is single-tenant: `taxpayer` and `certificate` are constructor options,
one client instance per NIF. This is intentional, not a limitation to work around — each
taxpayer normally has its own distinct AEAT certificate (mTLS/XAdES), so a client can't
meaningfully serve more than one anyway. To issue invoices for several companies
(e.g. a gestoría/agency), instantiate one `VerifactuClient` per taxpayer/certificate and
share a single durable `HashStore` across all of them — `HashStore` already namespaces the
chain by NIF internally (`getLast`/`append` are keyed by `taxpayerNif`), so one store
instance is correct and sufficient. Do not build custom per-tenant routing inside
application code on top of a single client; that duplicates what the constructor option
already does and risks crossing chains between NIFs.

## Errors

Catch the SDK's typed errors, never a bare `Error`:

- `SchemaValidationError` — the invoice failed local Zod schema validation before it was
  ever sent.
- `BusinessValidationError` — failed one of the SDK's local business rules (NIF format,
  tax-rate consistency, etc.) mirroring the AEAT's own validations.
- `SoapFaultError` — the AEAT rejected the envelope or a record; inspect `.detail` and look
  up the code in `ERROR_CATALOG['<code>']` for the Spanish message + English translation +
  category (`envelope` rejects the whole submission, `record` rejects one record,
  `admissible` accepts with a warning to fix later).
- `NetworkError` — transport/mTLS failure.
- `FlowControlError` — exceeded the 1000-records-per-submission limit or violated
  `TiempoEsperaEnvio` pacing; the SDK enforces this automatically, this error means the
  caller bypassed the client's queuing.

## Reference

- Quickstart and full API: full docs at <https://eloi24.github.io/verifactu-sdk/>.
- Wire format is 1:1 with the AEAT XSDs cached in `schemas-aeat/` of the SDK's own repo —
  consult those (or the AEAT PDFs linked in the SDK README) for field-level semantics the
  SDK's TSDoc doesn't cover.
- Prefer the CLI (`bunx verifactu send|query|qr|validate`) for one-off/manual tasks instead
  of writing a throwaway script.
