# no-verifactu-firmado

Submit a record under an AEAT requirement (on-request mode). Each record is
signed XAdES-BES enveloped before transmission.

## Prerequisites

- A pre-production certificate (PKCS#12 `.pfx`).
- An AEAT `Requerimiento` reference number (e.g. `REQ-2026-000123`).
- Bun 1.3.14.

## Running

```bash
CERT_PASS=changeme \
VERIFACTU_CERT_PATH=./cert.pfx \
VERIFACTU_NIF=B12345678 \
REQUIREMENT_REF=REQ-2026-000123 \
bun run index.ts
```

## What it covers

- `mode: 'onRequest'` selecting the `…/RequerimientoSOAP` endpoint family.
- `onRequestHeader.requirementReference` populating the envelope header.
- The SDK signing each record with XAdES-BES enveloped before sending.
