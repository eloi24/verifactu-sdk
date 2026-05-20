# Consulta paginada

`client.queryInvoices` retorna un async iterable que pagina de forma
transparent. Només tractes amb el cursor quan vols reprendre la consulta
des del mig.

L'script executable viu a `examples/consulta-paginada/`.

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
    systemName: 'Paginated query',
    version: '1.0.0',
    installationNumber: '0001',
    onlyVerifactu: 'S',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});

let total = 0;
for await (const page of client.queryInvoices({ year: '2026', period: '05' })) {
  for (const record of page.records) {
    console.log(record.invoiceId.seriesNumber, '→', record.state);
    total++;
  }
}

console.log(`Total: ${total} registres`);
```

## Filtrar

Afegeix filtres a la consulta per a resultats més estrets:

```ts
for await (const page of client.queryInvoices({
  year: '2026',
  period: '05',
  seriesNumber: 'A/2026/0001',
  counterpart: { nif: '12345678Z', legalName: 'Customer SL' },
})) { /* ... */ }
```

## Reprendre

Si el teu procés mor a mitja iteració, persisteix l'últim cursor i reprèn
des d'allà:

```ts
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import type { InvoiceId } from 'verifactu-sdk';

const cursorFile = './cursor.json';
const cursor: InvoiceId | undefined = existsSync(cursorFile)
  ? (JSON.parse(readFileSync(cursorFile, 'utf8')) as InvoiceId)
  : undefined;

for await (const page of client.queryInvoices({
  year: '2026',
  period: '05',
  ...(cursor !== undefined ? { cursor } : {}),
})) {
  for (const record of page.records) {
    /* ... processar ... */
  }
  if (page.nextCursor !== undefined) {
    writeFileSync(cursorFile, JSON.stringify(page.nextCursor));
  }
}
```

El cursor és només un triple `InvoiceId` — no té caducitat, el pots
guardar indefinidament.
