/**
 * Example: iterate the AEAT paginated query for a given period.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { VerifactuClient } from '../../src/index.ts';

const certificatePath = process.env.VERIFACTU_CERT_PATH ?? './cert.pfx';
const passphrase = process.env.CERT_PASS ?? '';
const taxpayerNif = process.env.VERIFACTU_NIF ?? 'B12345678';
const year = process.env.QUERY_YEAR ?? new Date().getFullYear().toString();
const period = process.env.QUERY_PERIOD ?? String(new Date().getMonth() + 1).padStart(2, '0');

const client = new VerifactuClient({
  environment: 'preproduction',
  mode: 'verifactu',
  certificate: { pfx: readFileSync(certificatePath), passphrase },
  taxpayer: { nif: taxpayerNif, legalName: 'My Company SL' },
  billingSystem: {
    producerName: 'My Company SL',
    nif: taxpayerNif,
    systemId: 'JC',
    systemName: 'Paginated query example',
    version: '1.0.0',
    installationNumber: '0001',
    onlyVerifactu: 'S',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});

let total = 0;
for await (const page of client.queryInvoices({ year, period })) {
  for (const record of page.records) {
    console.log(record.invoiceId.seriesNumber, '→', record.state, '@', record.lastModifiedAt);
    total++;
  }
}

console.log(`Done — ${total} records.`);
