# batch-1000

Submit 1 000 invoices in one batch and observe how the SDK honours
`TiempoEsperaEnvio` between chunks.

## Prerequisites

- A pre-production certificate (PKCS#12 `.pfx`).
- Bun ≥ 1.1.

## Running

```bash
CERT_PASS=changeme \
VERIFACTU_CERT_PATH=./cert.pfx \
VERIFACTU_NIF=B12345678 \
bun run index.ts
```

The AEAT pre-production environment will rate-limit you — that is the point.
Each chunk's response prints the `waitSeconds` the SDK observed before the
next call.

## Notes

- The script reuses the same `seriesNumber` prefix derived from `Date.now()`
  so re-running it does not collide with itself.
- Only the very first record sets `chainLink.first = true`; the SDK chains
  the remainder automatically.
