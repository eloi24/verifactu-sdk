# Hash chain

Every record submitted to the AEAT carries a **huella** (literally, *fingerprint*)
— a 64-character uppercase hexadecimal SHA-256 digest that chains it to the
previous record from the same taxpayer. The chain is what makes the registry
tamper-evident: changing any past record invalidates every subsequent hash.

The full algorithm is specified in [*Especificaciones técnicas para generación
de la huella o hash de los registros de facturación* v0.1.2](https://www.agenciatributaria.es/static_files/AEAT_Desarrolladores/EEDD/IVA/VERI-FACTU/Veri-Factu_especificaciones_huella_hash_registros.pdf).
The SDK implements it verbatim; the three reference hashes in §6 of that PDF
are covered by unit tests and match byte-for-byte.

## Fields hashed

The hash is computed over a concatenation `name1=value1&name2=value2&…` with a
fixed, ordered list of fields per record type:

### `RegistroAlta` (eight fields)

| Order | Field name                  | Source                                |
| ----- | --------------------------- | ------------------------------------- |
| 1     | `IDEmisorFactura`           | `invoiceId.issuerNif`                 |
| 2     | `NumSerieFactura`           | `invoiceId.seriesNumber`              |
| 3     | `FechaExpedicionFactura`    | `invoiceId.issueDate` (DD-MM-YYYY)    |
| 4     | `TipoFactura`               | `invoiceType`                         |
| 5     | `CuotaTotal`                | `totalTaxAmount`                      |
| 6     | `ImporteTotal`              | `totalAmount`                         |
| 7     | `Huella` (previous record)  | `chainLink.previousHash` or empty     |
| 8     | `FechaHoraHusoGenRegistro`  | `generatedAt` (ISO 8601 with offset)  |

### `RegistroAnulacion` (five fields)

| Order | Field name                  | Source                                |
| ----- | --------------------------- | ------------------------------------- |
| 1     | `IDEmisorFacturaAnulada`    | `cancelledInvoiceId.issuerNif`        |
| 2     | `NumSerieFacturaAnulada`    | `cancelledInvoiceId.seriesNumber`     |
| 3     | `FechaExpedicionFacturaAnulada` | `cancelledInvoiceId.issueDate`    |
| 4     | `Huella` (previous record)  | `chainLink.previousHash` or empty     |
| 5     | `FechaHoraHusoGenRegistro`  | `generatedAt`                         |

## Normalisation

Before concatenation each value is normalised:

- **Trim** leading and trailing whitespace.
- **Numeric values** (`CuotaTotal`, `ImporteTotal`): trailing zeros after the
  decimal separator are irrelevant — `21.00` and `21` produce the same hash.
- **Dates** are emitted in the wire form `DD-MM-YYYY`.
- The bytes used for hashing are **UTF-8** of the resulting string.

## First record

For the very first record submitted by a taxpayer the `Huella` field of the
previous record is empty — the concatenation contains `…&Huella=&…`. Set
`chainLink.first = true` and omit the four `previous*` fields:

```ts
const first: Invoice = {
  /* ... */
  chainLink: { first: true },
};
```

## Subsequent records

For every subsequent record provide the full previous link:

```ts
const next: Invoice = {
  /* ... */
  chainLink: {
    first: false,
    previousIssuerNif: 'B12345678',
    previousSeriesNumber: 'A/2026/0001',
    previousIssueDate: '2026-05-20',
    previousHash: '3C13742B…A8F1',
  },
};
```

In practice the SDK fills this in for you when you go through `VerifactuClient`
— it remembers the last hash of the chain per-instance. You only deal with the
link manually when you store records offline and resume the chain later.

## Persisting the chain (`HashStore`)

`VerifactuClient` doesn't remember the chain by itself — it delegates to a
pluggable `HashStore` (`getLast(nif)` / `append(nif, entry)`). `hashStore` is a
**required** constructor option with no default: the SDK has no built-in
in-memory fallback, since a chain that can silently vanish on restart is a
compliance failure, not just a bug. Always pass a durable, database-backed
`HashStore`.

The SDK ships adapters for the most common stacks as separate subpath
exports, so you only pull in the driver you actually use:

| Adapter | Import | Backing driver |
| --- | --- | --- |
| `BunSqlHashStore` | `verifactu-sdk/store/bun-sql` | `Bun.sql` (built into Bun, no extra dependency) |
| `SqliteHashStore` | `verifactu-sdk/store/sqlite` | `bun:sqlite` (built into Bun, no extra dependency) |
| `BetterSqlite3HashStore` | `verifactu-sdk/store/better-sqlite3` | [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (Node.js, no Bun needed) |
| `PgHashStore` | `verifactu-sdk/store/pg` | [`pg`](https://node-postgres.com) |
| `MysqlHashStore` | `verifactu-sdk/store/mysql` | [`mysql2`](https://sidorares.github.io/node-mysql2) |
| `RedisHashStore` | `verifactu-sdk/store/redis` | [`ioredis`](https://github.com/redis/ioredis) |
| `BunRedisHashStore` | `verifactu-sdk/store/bun-redis` | `Bun.RedisClient` (built into Bun, no extra dependency) |
| `DrizzlePgHashStore` / `DrizzleMysqlHashStore` / `DrizzleSqliteHashStore` | `verifactu-sdk/store/drizzle` | [Drizzle ORM](https://orm.drizzle.team) — pg/mysql/sqlite dialects, any driver, your own table |

```ts
import { SQL } from 'bun';
import { BunSqlHashStore } from 'verifactu-sdk/store/bun-sql';

const sql = new SQL(process.env.DATABASE_URL!);
const hashStore = new BunSqlHashStore(sql);
await hashStore.migrate(); // creates the verifactu_hash_chain table, idempotent

const client = new VerifactuClient({ certificate, taxpayer, billingSystem, hashStore });
```

Every non-Drizzle adapter ships its own `migrate()` to create the
`verifactu_hash_chain` table. The three Drizzle stores are different: they
never define or migrate a table themselves — you pass your own, generated
with `bunx verifactu schema drizzle --provider pg|mysql|sqlite --out <path>`
(the "schema route" — wherever your Drizzle schema lives) or hand-written to
match the required `nif`/`invoiceId`/`hash` column shape, then pushed through
drizzle-kit alongside the rest of your schema:

```ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzlePgHashStore } from 'verifactu-sdk/store/drizzle';
import { verifactuHashChain } from './schema.js'; // generated/hand-written table

const db = drizzle(process.env.DATABASE_URL!);
const hashStore = new DrizzlePgHashStore(db, verifactuHashChain);
```

Redis needs no migration, but **do not** put it on a cache instance with
eviction (`maxmemory-policy allkeys-lru`) or a TTL — losing the chain-tail key
breaks the chain for that taxpayer.

None of these dependencies are bundled — they're `peerDependencies` with
`optional: true`, so `pg`/`ioredis`/`drizzle-orm`/`mysql2` are only required
if you actually import that adapter.

If your store is shared across processes, make sure `getLast` + `append` are
read-modify-write safe (a transaction or row lock around the pair) so two
concurrent submissions for the same NIF can never observe the same "previous
hash" — see the `HashStore` TSDoc for details. To wire your own store instead
(a different table shape, a different DB), implement the two-method
`HashStore` interface directly.

## Multiple taxpayers

`VerifactuClient` is single-tenant — `taxpayer` and `certificate` are
constructor options, one client per NIF, since each taxpayer normally has its
own AEAT certificate anyway. `HashStore` is already multi-tenant at the
storage level (`getLast`/`append` are keyed by NIF), so issuing invoices for
several companies (e.g. an accounting firm managing clients) means
instantiating one `VerifactuClient` per taxpayer/certificate and sharing a
single durable `HashStore` across all of them.

## Rejected records stay in the chain

Every record chains to the last record the system **generated**, whether the
AEAT accepted it or not (Orden HAC/1177/2024 art. 7.i). A record rejected as
`Incorrecto` never reaches the AEAT's ledger, but it is still the previous
record of the next one, so the client persists its hash like any other. Fix a
rejection with a new *alta de subsanación* (`correction: 'S'`,
`priorRejection: 'X'`) — never by rewinding the chain.

Within `registerBatch`, records chain to each other in submission order, across
chunks.

### Retries and lost responses

`generatedAt` is part of the hash. Persist it before the first submission and
reuse it on every retry: against the same tail, the same invoice then hashes
identically. If the lost attempt did reach the AEAT, the retry comes back
`Incorrecto` with error `3000` and a `duplicateRecord` whose `state` is
`'Correcta'` or `'AceptadaConErrores'` — the invoice is already registered and
the local chain matches the AEAT's. Retrying with a new `generatedAt` produces
a different hash and leaves the local chain disagreeing with the AEAT's. An old
`generatedAt` may draw the admissible warning `2004`.

```ts
const result = response.records[0];
const alreadyRegistered =
  result?.errorCode === 3000 &&
  (result.duplicateRecord?.state === 'Correcta' ||
    result.duplicateRecord?.state === 'AceptadaConErrores');
```

## Computing a hash manually

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const hash = computeRegistroAltaHash(record, null /* first record */);
// → "3C13742B...A8F1"  (64 uppercase hex chars)
```

The function is pure — no I/O, no side effects — and is exposed via
`verifactu-sdk/hash`. It throws `SchemaValidationError` if you pass a malformed
`previousHash`.

## Verifying

Given a record and its predecessor, you can recompute the hash and compare:

```ts
import { computeRegistroAltaHash } from 'verifactu-sdk/hash';

const expected = computeRegistroAltaHash(current, previous.hash);
if (expected !== current.hash) {
  throw new Error('Chain broken!');
}
```

The AEAT does this server-side on every submission. A mismatch raises error
**2000** (admissible — the record is accepted but flagged for *subsanación*).

## Reset / replay

If you lose the local chain state (database wipe, certificate rotation) you
must re-query the AEAT for the last accepted record, take its `Huella` field
and resume from there:

```ts
const lastPage = await firstPage(client.queryInvoices({ year: '2026', period: '05' }));
const last = lastPage.records.at(-1);
// → resume the chain using last.invoiceId + the hash stored in your DB
```

## Performance

The hash is a single SHA-256 over a short string (typically under 1 KB), so a
single record hashes in microseconds. The bottleneck of the chain is the
sequential AEAT call: the SDK serialises `registerInvoice` calls per-instance
so the chain is never broken by concurrency.

## Next

- [QR code](./qr-code.md) — also relies on the invoice identifier.
- [Validations](./validations.md) — rule 23 checks the hash shape locally.
- [Flow control](./flow-control.md) — why submissions are serialised.
