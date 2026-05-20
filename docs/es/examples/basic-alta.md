# Alta básica

Emite una sola factura contra el entorno de pre-producción de la AEAT.

La versión ejecutable de este script vive en `examples/basic-alta/`. Cópiala
a tu propio proyecto y ajusta la ruta del certificado, el NIF y el número de
serie.

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
  description: 'Servicios de consultoría',
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
console.log('Estado:', response.envelopeState);
console.log('Registros:', response.records);
```

## Ejecutar

```bash
cd examples/basic-alta
CERT_PASS=changeme bun run index.ts
```

## En qué fijarse

- `response.csv` es el *Código Seguro de Verificación* de la AEAT — guárdalo
  para fines de auditoría.
- `response.records[0].state` reporta el resultado por registro.
- `response.waitSeconds` es el back-off que debes respetar antes de la
  siguiente llamada. El SDK ya lo respeta automáticamente.
