# Quickstart

Register your first invoice against the AEAT pre-production environment in under
thirty lines. The flow is the same against production — only the `environment`
flag and the certificate change.

## Prerequisites

1. An AEAT-issued mTLS certificate in `.pfx` (PKCS#12) or PEM form. See
   [Certificates](./certificates.md) for how to obtain it.
2. Bun ≥ 1.1 (or Node ≥ 20).
3. The SDK installed in your project (`bun add verifactu-sdk`).

## Minimal client setup

```ts
import { VerifactuClient, Environment } from 'verifactu-sdk';
import { readFileSync } from 'node:fs';

const client = new VerifactuClient({
  environment: Environment.Preproduction,
  mode: 'verifactu',
  certificate: {
    pfx: readFileSync('./cert.pfx'),
    passphrase: process.env.CERT_PASS ?? '',
  },
  taxpayer: { nif: 'B12345678', legalName: 'My Company SL' },
  billingSystem: {
    producerName: 'My Company SL',
    nif: 'B12345678',
    systemId: 'JC',
    systemName: 'My App',
    version: '1.0.0',
    installationNumber: '0001',
    onlyVerifactu: 'S',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});
```

The client owns the hash chain, the flow controller (which respects the
`TiempoEsperaEnvio` returned by the AEAT) and the per-call validator. You only
need one instance per taxpayer.

## Registering an invoice

```ts
const response = await client.registerInvoice({
  invoiceId: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
  },
  invoiceType: 'F1',
  description: 'Consulting services — May 2026',
  recipients: [{ nif: '12345678Z', legalName: 'Customer SL' }],
  breakdown: [
    {
      tax: '01',
      regimeKey: '01',
      operationQualification: 'S1',
      taxRate: '21',
      taxBase: '100.00',
      taxAmount: '21.00',
    },
  ],
  totalTaxAmount: '21.00',
  totalAmount: '121.00',
});

console.log(response.csv);            // → AEAT CSV (Código Seguro de Verificación)
console.log(response.envelopeState);  // → 'Correcto' | 'ParcialmenteCorrecto' | 'Incorrecto'
console.log(response.records[0]?.state);
```

The `response.records` array carries one entry per submitted invoice with its
per-record outcome (`Correcto`, `AceptadoConErrores` or `Incorrecto`) and any
AEAT error code. See [Error codes](./error-codes.md) for the full catalog.

## Rendering the mandatory QR

Every invoice issued under VERI*FACTU **must** carry a QR code linking back to the
AEAT validation portal. The SDK renders it for you in PNG, SVG or DataURL form.

```ts
import { buildQrUrl, renderQrPng } from 'verifactu-sdk/qr';

const url = buildQrUrl({
  mode: 'verifactu',
  environment: 'production',
  invoice: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
    totalAmount: '121.00',
  },
});

const png = await renderQrPng(url, { sizeMm: 35 });
// → Buffer ready to embed in your PDF/HTML invoice.
```

The QR size must be 30–40 mm per the AEAT specification. See the
[QR guide](./qr-code.md) for the layout requirements.

## Querying previously submitted invoices

In `verifactu` mode (only) the AEAT exposes a paginated query endpoint. The SDK
returns an async iterable so you never have to manage cursors yourself.

```ts
for await (const page of client.queryInvoices({ year: '2026', period: '05' })) {
  for (const record of page.records) {
    console.log(record.invoiceId.seriesNumber, record.state);
  }
}
```

## Cancelling

```ts
await client.cancelInvoice({
  cancelledInvoiceId: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
  },
  generatedBy: 'E',
});
```

## Where to go next

- [Hash chain](./hash-chain.md) — how the SDK chains records and what the AEAT verifies.
- [Validations](./validations.md) — the 23 business rules enforced locally.
- [Flow control](./flow-control.md) — how the SDK respects `TiempoEsperaEnvio` and
  the 1 000-record-per-submission limit.
- [Testing](./testing.md) — running the e2e suite against AEAT pre-production.
