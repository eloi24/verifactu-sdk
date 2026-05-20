# Lote de 1 000 facturas

La AEAT acepta hasta 1 000 registros por envío. Este ejemplo envía un lote
completo y deja que el SDK lo trocee / respete el `TiempoEsperaEnvio` entre
chunks cuando haga falta.

El script ejecutable vive en `examples/batch-1000/`.

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
    description: `Línea de servicio #${index}`,
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
  console.log(`Chunk ${idx}: ${response.envelopeState} (${response.records.length} registros)`);
}
```

## Qué esperar

- El SDK trocea la lista en chunks de 1 000 (aquí no hay troceo — exactamente
  1 000 registros).
- La cadena de huellas se mantiene automáticamente: sólo el primer registro
  del primer chunk tiene `first: true`.
- Cada chunk espera el `TiempoEsperaEnvio` de la AEAT antes de despachar el
  siguiente.

## Truco

Ejecuta con `VERIFACTU_DEBUG=1` para imprimir cada sobre y respuesta a stderr:

```bash
VERIFACTU_DEBUG=1 CERT_PASS=changeme bun run index.ts 2> trace.log
```
