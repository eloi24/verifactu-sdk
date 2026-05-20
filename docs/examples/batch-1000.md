# Batch of 1 000 invoices

The AEAT accepts up to 1 000 records per submission. This example sends a
full batch and lets the SDK chunk it / honour the `TiempoEsperaEnvio`
between chunks if needed.

The runnable script lives at `examples/batch-1000/`.

```ts
import { readFileSync } from 'node:fs';
import { VerifactuClient, Environment, type Invoice } from 'verifactu-sdk';

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
    systemName: 'Batch 1000 example',
    version: '1.0.0',
    installationNumber: '0001',
    onlyVerifactu: 'S',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});

function buildInvoice(index: number): Invoice {
  const seriesNumber = `BATCH/2026/${String(index).padStart(4, '0')}`;
  return {
    invoiceId: { issuerNif: 'B12345678', seriesNumber, issueDate: '2026-05-20' },
    invoiceType: 'F1',
    issuerName: 'My Company SL',
    description: `Service line #${index}`,
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
    generatedAt: new Date().toISOString(),
    billingSystem: {
      producerName: 'My Company SL',
      nif: 'B12345678',
      systemId: 'JC',
      systemName: 'Batch 1000 example',
      version: '1.0.0',
      installationNumber: '0001',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
      hasMultipleTaxpayers: 'N',
    },
    chainLink: { first: index === 0 },
    hash: '',
  };
}

const invoices: Invoice[] = Array.from({ length: 1000 }, (_, i) => buildInvoice(i));

const responses = await client.registerInvoiceBatch(invoices);

for (const [idx, response] of responses.entries()) {
  console.log(`Chunk ${idx}: ${response.envelopeState} (${response.records.length} records)`);
}
```

## What to expect

- The SDK splits the list into chunks of 1 000 (no split here — exactly 1 000
  records).
- The hash chain is maintained automatically: only the first record of the
  first chunk has `first: true`.
- Each chunk waits for the AEAT's `TiempoEsperaEnvio` before the next one
  is dispatched.

## Tip

Run with `VERIFACTU_DEBUG=1` to print every envelope and response to stderr:

```bash
VERIFACTU_DEBUG=1 CERT_PASS=changeme bun run index.ts 2> trace.log
```
