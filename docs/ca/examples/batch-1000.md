# Lot de 1 000 factures

L'AEAT accepta fins a 1 000 registres per enviament. Aquest exemple envia
un lot complet i deixa que el SDK el trosegi / respecti el
`TiempoEsperaEnvio` entre chunks quan calgui.

L'script executable viu a `examples/batch-1000/`.

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
    description: `Línia de servei #${index}`,
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
  console.log(`Chunk ${idx}: ${response.envelopeState} (${response.records.length} registres)`);
}
```

## Què esperar

- El SDK trosseja la llista en chunks de 1 000 (aquí no hi ha trossejament
  — exactament 1 000 registres).
- La cadena d'empremtes es manté automàticament: només el primer registre
  del primer chunk té `first: true`.
- Cada chunk espera el `TiempoEsperaEnvio` de l'AEAT abans de despatxar
  el següent.

## Truc

Executa amb `VERIFACTU_DEBUG=1` per imprimir cada sobre i resposta a
stderr:

```bash
VERIFACTU_DEBUG=1 CERT_PASS=changeme bun run index.ts 2> trace.log
```
