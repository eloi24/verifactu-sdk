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
