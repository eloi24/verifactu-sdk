/**
 * Fixture builders for validator tests.
 *
 * The base invoice is identical to `test/unit/schemas/fixtures.ts`; we keep a
 * private copy so the validator suite is independent of the schemas one and
 * can mutate freely.
 */

import type { CancelInvoiceInput, Invoice } from '../../../src/types.ts';

const HUELLA = 'A'.repeat(64);

/** Reference date used by the validator suite to avoid Date.now coupling. */
export const REFERENCE_DATE = new Date('2026-05-20T00:00:00Z');

/**
 * Minimal valid invoice that passes every §3.1.3 rule. Tests mutate one field
 * to trigger a specific rule.
 */
export function buildValidInvoice(): Invoice {
  return {
    invoiceId: {
      issuerNif: 'B12345674',
      seriesNumber: 'A/2026/0001',
      issueDate: '2026-05-20',
    },
    issuerName: 'Acme Software SL',
    invoiceType: 'F1',
    description: 'Consulting services for Customer SL',
    recipients: [{ legalName: 'Customer SL', nif: '00000000T' }],
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
    billingSystem: {
      producerName: 'Acme Software SL',
      nif: 'B12345674',
      systemName: 'Acme Verifactu SDK',
      systemId: 'AC',
      version: '0.1.0',
      installationNumber: '0001',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
      hasMultipleTaxpayers: 'N',
    },
    generatedAt: '2026-05-20T12:34:56+02:00',
    chainLink: { first: true },
    hash: HUELLA,
  };
}

/** Minimal valid cancellation. */
export function buildValidCancel(): CancelInvoiceInput {
  return {
    cancelledInvoiceId: {
      issuerNif: 'B12345674',
      seriesNumber: 'A/2026/0001',
      issueDate: '2026-05-20',
    },
    chainLink: { first: true },
    billingSystem: {
      producerName: 'Acme Software SL',
      nif: 'B12345674',
      systemName: 'Acme Verifactu SDK',
      systemId: 'AC',
      version: '0.1.0',
      installationNumber: '0001',
      onlyVerifactu: 'S',
      multipleTaxpayer: 'N',
      hasMultipleTaxpayers: 'N',
    },
    generatedAt: '2026-05-20T12:35:00+02:00',
    hash: HUELLA,
  };
}
