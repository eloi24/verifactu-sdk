# Paginated query

`client.queryInvoices` returns an async iterable that paginates
transparently. You only deal with the cursor when you want to resume mid-way.

The runnable script lives at `examples/consulta-paginada/`.

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

console.log(`Total: ${total} records`);
```

## Filtering

Add filters to the query for narrower results:

```ts
for await (const page of client.queryInvoices({
  year: '2026',
  period: '05',
  seriesNumber: 'A/2026/0001',
  counterpart: { nif: '12345678Z', legalName: 'Customer SL' },
})) { /* ... */ }
```

## Resuming

If your process dies mid-iteration, persist the last cursor and resume from
it:

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
    /* ... process ... */
  }
  if (page.nextCursor !== undefined) {
    writeFileSync(cursorFile, JSON.stringify(page.nextCursor));
  }
}
```

The cursor is just an `InvoiceId` triple — it has no time-to-live, you can
store it indefinitely.
