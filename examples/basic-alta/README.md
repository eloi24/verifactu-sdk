# basic-alta

Minimal example: register one invoice against the AEAT pre-production
environment.

## Prerequisites

- A pre-production certificate (PKCS#12 `.pfx`).
- Bun 1.3.14.

## Running

```bash
CERT_PASS=changeme \
VERIFACTU_CERT_PATH=./cert.pfx \
VERIFACTU_NIF=B12345678 \
bun run index.ts
```

The script prints the AEAT response (with the CSV) as JSON.

## What it covers

- Loading a certificate from disk.
- Constructing a `VerifactuClient`.
- Issuing a single invoice with one VAT breakdown line at 21 %.
- Letting the SDK compute the hash, chain link and generation timestamp.
