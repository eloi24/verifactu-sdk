# Alta bàsica

Emet una sola factura contra l'entorn de preproducció de l'AEAT.

La versió executable d'aquest script viu a `examples/basic-alta/`. Copia-la
al teu propi projecte i ajusta la ruta del certificat, el NIF i el número
de sèrie.

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
  description: 'Serveis de consultoria',
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
console.log('Estat:', response.envelopeState);
console.log('Registres:', response.records);
```

## Executar

```bash
cd examples/basic-alta
CERT_PASS=changeme bun run index.ts
```

## En què fixar-se

- `response.csv` és el *Código Seguro de Verificación* de l'AEAT —
  guarda'l per a finalitats d'auditoria.
- `response.records[0].state` reporta el resultat per registre.
- `response.waitSeconds` és el back-off que has de respectar abans de la
  següent crida. El SDK ja el respecta automàticament.
