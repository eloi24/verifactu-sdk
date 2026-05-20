# Lote de 1 000 facturas

A AEAT acepta ata 1 000 rexistros por envío. Este exemplo envía un lote
completo e deixa que o SDK o trocee / respecte o `TiempoEsperaEnvio`
entre chunks cando faga falta.

O script executable vive en `examples/batch-1000/`.

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
    description: `Liña de servizo #${index}`,
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
  console.log(`Chunk ${idx}: ${response.envelopeState} (${response.records.length} rexistros)`);
}
```

## Que esperar

- O SDK trocea a lista en chunks de 1 000 (aquí non hai trocea —
  exactamente 1 000 rexistros).
- A cadea de pegadas mantense automaticamente: só o primeiro rexistro
  do primeiro chunk ten `first: true`.
- Cada chunk espera o `TiempoEsperaEnvio` da AEAT antes de despachar o
  seguinte.

## Truco

Executa con `VERIFACTU_DEBUG=1` para imprimir cada sobre e resposta a
stderr:

```bash
VERIFACTU_DEBUG=1 CERT_PASS=changeme bun run index.ts 2> trace.log
```
