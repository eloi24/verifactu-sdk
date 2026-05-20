# Alta básica

Emite unha soa factura contra o ambiente de pre-produción da AEAT.

A versión executable deste script vive en `examples/basic-alta/`. Cópiao
ao teu propio proxecto e axusta a ruta do certificado, o NIF e o número
de serie.

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
  description: 'Servizos de consultoría',
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
console.log('Rexistros:', response.records);
```

## Executar

```bash
cd examples/basic-alta
CERT_PASS=changeme bun run index.ts
```

## En que fixarse

- `response.csv` é o *Código Seguro de Verificación* da AEAT — gárdao
  para finalidades de auditoría.
- `response.records[0].state` reporta o resultado por rexistro.
- `response.waitSeconds` é o back-off que debes respectar antes da
  seguinte chamada. O SDK xa o respecta automaticamente.
