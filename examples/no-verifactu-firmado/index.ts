/**
 * Example: submit a record under an AEAT requirement (on-request mode).
 *
 * Each record is signed XAdES-BES enveloped before transmission.
 *
 * @module
 */

import { readFileSync } from 'node:fs';
import { VerifactuClient } from '../../src/index.ts';

const certificatePath = process.env.VERIFACTU_CERT_PATH ?? './cert.pfx';
const passphrase = process.env.CERT_PASS ?? '';
const taxpayerNif = process.env.VERIFACTU_NIF ?? 'B12345678';
const requirementReference = process.env.REQUIREMENT_REF ?? 'REQ-2026-000123';

const client = new VerifactuClient({
  environment: 'preproduction',
  mode: 'onRequest',
  certificate: { pfx: readFileSync(certificatePath), passphrase },
  taxpayer: { nif: taxpayerNif, legalName: 'My Company SL' },
  onRequestHeader: { requirementReference },
  billingSystem: {
    producerName: 'My Company SL',
    nif: taxpayerNif,
    systemId: 'JC',
    systemName: 'On-request example',
    version: '1.0.0',
    installationNumber: '0001',
    onlyVerifactu: 'N',
    multipleTaxpayer: 'N',
    hasMultipleTaxpayers: 'N',
  },
});

const response = await client.registerInvoice({
  invoiceId: {
    issuerNif: taxpayerNif,
    seriesNumber: `OR/${Date.now()}`,
    issueDate: '2025-10-15',
  },
  invoiceType: 'F1',
  issuerName: 'My Company SL',
  description: 'Past invoice — provided under AEAT requirement',
  recipients: [{ nif: '12345678Z', legalName: 'Customer SL' }],
  breakdown: [
    {
      tax: '01',
      regimeKey: '01',
      operationQualification: 'S1',
      taxRate: '21',
      taxBase: '200.00',
      taxAmount: '42.00',
    },
  ],
  totalTaxAmount: '42.00',
  totalAmount: '242.00',
});

console.log(JSON.stringify(response, null, 2));
