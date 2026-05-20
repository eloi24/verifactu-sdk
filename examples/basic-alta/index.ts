/**
 * Example: register one invoice against AEAT pre-production.
 *
 * Run with: `CERT_PASS=changeme bun run index.ts`
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { VerifactuClient } from '../../src/index.ts';

const certificatePath = process.env.VERIFACTU_CERT_PATH ?? './cert.pfx';
const passphrase = process.env.CERT_PASS ?? '';
const taxpayerNif = process.env.VERIFACTU_NIF ?? 'B12345678';

const client = new VerifactuClient({
  environment: 'preproduction',
  mode: 'verifactu',
  certificate: { pfx: readFileSync(certificatePath), passphrase },
  taxpayer: { nif: taxpayerNif, legalName: 'My Company SL' },
  billingSystem: {
    producerName: 'My Company SL',
    nif: taxpayerNif,
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
    issuerNif: taxpayerNif,
    seriesNumber: `EX-BASIC/${Date.now()}`,
    issueDate: new Date().toISOString().slice(0, 10),
  },
  invoiceType: 'F1',
  issuerName: 'My Company SL',
  description: 'Consulting services',
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

console.log(JSON.stringify(response, null, 2));
