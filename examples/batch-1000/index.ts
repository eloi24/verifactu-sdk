/**
 * Example: submit a batch of 1 000 invoices in one shot.
 *
 * Demonstrates how the SDK chunks a batch and honours the AEAT-reported
 * `TiempoEsperaEnvio` between chunks.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { type Invoice, VerifactuClient } from '../../src/index.ts';

const certificatePath = process.env.VERIFACTU_CERT_PATH ?? './cert.pfx';
const passphrase = process.env.CERT_PASS ?? '';
const taxpayerNif = process.env.VERIFACTU_NIF ?? 'B12345678';

const billingSystem = {
  producerName: 'My Company SL',
  nif: taxpayerNif,
  systemId: 'JC',
  systemName: 'Batch 1000 example',
  version: '1.0.0',
  installationNumber: '0001',
  onlyVerifactu: 'S' as const,
  multipleTaxpayer: 'N' as const,
  hasMultipleTaxpayers: 'N' as const,
};

const client = new VerifactuClient({
  environment: 'preproduction',
  mode: 'verifactu',
  certificate: { pfx: readFileSync(certificatePath), passphrase },
  taxpayer: { nif: taxpayerNif, legalName: 'My Company SL' },
  billingSystem,
});

const today = new Date().toISOString().slice(0, 10);
const baseSeries = `BATCH/${Date.now()}`;

const invoices: Invoice[] = Array.from({ length: 1000 }, (_, i) => ({
  invoiceId: {
    issuerNif: taxpayerNif,
    seriesNumber: `${baseSeries}/${String(i).padStart(4, '0')}`,
    issueDate: today,
  },
  invoiceType: 'F1',
  issuerName: 'My Company SL',
  description: `Service line #${i}`,
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
  billingSystem,
  chainLink: { first: i === 0 },
  hash: '',
}));

const responses = await client.registerInvoiceBatch(invoices);

for (const [idx, response] of responses.entries()) {
  console.log(
    `Chunk ${idx}: ${response.envelopeState} — ${response.records.length} records, wait ${response.waitSeconds}s`,
  );
}
