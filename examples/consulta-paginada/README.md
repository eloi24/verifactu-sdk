# consulta-paginada

Iterate the AEAT paginated query for a given fiscal period.

## Prerequisites

- A pre-production certificate (PKCS#12 `.pfx`).
- Bun ≥ 1.1.

## Running

```bash
CERT_PASS=changeme \
VERIFACTU_CERT_PATH=./cert.pfx \
VERIFACTU_NIF=B12345678 \
QUERY_YEAR=2026 \
QUERY_PERIOD=05 \
bun run index.ts
```

If `QUERY_YEAR` / `QUERY_PERIOD` are omitted, the script defaults to the
current year and month.

## What it covers

- `for await (const page of client.queryInvoices(...))` — paginated iteration.
- Per-record state (`Correcto`, `AceptadoConErrores`, `Anulado`).
- `lastModifiedAt` for tracking AEAT-side changes.
