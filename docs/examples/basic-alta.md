# Basic registration

Issue a single invoice against the AEAT pre-production environment.

The runnable version of this script lives at `examples/basic-alta/`. Copy it
into your own project and adjust the certificate path, NIF and series number.

```ts
import { readFileSync } from 'node:fs';
import { VerifactuClient, Environment } from 'verifactu-sdk';

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
    systemName: 'Basic Alta example',
    version: '1.0.0',
    installationNumber: '0001',
    onlyVerifactu: 'S',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});

const response = await client.registerInvoice({
  invoiceId: {
    issuerNif: 'B12345678',
    seriesNumber: 'A/2026/0001',
    issueDate: '2026-05-20',
  },
  invoiceType: 'F1',
  issuerName: 'My Company SL',
  description: 'Consulting services',
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

console.log('CSV:', response.csv);
console.log('State:', response.envelopeState);
console.log('Records:', response.records);
```

## Running

```bash
cd examples/basic-alta
CERT_PASS=changeme bun run index.ts
```

## What to look at

- `response.csv` is the AEAT *Código Seguro de Verificación* — keep it for
  audit purposes.
- `response.records[0].state` reports the per-record outcome.
- `response.waitSeconds` is the back-off you must respect before the next
  call. The SDK already honours it automatically.
